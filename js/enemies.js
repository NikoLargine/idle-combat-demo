import { CONFIG } from './config.js';

function clampPercent(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
}

export function scaleEnemyToPlayer(enemy, playerLevel = 1) {
    if (!enemy || typeof enemy !== 'object') return null;

    const baseLevel = Math.max(1, Math.floor(enemy.levelRequirement || enemy.level || 1));
    const safePlayerLevel = Math.max(1, Math.floor(playerLevel || 1));
    const levelDelta = Math.max(0, safePlayerLevel - baseLevel);
    const scaleFactor = 1 + Math.min(0.45, levelDelta * 0.03);

    const base = enemy.baseStats || {};
    const hp = Math.max(1, Math.floor((base.hp || enemy.hp || 25) * scaleFactor));
    const baseDamage = Math.max(1, Number.isFinite(base.damage) ? base.damage : Math.ceil(((enemy.minHit || 1) + (enemy.maxHit || 2)) / 2));

    const minHit = Math.max(1, Math.floor(baseDamage * 0.85 * scaleFactor));
    const maxHit = Math.max(minHit + 1, Math.ceil(baseDamage * 1.2 * scaleFactor));

    return {
        ...enemy,
        level: baseLevel + Math.floor(levelDelta * 0.35),
        hp,
        minHit,
        maxHit,
        critChance: clampPercent(base.critChance ?? enemy.critChance ?? 5),
        evasion: clampPercent(base.evasion ?? enemy.evasion ?? 0),
        accuracy: clampPercent(enemy.accuracy ?? 40 + (baseLevel * 2)),
        attackInterval: Math.max(700, Math.floor(enemy.attackInterval || 2200)),
        goldDropRange: enemy.goldDropRange || { min: 5, max: 10 },
        possibleStatusEffects: Array.isArray(enemy.possibleStatusEffects) ? enemy.possibleStatusEffects : []
    };
}

export function getScaledEnemy(enemyId, playerLevel = 1) {
    const template = CONFIG.ENEMIES[enemyId];
    if (!template) return null;
    return scaleEnemyToPlayer(template, playerLevel);
}
