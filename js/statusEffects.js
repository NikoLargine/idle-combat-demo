import { GameState } from './state.js';
import { CONFIG } from './config.js';

// Central effect registry. Add new effects here; runtime instances are data-only objects
// stored on `target.activeEffects`.
const EFFECT_DEFINITIONS = {
    battle_focus: {
        id: 'battle_focus',
        name: 'Battle Focus',
        type: 'buff',
        duration: 6,
        tickInterval: 0,
        icon: 'FOC',
        description: 'Accuracy +20, Evasion +10, Attack Speed +15%.',
        modifyStats({ stats }) {
            return {
                ...stats,
                accuracy: Math.max(0, (stats.accuracy || 0) + 20),
                evasion: Math.max(0, (stats.evasion || 0) + 10),
                attackInterval: Math.max(250, Math.floor((stats.attackInterval || 1000) * 0.85))
            };
        }
    },
    poison: {
        id: 'poison',
        name: 'Poison',
        type: 'debuff',
        duration: 6,
        tickInterval: 1,
        icon: 'PSN',
        description: 'Lose 2 HP per second.',
        applyEffect({ target, instance }) {
            const intensity = Number.isFinite(instance.intensity) ? Math.max(0.1, instance.intensity) : 1;
            const damage = Math.max(1, Math.floor(2 * intensity));
            const before = Math.max(0, Number.isFinite(target.currentHp) ? target.currentHp : 0);
            target.currentHp = Math.max(0, before - damage);
            return {
                type: 'damage',
                amount: Math.max(0, Math.floor(before - target.currentHp))
            };
        }
    },
    bleed: {
        id: 'bleed',
        name: 'Bleed',
        type: 'debuff',
        duration: 5,
        tickInterval: 1,
        icon: 'BLD',
        description: 'Lose 3 HP per second.',
        applyEffect({ target, instance }) {
            const intensity = Number.isFinite(instance.intensity) ? Math.max(0.1, instance.intensity) : 1;
            const damage = Math.max(1, Math.floor(3 * intensity));
            const before = Math.max(0, Number.isFinite(target.currentHp) ? target.currentHp : 0);
            target.currentHp = Math.max(0, before - damage);
            return {
                type: 'damage',
                amount: Math.max(0, Math.floor(before - target.currentHp))
            };
        }
    },
    retaliation_guard: {
        id: 'retaliation_guard',
        name: 'Retaliation Guard',
        type: 'buff',
        duration: 3,
        tickInterval: 0,
        icon: 'SHD',
        description: '+15% damage reduction.',
        modifyStats({ stats }) {
            return {
                ...stats,
                damageReduction: Math.max(0, (stats.damageReduction || 0) + 15)
            };
        }
    },
    exposed: {
        id: 'exposed',
        name: 'Exposed',
        type: 'debuff',
        duration: 4,
        tickInterval: 0,
        icon: 'EXP',
        description: '-8 Accuracy, -12 Evasion.',
        modifyStats({ stats }) {
            return {
                ...stats,
                accuracy: Math.max(0, (stats.accuracy || 0) - 8),
                evasion: Math.max(0, (stats.evasion || 0) - 12)
            };
        }
    }
};

let effectAppliedListener = null;
let effectExpiredListener = null;

function toSafeSeconds(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, value);
}

function toSafeDuration(value, fallback = 0) {
    if (!Number.isFinite(value)) return Math.max(0, fallback);
    return Math.max(0, value);
}

function resolveTargetType(target, fallbackType = null) {
    if (fallbackType === 'player' || fallbackType === 'enemy') return fallbackType;
    if (target === GameState.player) return 'player';
    if (target === GameState.enemy) return 'enemy';
    return null;
}

function getTargetByType(targetType) {
    if (targetType === 'player') return GameState.player;
    if (targetType === 'enemy') return GameState.enemy;
    return null;
}

function getEquippedItemBySlot(slot) {
    const stateKeyBySlot = {
        weapon: 'weaponId',
        armor: 'armorId',
        charm: 'charmId'
    };
    const stateKey = stateKeyBySlot[slot];
    if (!stateKey) return null;
    const itemId = GameState.equipment?.[stateKey];
    if (!itemId) return null;

    const itemPoolBySlot = {
        weapon: CONFIG.EQUIPMENT.weapons,
        armor: CONFIG.EQUIPMENT.armor,
        charm: CONFIG.EQUIPMENT.charms
    };
    return (itemPoolBySlot[slot] || []).find(item => item.id === itemId) || null;
}

function getOnHitEffectsFromAttacker(attackerType) {
    if (attackerType === 'enemy') {
        const enemyConfig = CONFIG.ENEMIES[GameState.enemy.id];
        if (!enemyConfig || !Array.isArray(enemyConfig.onHitEffects)) return [];
        return enemyConfig.onHitEffects.map(effect => ({
            ...effect,
            source: `enemy:${GameState.enemy.id}`
        }));
    }

    if (attackerType === 'player') {
        const equippedItems = [
            getEquippedItemBySlot('weapon'),
            getEquippedItemBySlot('armor'),
            getEquippedItemBySlot('charm')
        ].filter(Boolean);

        return equippedItems.flatMap(item => {
            if (!Array.isArray(item.onHitEffects)) return [];
            return item.onHitEffects.map(effect => ({
                ...effect,
                source: `item:${item.id}`
            }));
        });
    }

    return [];
}

function buildEffectInstance(effectId, overrides = {}) {
    const definition = getEffectDefinition(effectId);
    if (!definition) return null;

    const duration = toSafeDuration(overrides.duration, definition.duration || 0);
    const tickInterval = toSafeDuration(
        overrides.tickInterval,
        Number.isFinite(definition.tickInterval) ? definition.tickInterval : 0
    );

    return {
        id: definition.id,
        name: definition.name,
        type: definition.type,
        duration,
        remaining: duration,
        description: definition.description || '',
        icon: definition.icon || '',
        source: overrides.source || null,
        intensity: Number.isFinite(overrides.intensity) ? Math.max(0.1, overrides.intensity) : 1,
        tickInterval,
        tickAccumulator: 0
    };
}

function emitEffectApplied(target, effect, context = {}) {
    if (typeof effectAppliedListener !== 'function') return;
    effectAppliedListener({
        target,
        targetType: resolveTargetType(target, context.targetType),
        effect: { ...effect },
        refreshed: !!context.refreshed,
        source: context.source || effect.source || null,
        silent: !!context.silent
    });
}

function emitEffectExpired(target, effect, context = {}) {
    if (typeof effectExpiredListener !== 'function') return;
    effectExpiredListener({
        target,
        targetType: resolveTargetType(target, context.targetType),
        effect: { ...effect },
        reason: context.reason || 'expired',
        silent: !!context.silent
    });
}

export function getEffectDefinition(effectId) {
    if (!effectId) return null;
    return EFFECT_DEFINITIONS[effectId] || null;
}

export function ensureEffectState(target) {
    if (!target || typeof target !== 'object') return;
    if (!Array.isArray(target.activeEffects)) {
        target.activeEffects = [];
    }
}

export function normalizeStatusState() {
    ensureEffectState(GameState.player);
    ensureEffectState(GameState.enemy);

    if (!GameState.system || typeof GameState.system !== 'object') {
        GameState.system = { lastSaveTime: Date.now() };
    }
    if (!GameState.system.unlockedPermanentEffects || typeof GameState.system.unlockedPermanentEffects !== 'object' || Array.isArray(GameState.system.unlockedPermanentEffects)) {
        GameState.system.unlockedPermanentEffects = {};
    }
}

export function clearTemporaryEffects(target) {
    ensureEffectState(target);
    if (!target?.activeEffects) return;
    target.activeEffects = [];
}

export function clearAllTemporaryEffects() {
    clearTemporaryEffects(GameState.player);
    clearTemporaryEffects(GameState.enemy);
}

export function getActiveEffects(target) {
    ensureEffectState(target);
    return target?.activeEffects || [];
}

export function getRenderableEffects(target) {
    return getActiveEffects(target).map(effect => {
        const safeDuration = Math.max(0.001, Number.isFinite(effect.duration) ? effect.duration : 0.001);
        const remaining = Math.max(0, Number.isFinite(effect.remaining) ? effect.remaining : 0);
        const progressPct = Math.max(0, Math.min(100, (remaining / safeDuration) * 100));
        return {
            ...effect,
            remaining,
            progressPct
        };
    });
}

export function hasStatusEffect(target, effectId) {
    if (!effectId) return false;
    return getActiveEffects(target).some(effect => effect.id === effectId && effect.remaining > 0);
}

export function applyStatusEffect(target, effect, options = {}) {
    const targetType = resolveTargetType(target, options.targetType);
    if (!target || !targetType) return null;

    const effectId = typeof effect === 'string' ? effect : effect?.id;
    if (!effectId) return null;

    const nextInstance = buildEffectInstance(effectId, typeof effect === 'object' ? effect : {});
    if (!nextInstance) return null;

    ensureEffectState(target);
    const definition = getEffectDefinition(effectId);
    const existing = target.activeEffects.find(entry => entry.id === effectId);

    if (existing) {
        existing.duration = Math.max(existing.duration, nextInstance.duration);
        existing.remaining = Math.max(existing.remaining, nextInstance.remaining);
        existing.intensity = Math.max(existing.intensity || 1, nextInstance.intensity || 1);
        existing.tickInterval = nextInstance.tickInterval;
        existing.source = nextInstance.source || existing.source;
        if (typeof definition?.onApply === 'function') {
            definition.onApply({
                target,
                targetType,
                instance: existing,
                refreshed: true,
                context: options.context || {}
            });
        }
        emitEffectApplied(target, existing, {
            targetType,
            refreshed: true,
            source: existing.source,
            silent: options.silent
        });
        return existing;
    }

    target.activeEffects.push(nextInstance);
    if (typeof definition?.onApply === 'function') {
        definition.onApply({
            target,
            targetType,
            instance: nextInstance,
            refreshed: false,
            context: options.context || {}
        });
    }
    emitEffectApplied(target, nextInstance, {
        targetType,
        source: nextInstance.source,
        silent: options.silent
    });

    return nextInstance;
}

export function removeStatusEffect(target, effectId, options = {}) {
    const targetType = resolveTargetType(target, options.targetType);
    if (!target || !targetType || !effectId) return 0;

    ensureEffectState(target);
    let removedCount = 0;

    for (let i = target.activeEffects.length - 1; i >= 0; i--) {
        if (target.activeEffects[i].id !== effectId) continue;
        const [removed] = target.activeEffects.splice(i, 1);
        const definition = getEffectDefinition(removed.id);
        if (typeof definition?.onExpire === 'function') {
            definition.onExpire({
                target,
                targetType,
                instance: removed,
                reason: options.reason || 'removed',
                context: options.context || {}
            });
        }
        removedCount += 1;
        emitEffectExpired(target, removed, {
            targetType,
            reason: options.reason || 'removed',
            silent: options.silent
        });
    }

    return removedCount;
}

export function updateEffects(deltaTime, options = {}) {
    const seconds = toSafeSeconds(deltaTime);
    const events = [];
    if (seconds <= 0) return { events };

    const targets = [
        { targetType: 'player', target: GameState.player },
        { targetType: 'enemy', target: GameState.enemy }
    ];

    targets.forEach(({ targetType, target }) => {
        ensureEffectState(target);

        for (let i = target.activeEffects.length - 1; i >= 0; i--) {
            const instance = target.activeEffects[i];
            const definition = getEffectDefinition(instance.id);
            if (!definition) {
                target.activeEffects.splice(i, 1);
                continue;
            }

            // Tick-based effects (damage/heal/etc.) are executed independently from stat modifiers.
            const tickInterval = toSafeDuration(instance.tickInterval, definition.tickInterval || 0);
            if (tickInterval > 0 && typeof definition.applyEffect === 'function') {
                instance.tickAccumulator = toSafeSeconds(instance.tickAccumulator) + seconds;
                while (instance.tickAccumulator >= tickInterval) {
                    const tickResult = definition.applyEffect({
                        target,
                        targetType,
                        instance,
                        deltaTime: tickInterval,
                        context: options.context || {}
                    }) || null;
                    if (tickResult && typeof tickResult === 'object') {
                        events.push({
                            targetType,
                            effectId: instance.id,
                            effectName: instance.name,
                            ...tickResult
                        });
                    }
                    instance.tickAccumulator -= tickInterval;
                }
            }

            instance.remaining = Math.max(0, toSafeSeconds(instance.remaining) - seconds);
            if (instance.remaining > 0) continue;

            const [expired] = target.activeEffects.splice(i, 1);
            if (typeof definition?.onExpire === 'function') {
                definition.onExpire({
                    target,
                    targetType,
                    instance: expired,
                    reason: 'expired',
                    context: options.context || {}
                });
            }
            emitEffectExpired(target, expired, {
                targetType,
                reason: 'expired',
                silent: options.silent
            });
        }
    });

    return { events };
}

export function applyStatEffectModifiers({ target, targetType, stats, context = {} }) {
    if (!stats || typeof stats !== 'object') return stats;
    const resolvedTarget = target || getTargetByType(targetType);
    const resolvedTargetType = resolveTargetType(resolvedTarget, targetType);
    if (!resolvedTarget || !resolvedTargetType) return { ...stats };

    ensureEffectState(resolvedTarget);
    return resolvedTarget.activeEffects.reduce((currentStats, instance) => {
        const definition = getEffectDefinition(instance.id);
        if (!definition || typeof definition.modifyStats !== 'function') return currentStats;
        const modified = definition.modifyStats({
            target: resolvedTarget,
            targetType: resolvedTargetType,
            stats: currentStats,
            instance,
            context
        });
        if (!modified || typeof modified !== 'object') return currentStats;
        return {
            ...currentStats,
            ...modified
        };
    }, { ...stats });
}

export function applyOnHitEffects({ attackerType, defenderType, silent = false } = {}) {
    const defender = getTargetByType(defenderType);
    if (!defender) return [];

    const sourceEffects = getOnHitEffectsFromAttacker(attackerType);
    if (!sourceEffects.length) return [];

    const applied = [];
    sourceEffects.forEach(effectConfig => {
        const effectId = effectConfig?.effectId || effectConfig?.id;
        if (!effectId) return;

        const chance = Number.isFinite(effectConfig.chance) ? Math.max(0, Math.min(1, effectConfig.chance)) : 1;
        if (Math.random() > chance) return;

        const instance = applyStatusEffect(defender, {
            id: effectId,
            duration: effectConfig.duration,
            intensity: effectConfig.intensity,
            source: effectConfig.source || `${attackerType}:on_hit`
        }, {
            targetType: defenderType,
            silent
        });

        if (instance) {
            applied.push(instance);
        }
    });

    return applied;
}

export function unlockPermanentEffect(effectId) {
    if (!effectId) return false;
    normalizeStatusState();
    if (GameState.system.unlockedPermanentEffects[effectId]) return false;
    GameState.system.unlockedPermanentEffects[effectId] = true;
    return true;
}

export function isPermanentEffectUnlocked(effectId) {
    if (!effectId) return false;
    normalizeStatusState();
    return !!GameState.system.unlockedPermanentEffects[effectId];
}

export function onEffectApplied(target, effect) {
    emitEffectApplied(target, effect);
}

export function onEffectExpired(target, effect) {
    emitEffectExpired(target, effect);
}

export function setEffectAppliedListener(listener) {
    effectAppliedListener = typeof listener === 'function' ? listener : null;
}

export function setEffectExpiredListener(listener) {
    effectExpiredListener = typeof listener === 'function' ? listener : null;
}
