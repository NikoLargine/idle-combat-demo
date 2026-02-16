import { CONFIG } from './config.js';
import { GameState } from './state.js';
import * as EnemyUnlocks from './enemyUnlocks.js';
import * as Achievements from './achievements.js';

const MIN_LEVEL = 1;

export function getXPRequired(level) {
    const safeLevel = Number.isFinite(level) ? Math.max(MIN_LEVEL, Math.floor(level)) : MIN_LEVEL;
    return Math.floor(CONFIG.LEVELING.XP_BASE * Math.pow(CONFIG.LEVELING.XP_GROWTH, safeLevel));
}

export function normalizePlayerProgression(player) {
    if (!player || typeof player !== 'object') return;

    if (!Number.isFinite(player.level) || player.level < MIN_LEVEL) {
        player.level = MIN_LEVEL;
    } else {
        player.level = Math.floor(player.level);
    }

    if (!Number.isFinite(player.xp) || player.xp < 0) {
        player.xp = 0;
    } else {
        player.xp = Math.floor(player.xp);
    }
}

export function onLevelUp(newLevel) {
    Achievements.onLevelUp?.(newLevel);
}

export function levelUp() {
    normalizePlayerProgression(GameState.player);
    GameState.player.level += 1;
    EnemyUnlocks.checkEnemyUnlocks?.();

    // Fully heal on level-up after stats scale from the new level.
    const leveledStats = GameState.getPlayerStats();
    GameState.player.currentHp = leveledStats.hp;

    onLevelUp(GameState.player.level);
}

export function addXP(amount) {
    normalizePlayerProgression(GameState.player);

    const xpAmount = Number.isFinite(amount) ? Math.floor(amount) : 0;
    if (xpAmount <= 0) return GameState.player.xp;

    GameState.player.xp += xpAmount;
    Achievements.onXPGained?.(xpAmount);

    // Process all level-ups so overflow XP is retained correctly.
    while (GameState.player.xp >= getXPRequired(GameState.player.level)) {
        const requiredXP = getXPRequired(GameState.player.level);
        GameState.player.xp -= requiredXP;
        levelUp();
    }

    return GameState.player.xp;
}

export function getEnemyDefeatXP(enemyId) {
    const enemy = CONFIG.ENEMIES[enemyId];
    if (!enemy) return 0;

    const enemyLevel = Number.isFinite(enemy.level) ? Math.max(MIN_LEVEL, Math.floor(enemy.level)) : MIN_LEVEL;
    return enemyLevel * 10;
}

export function addXPFromEnemyDefeat(enemyId) {
    const xpGained = getEnemyDefeatXP(enemyId);
    if (xpGained <= 0) return 0;

    addXP(xpGained);
    return xpGained;
}
