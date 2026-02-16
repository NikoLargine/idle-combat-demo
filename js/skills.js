import { GameState } from './state.js';
import { CONFIG } from './config.js';

const SKILL_DEFINITIONS = [
    {
        id: 'power_strike',
        name: 'Power Strike',
        type: 'active',
        cooldown: 8,
        currentCooldown: 0,
        description: 'Empower your next attack: +75% damage and +5 flat damage.',
        effect(player, enemy, context) {
            void player;
            void enemy;
            context.runtime.pendingPowerStrike = {
                multiplier: 1.75,
                flatBonus: 5
            };
            return { buffApplied: true };
        }
    },
    {
        id: 'battle_focus',
        name: 'Battle Focus',
        type: 'active',
        cooldown: 12,
        currentCooldown: 0,
        description: 'Gain +20 accuracy and +10 evasion for 6 seconds.',
        effect(player, enemy, context) {
            void player;
            void enemy;
            context.runtime.focusSecondsRemaining = 6;
            return { buffApplied: true };
        }
    },
    {
        id: 'second_wind',
        name: 'Second Wind',
        type: 'active',
        cooldown: 15,
        currentCooldown: 0,
        description: 'Instantly heal 25% of max HP.',
        effect(player, enemy, context) {
            void enemy;
            void context;
            const maxHp = GameState.getPlayerStats().hp;
            const healAmount = Math.max(1, Math.floor(maxHp * 0.25));
            const before = Math.max(0, Number.isFinite(player.currentHp) ? player.currentHp : 0);
            const after = Math.min(maxHp, before + healAmount);
            player.currentHp = after;
            return { healed: Math.max(0, Math.floor(after - before)) };
        }
    },
    {
        id: 'critical_mastery',
        name: 'Critical Mastery',
        type: 'passive',
        cooldown: 0,
        currentCooldown: 0,
        description: '20% chance to deal 150% damage.',
        effect(context) {
            if (Math.random() >= 0.2) {
                return { triggered: false, damage: context.damage };
            }
            const nextDamage = Math.max(1, Math.floor(context.damage * 1.5));
            return { triggered: true, damage: nextDamage };
        }
    },
    {
        id: 'vampiric_strikes',
        name: 'Vampiric Strikes',
        type: 'passive',
        cooldown: 0,
        currentCooldown: 0,
        description: 'Heal for 12% of damage dealt.',
        effect(context) {
            const healAmount = Math.max(0, Math.floor(context.damageDealt * 0.12));
            if (healAmount <= 0) return { triggered: false, healAmount: 0 };

            const maxHp = GameState.getPlayerStats().hp;
            const before = Math.max(0, Number.isFinite(GameState.player.currentHp) ? GameState.player.currentHp : 0);
            const after = Math.min(maxHp, before + healAmount);
            GameState.player.currentHp = after;

            return {
                triggered: after > before,
                healAmount: Math.max(0, Math.floor(after - before))
            };
        }
    },
    {
        id: 'evasive_instinct',
        name: 'Evasive Instinct',
        type: 'passive',
        cooldown: 0,
        currentCooldown: 0,
        description: 'Gain +12 evasion at all times.',
        effect(context) {
            const next = { ...context.defenderStats };
            next.evasion = Math.max(0, (next.evasion || 0) + 12);
            return next;
        }
    },
    {
        id: 'counter_strike',
        name: 'Counter Strike',
        type: 'passive',
        cooldown: 0,
        currentCooldown: 0,
        description: '18% chance to counter for 45% of incoming damage.',
        effect(context) {
            if (Math.random() >= 0.18) {
                return { triggered: false, counterDamage: 0 };
            }
            const counterDamage = Math.max(1, Math.floor(context.damageDealt * 0.45));
            return { triggered: true, counterDamage };
        }
    }
];

const DEFAULT_LEARNED_SKILLS = new Set(SKILL_DEFINITIONS.map(skill => skill.id));
const SKILL_BY_ID = Object.fromEntries(SKILL_DEFINITIONS.map(skill => [skill.id, skill]));

const runtimeState = {
    cooldowns: {},
    pendingPowerStrike: null,
    focusSecondsRemaining: 0
};

let skillUsedListener = null;
let passiveEffectListener = null;

function getSafeSeconds(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, value);
}

function getCurrentCooldown(skillId) {
    const raw = runtimeState.cooldowns[skillId];
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return raw;
}

function resolveTargetEnemy(target) {
    if (target && typeof target === 'object' && !Array.isArray(target)) {
        return target;
    }
    if (typeof target === 'string' && CONFIG.ENEMIES[target]) {
        return CONFIG.ENEMIES[target];
    }
    return CONFIG.ENEMIES[GameState.enemy.id] || null;
}

export function normalizePlayerSkills(player) {
    if (!player || typeof player !== 'object') return;

    if (!player.skills || typeof player.skills !== 'object' || Array.isArray(player.skills)) {
        player.skills = { learned: {} };
    }
    if (!player.skills.learned || typeof player.skills.learned !== 'object' || Array.isArray(player.skills.learned)) {
        player.skills.learned = {};
    }

    Object.keys(SKILL_BY_ID).forEach(skillId => {
        if (typeof player.skills.learned[skillId] === 'boolean') return;
        player.skills.learned[skillId] = DEFAULT_LEARNED_SKILLS.has(skillId);
    });
}

export function resetSkillRuntimeState() {
    runtimeState.cooldowns = {};
    runtimeState.pendingPowerStrike = null;
    runtimeState.focusSecondsRemaining = 0;
}

export function isSkillLearned(skillId) {
    normalizePlayerSkills(GameState.player);
    return !!GameState.player.skills.learned[skillId];
}

export function learnSkill(skillId) {
    normalizePlayerSkills(GameState.player);
    if (!SKILL_BY_ID[skillId]) return false;
    if (GameState.player.skills.learned[skillId]) return false;

    GameState.player.skills.learned[skillId] = true;
    return true;
}

export function getSkillDefinition(skillId) {
    return SKILL_BY_ID[skillId] || null;
}

export function getSkillState(skillId) {
    const skill = getSkillDefinition(skillId);
    if (!skill) return null;

    const learned = isSkillLearned(skillId);
    const currentCooldown = getCurrentCooldown(skillId);
    const available = skill.type === 'passive'
        ? learned
        : learned && currentCooldown <= 0;

    return {
        id: skill.id,
        name: skill.name,
        type: skill.type,
        description: skill.description,
        cooldown: skill.cooldown,
        currentCooldown,
        available,
        learned
    };
}

export function getSkillStatesForUI() {
    normalizePlayerSkills(GameState.player);
    return SKILL_DEFINITIONS.map(skill => getSkillState(skill.id));
}

export function onSkillUsed(skill, target) {
    if (typeof skillUsedListener === 'function') {
        skillUsedListener(skill, target);
    }
}

export function onPassiveEffectTriggered(skill, effect) {
    if (typeof passiveEffectListener === 'function') {
        passiveEffectListener(skill, effect);
    }
}

export function setSkillUsedListener(listener) {
    skillUsedListener = typeof listener === 'function' ? listener : null;
}

export function setPassiveEffectTriggeredListener(listener) {
    passiveEffectListener = typeof listener === 'function' ? listener : null;
}

export function isSkillAvailable(skillId) {
    const state = getSkillState(skillId);
    return !!(state && state.available);
}

export function useSkill(skillId, target, options = {}) {
    normalizePlayerSkills(GameState.player);

    const skill = getSkillDefinition(skillId);
    if (!skill || skill.type !== 'active') return null;
    if (!isSkillLearned(skillId)) return null;
    if (getCurrentCooldown(skillId) > 0) return null;

    const targetEnemy = resolveTargetEnemy(target);
    const effectResult = skill.effect(GameState.player, targetEnemy, {
        runtime: runtimeState,
        config: CONFIG
    }) || {};

    runtimeState.cooldowns[skillId] = Math.max(0, skill.cooldown || 0);
    const currentState = getSkillState(skillId);
    if (!options.silent) {
        onSkillUsed(currentState, targetEnemy);
    }
    return { skill: currentState, effect: effectResult };
}

export function reduceCooldowns(deltaTime) {
    const seconds = getSafeSeconds(deltaTime);
    if (seconds <= 0) return;

    SKILL_DEFINITIONS.forEach(skill => {
        if (skill.type !== 'active') return;
        const next = Math.max(0, getCurrentCooldown(skill.id) - seconds);
        runtimeState.cooldowns[skill.id] = next;
    });

    runtimeState.focusSecondsRemaining = Math.max(0, runtimeState.focusSecondsRemaining - seconds);
}

export function applyPassiveStatModifiers({ attackerType, defenderType, attackerStats, defenderStats }) {
    const nextAttacker = { ...attackerStats };
    const nextDefender = { ...defenderStats };

    if (attackerType === 'player' && runtimeState.focusSecondsRemaining > 0) {
        nextAttacker.accuracy = Math.max(0, (nextAttacker.accuracy || 0) + 20);
    }

    if (defenderType === 'player' && runtimeState.focusSecondsRemaining > 0) {
        nextDefender.evasion = Math.max(0, (nextDefender.evasion || 0) + 10);
    }

    if (defenderType === 'player' && isSkillLearned('evasive_instinct')) {
        const skill = getSkillDefinition('evasive_instinct');
        const modifiedDefender = skill.effect({ defenderStats: nextDefender }) || nextDefender;
        nextDefender.evasion = modifiedDefender.evasion;
    }

    return {
        attackerStats: nextAttacker,
        defenderStats: nextDefender
    };
}

export function applyActiveDamageModifiers(attackerType, damage) {
    let nextDamage = Math.max(1, Math.floor(damage));
    if (attackerType !== 'player') return nextDamage;

    if (runtimeState.pendingPowerStrike) {
        const boost = runtimeState.pendingPowerStrike;
        nextDamage = Math.max(1, Math.floor((nextDamage * boost.multiplier) + boost.flatBonus));
        runtimeState.pendingPowerStrike = null;
    }

    return nextDamage;
}

export function applyPassiveDamageModifiers({ attackerType, defenderType, damage, silent = false }) {
    void defenderType;
    let nextDamage = Math.max(1, Math.floor(damage));

    if (attackerType === 'player' && isSkillLearned('critical_mastery')) {
        const critSkill = getSkillDefinition('critical_mastery');
        const critResult = critSkill.effect({ damage: nextDamage }) || { triggered: false, damage: nextDamage };
        nextDamage = Math.max(1, Math.floor(critResult.damage || nextDamage));

        if (critResult.triggered && !silent) {
            onPassiveEffectTriggered(getSkillState('critical_mastery'), {
                type: 'critical_hit',
                damage: nextDamage
            });
        }
    }

    return nextDamage;
}

export function applyPassivePostHit({ attackerType, defenderType, damageDealt, silent = false }) {
    const result = {
        counterDamage: 0
    };
    const safeDamage = Math.max(0, Math.floor(damageDealt));
    if (safeDamage <= 0) return result;

    if (attackerType === 'player' && isSkillLearned('vampiric_strikes')) {
        const lifeStealSkill = getSkillDefinition('vampiric_strikes');
        const lifeSteal = lifeStealSkill.effect({ damageDealt: safeDamage }) || { triggered: false, healAmount: 0 };
        if (lifeSteal.triggered && lifeSteal.healAmount > 0 && !silent) {
            onPassiveEffectTriggered(getSkillState('vampiric_strikes'), {
                type: 'lifesteal',
                healAmount: lifeSteal.healAmount
            });
        }
    }

    if (attackerType === 'enemy' && defenderType === 'player' && isSkillLearned('counter_strike')) {
        const counterSkill = getSkillDefinition('counter_strike');
        const counter = counterSkill.effect({ damageDealt: safeDamage }) || { triggered: false, counterDamage: 0 };
        result.counterDamage = Math.max(0, Math.floor(counter.counterDamage || 0));
        if (counter.triggered && result.counterDamage > 0 && !silent) {
            onPassiveEffectTriggered(getSkillState('counter_strike'), {
                type: 'counter_attack',
                counterDamage: result.counterDamage
            });
        }
    }

    return result;
}

export function tryAutoUseSkills(targetEnemyId, options = {}) {
    const results = [];
    const targetEnemy = resolveTargetEnemy(targetEnemyId);
    const maxHp = GameState.getPlayerStats().hp;
    const hpRatio = maxHp > 0 ? (GameState.player.currentHp / maxHp) : 0;

    if (isSkillAvailable('second_wind') && hpRatio <= 0.35) {
        const used = useSkill('second_wind', targetEnemy, options);
        if (used) results.push(used);
    }

    if (isSkillAvailable('battle_focus') && runtimeState.focusSecondsRemaining <= 0) {
        const used = useSkill('battle_focus', targetEnemy, options);
        if (used) results.push(used);
    }

    if (isSkillAvailable('power_strike')) {
        const used = useSkill('power_strike', targetEnemy, options);
        if (used) results.push(used);
    }

    return results;
}

/*
Example combat-loop integration:
const modified = applyPassiveStatModifiers({ attackerType: 'player', defenderType: 'enemy', attackerStats, defenderStats });
let damage = applyActiveDamageModifiers('player', rolledDamage);
damage = applyPassiveDamageModifiers({ attackerType: 'player', defenderType: 'enemy', damage });
*/
