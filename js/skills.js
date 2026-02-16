import { GameState } from './state.js';
import { CONFIG } from './config.js';
import * as Economy from './economy.js';
import * as StatusEffects from './statusEffects.js';

const SKILL_DEFINITIONS = [
    {
        id: 'power_strike',
        name: 'Power Strike',
        type: 'active',
        cooldown: 8,
        currentCooldown: 0,
        description: 'Empower your next attack: +75% damage and +5 flat damage.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 1 },
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
        description: 'Gain Focus for 6s: +20 accuracy, +10 evasion, and faster attacks.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 3 },
        effect(player, enemy, context) {
            void player;
            void enemy;
            void context;
            const applied = StatusEffects.applyStatusEffect(GameState.player, {
                id: 'battle_focus',
                source: 'skill:battle_focus'
            });
            return { buffApplied: !!applied };
        }
    },
    {
        id: 'second_wind',
        name: 'Second Wind',
        type: 'active',
        cooldown: 15,
        currentCooldown: 0,
        description: 'Instantly heal 25% of max HP.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 4 },
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
        id: 'fire_strike',
        name: 'Fire Strike',
        type: 'active',
        cooldown: 5,
        currentCooldown: 0,
        description: 'Empower your next attack with fire: +35% damage and +10 flat damage.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 5 },
        effect(player, enemy, context) {
            void player;
            void enemy;
            context.runtime.pendingFireStrike = {
                multiplier: 1.35,
                flatBonus: 10
            };
            return { buffApplied: true };
        }
    },
    {
        id: 'poison_strike',
        name: 'Poison Strike',
        type: 'active',
        cooldown: 7,
        currentCooldown: 0,
        description: 'Apply Poison to the target for 6s (2 damage per second).',
        unlocked: false,
        unlockRequirement: { type: 'achievement', value: 'kill_50_enemies' },
        effect(player, enemy, context) {
            void player;
            void context;
            const target = GameState.enemy;
            if (!target) return { debuffApplied: false };
            const applied = StatusEffects.applyStatusEffect(target, {
                id: 'poison',
                source: 'skill:poison_strike'
            }, {
                targetType: 'enemy'
            });
            return { debuffApplied: !!applied };
        }
    },
    {
        id: 'critical_mastery',
        name: 'Critical Mastery',
        type: 'passive',
        cooldown: 0,
        currentCooldown: 0,
        description: '20% chance to deal 150% damage.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 2 },
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
        unlocked: false,
        unlockRequirement: { type: 'achievement', value: 'kill_10_enemies' },
        effect(context) {
            const bonus = isSkillLearned('bloodlust') ? 0.08 : 0;
            const healAmount = Math.max(0, Math.floor(context.damageDealt * (0.12 + bonus)));
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
        unlocked: false,
        unlockRequirement: { type: 'shop', value: 250 },
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
        unlocked: false,
        unlockRequirement: { type: 'achievement', value: 'reach_level_5' },
        effect(context) {
            if (Math.random() >= 0.18) {
                return { triggered: false, counterDamage: 0 };
            }
            const counterDamage = Math.max(1, Math.floor(context.damageDealt * 0.45));
            return { triggered: true, counterDamage };
        }
    },
    {
        id: 'precision',
        name: 'Precision',
        type: 'passive',
        cooldown: 0,
        currentCooldown: 0,
        unlockLevel: 6,
        description: 'Sharpen technique for +8 accuracy and better critical consistency.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 6 },
        effect(context) { return { ...context, bonusAccuracy: 8 }; }
    },
    {
        id: 'iron_will',
        name: 'Iron Will',
        type: 'passive',
        cooldown: 0,
        currentCooldown: 0,
        unlockLevel: 7,
        description: 'Increase max HP by 12%.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 7 },
        effect(context) { return context; }
    },
    {
        id: 'battle_trance',
        name: 'Battle Trance',
        type: 'active',
        cooldown: 16,
        currentCooldown: 0,
        unlockLevel: 8,
        description: 'Enter trance for your next strike: +50% damage.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 8 },
        effect(player, enemy, context) {
            void player; void enemy;
            context.runtime.pendingBattleTrance = { multiplier: 1.5 };
            return { buffApplied: true };
        }
    },
    {
        id: 'evasive_maneuvers',
        name: 'Evasive Maneuvers',
        type: 'passive',
        cooldown: 0,
        currentCooldown: 0,
        unlockLevel: 5,
        description: 'Gain +10 evasion.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 5 },
        effect(context) { return context; }
    },
    {
        id: 'bloodlust',
        name: 'Bloodlust',
        type: 'passive',
        cooldown: 0,
        currentCooldown: 0,
        unlockLevel: 9,
        description: 'Improve lifesteal efficiency by 8%.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 9 },
        effect(context) { return context; }
    },
    {
        id: 'executioner',
        name: 'Executioner',
        type: 'passive',
        cooldown: 0,
        currentCooldown: 0,
        unlockLevel: 10,
        description: 'Deal 20% bonus damage to enemies below 35% HP.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 10 },
        effect(context) { return context; }
    },
    {
        id: 'fortified_guard',
        name: 'Fortified Guard',
        type: 'passive',
        cooldown: 0,
        currentCooldown: 0,
        unlockLevel: 11,
        description: 'Gain +8% damage reduction.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 11 },
        effect(context) { return context; }
    },
    {
        id: 'arcane_edge',
        name: 'Arcane Edge',
        type: 'active',
        cooldown: 14,
        currentCooldown: 0,
        unlockLevel: 12,
        description: 'Infuse next strike with arcane force: +30% damage and apply Exposed.',
        unlocked: false,
        unlockRequirement: { type: 'level', value: 12 },
        effect(player, enemy, context) {
            void player; void enemy;
            context.runtime.pendingArcaneEdge = { multiplier: 1.3, expose: true };
            return { buffApplied: true };
        }
    }

];

const DEFAULT_LEARNED_SKILLS = new Set(
    SKILL_DEFINITIONS
        .filter(skill => skill.unlockRequirement?.type === 'level' && skill.unlockRequirement?.value <= 1)
        .map(skill => skill.id)
);
const SKILL_BY_ID = Object.fromEntries(SKILL_DEFINITIONS.map(skill => [skill.id, skill]));

const runtimeState = {
    cooldowns: {},
    pendingPowerStrike: null,
    pendingFireStrike: null,
    pendingBattleTrance: null,
    pendingArcaneEdge: null
};

let skillUsedListener = null;
let passiveEffectListener = null;
let skillUnlockedListener = null;

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

function getShopUnlockCost(skill) {
    if (!skill || skill.unlockRequirement?.type !== 'shop') return 0;
    return Math.max(0, Math.floor(skill.unlockRequirement?.value || 0));
}

function getUnlockRequirementText(requirement) {
    if (!requirement || typeof requirement !== 'object') return 'Locked';

    if (requirement.type === 'level') {
        return `Unlocks at Level ${Math.max(1, Math.floor(requirement.value || 1))}`;
    }

    if (requirement.type === 'achievement') {
        const achievement = CONFIG.ACHIEVEMENTS.find(item => item.id === requirement.value);
        return achievement ? `Unlock via achievement: ${achievement.name}` : 'Unlock via achievement';
    }

    if (requirement.type === 'shop') {
        return `Unlock in Shop: ${Math.max(0, Math.floor(requirement.value || 0))} Gold`;
    }

    return 'Locked';
}

function isAchievementUnlocked(achievementId) {
    if (!achievementId) return false;
    const entry = GameState.achievements?.[achievementId];
    return !!entry?.unlocked;
}

function isUnlockRequirementMet(skillId) {
    const skill = getSkillDefinition(skillId);
    if (!skill) return false;
    const requirement = skill.unlockRequirement;
    if (!requirement || typeof requirement !== 'object') return false;

    if (requirement.type === 'level') {
        const requiredLevel = Math.max(1, Math.floor(requirement.value || 1));
        const playerLevel = Math.max(1, Math.floor(GameState.player.level || 1));
        return playerLevel >= requiredLevel;
    }

    if (requirement.type === 'achievement') {
        return isAchievementUnlocked(requirement.value);
    }

    return false;
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
    runtimeState.pendingFireStrike = null;
    runtimeState.pendingBattleTrance = null;
    runtimeState.pendingArcaneEdge = null;
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
        learned,
        unlockLevel: skill.unlockLevel || skill.unlockRequirement?.value || 1,
        unlockRequirement: skill.unlockRequirement || null,
        unlockRequirementText: getUnlockRequirementText(skill.unlockRequirement),
        canPurchase: !learned && skill.unlockRequirement?.type === 'shop',
        purchaseCost: getShopUnlockCost(skill)
    };
}

export function checkSkillUnlocks(triggerType, triggerValue) {
    normalizePlayerSkills(GameState.player);
    const unlockedSkills = [];

    SKILL_DEFINITIONS.forEach(skill => {
        if (isSkillLearned(skill.id)) return;
        const requirementType = skill.unlockRequirement?.type;

        if (requirementType === 'shop') return;
        if (triggerType && requirementType !== triggerType) return;
        if (requirementType === 'achievement' && triggerValue && skill.unlockRequirement?.value !== triggerValue) return;

        if (!isUnlockRequirementMet(skill.id)) return;
        if (!learnSkill(skill.id)) return;

        const state = getSkillState(skill.id);
        unlockedSkills.push(state);
        onSkillUnlocked(state);
    });

    return unlockedSkills;
}

export function purchaseSkill(skillId) {
    normalizePlayerSkills(GameState.player);
    const skill = getSkillDefinition(skillId);
    if (!skill) return false;
    if (isSkillLearned(skillId)) return false;
    if (skill.unlockRequirement?.type !== 'shop') return false;

    const cost = getShopUnlockCost(skill);
    if (cost > 0 && !Economy.spendGold?.(cost)) return false;

    if (!learnSkill(skillId)) return false;
    onSkillUnlocked(getSkillState(skillId));
    return true;
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

export function onSkillUnlocked(skill) {
    if (typeof skillUnlockedListener === 'function') {
        skillUnlockedListener(skill);
    }
}

export function setSkillUsedListener(listener) {
    skillUsedListener = typeof listener === 'function' ? listener : null;
}

export function setPassiveEffectTriggeredListener(listener) {
    passiveEffectListener = typeof listener === 'function' ? listener : null;
}

export function setSkillUnlockedListener(listener) {
    skillUnlockedListener = typeof listener === 'function' ? listener : null;
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
}

export function applyPassiveStatModifiers({ attackerType, defenderType, attackerStats, defenderStats }) {
    const nextAttacker = { ...attackerStats };
    const nextDefender = { ...defenderStats };

    if (defenderType === 'player' && isSkillLearned('evasive_instinct')) {
        const skill = getSkillDefinition('evasive_instinct');
        const modifiedDefender = skill.effect({ defenderStats: nextDefender }) || nextDefender;
        nextDefender.evasion = modifiedDefender.evasion;
    }


    if (attackerType === 'player' && isSkillLearned('precision')) {
        nextAttacker.accuracy = Math.max(0, (nextAttacker.accuracy || 0) + 8);
    }

    if (defenderType === 'player' && isSkillLearned('evasive_maneuvers')) {
        nextDefender.evasion = Math.max(0, (nextDefender.evasion || 0) + 10);
    }

    if (defenderType === 'player' && isSkillLearned('fortified_guard')) {
        nextDefender.damageReduction = Math.max(0, (nextDefender.damageReduction || 0) + 8);
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

    if (runtimeState.pendingFireStrike) {
        const boost = runtimeState.pendingFireStrike;
        nextDamage = Math.max(1, Math.floor((nextDamage * boost.multiplier) + boost.flatBonus));
        runtimeState.pendingFireStrike = null;
    }

    if (runtimeState.pendingBattleTrance) {
        nextDamage = Math.max(1, Math.floor(nextDamage * runtimeState.pendingBattleTrance.multiplier));
        runtimeState.pendingBattleTrance = null;
    }

    if (runtimeState.pendingArcaneEdge) {
        nextDamage = Math.max(1, Math.floor(nextDamage * runtimeState.pendingArcaneEdge.multiplier));
    }

    return nextDamage;
}

export function applyPassiveDamageModifiers({ attackerType, defenderType, damage, silent = false }) {
    void defenderType;
    let nextDamage = Math.max(1, Math.floor(damage));

    if (attackerType === 'player' && isSkillLearned('executioner')) {
        const enemy = GameState.enemy;
        const enemyHp = Number(enemy?.currentHp || 0);
        const enemyMaxHp = Number((CONFIG.ENEMIES[enemy?.id]?.baseStats?.hp) || 1);
        if (enemyMaxHp > 0 && (enemyHp / enemyMaxHp) <= 0.35) nextDamage = Math.floor(nextDamage * 1.2);
    }

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

    if (attackerType === 'player' && runtimeState.pendingArcaneEdge?.expose) {
        StatusEffects.applyStatusEffect(GameState.enemy, { id: 'exposed', source: 'skill:arcane_edge' }, { targetType: 'enemy', silent });
        runtimeState.pendingArcaneEdge = null;
    }

    if (attackerType === 'enemy' && defenderType === 'player' && isSkillLearned('counter_strike')) {
        const counterSkill = getSkillDefinition('counter_strike');
        const counter = counterSkill.effect({ damageDealt: safeDamage }) || { triggered: false, counterDamage: 0 };
        result.counterDamage = Math.max(0, Math.floor(counter.counterDamage || 0));
        if (counter.triggered && result.counterDamage > 0) {
            StatusEffects.applyStatusEffect(GameState.player, {
                id: 'retaliation_guard',
                source: 'passive:counter_strike'
            }, {
                targetType: 'player',
                silent
            });

            if (!silent) {
                onPassiveEffectTriggered(getSkillState('counter_strike'), {
                    type: 'counter_attack',
                    counterDamage: result.counterDamage
                });
            }
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

    if (isSkillAvailable('battle_focus') && !StatusEffects.hasStatusEffect(GameState.player, 'battle_focus')) {
        const used = useSkill('battle_focus', targetEnemy, options);
        if (used) results.push(used);
    }

    if (isSkillAvailable('power_strike')) {
        const used = useSkill('power_strike', targetEnemy, options);
        if (used) results.push(used);
    }

    if (isSkillAvailable('fire_strike')) {
        const used = useSkill('fire_strike', targetEnemy, options);
        if (used) results.push(used);
    }

    if (isSkillAvailable('battle_trance')) {
        const used = useSkill('battle_trance', targetEnemy, options);
        if (used) results.push(used);
    }

    if (isSkillAvailable('arcane_edge')) {
        const used = useSkill('arcane_edge', targetEnemy, options);
        if (used) results.push(used);
    }

    if (isSkillAvailable('poison_strike')) {
        const used = useSkill('poison_strike', targetEnemy, options);
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
