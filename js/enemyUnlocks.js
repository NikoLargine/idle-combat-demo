import { CONFIG } from './config.js';
import { GameState } from './state.js';

let unlocksChangedCallback = null;

function getSafeRequirementValue(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.floor(value));
}

export function normalizeKillStats(player) {
    if (!player || typeof player !== 'object') return;
    if (!player.killStats || typeof player.killStats !== 'object' || Array.isArray(player.killStats)) {
        player.killStats = {};
    }
}

function getKillCountForTarget(targetEnemyId) {
    normalizeKillStats(GameState.player);

    const targetEnemy = CONFIG.ENEMIES[targetEnemyId];
    const byId = Number.isFinite(GameState.player.killStats[targetEnemyId]) ? GameState.player.killStats[targetEnemyId] : 0;
    const byName = targetEnemy && Number.isFinite(GameState.player.killStats[targetEnemy.name]) ? GameState.player.killStats[targetEnemy.name] : 0;
    return Math.max(byId, byName);
}

export function registerEnemyDefeat(enemyId) {
    const enemy = CONFIG.ENEMIES[enemyId];
    if (!enemy) return;

    normalizeKillStats(GameState.player);
    const nextById = getKillCountForTarget(enemyId) + 1;
    GameState.player.killStats[enemyId] = nextById;
    GameState.player.killStats[enemy.name] = nextById;
}

export function getEnemyUnlockText(enemyId, enemy) {
    const unlock = enemy.unlockRequirement;
    if (!unlock || typeof unlock !== 'object') return '';

    const value = getSafeRequirementValue(unlock.value);

    if (unlock.type === 'level') {
        return `Unlocks at Level ${value}`;
    }

    if (unlock.type === 'kills') {
        const targetEnemyId = unlock.enemyId || enemyId;
        const targetEnemy = CONFIG.ENEMIES[targetEnemyId];
        const targetName = targetEnemy ? targetEnemy.name : 'targets';
        return `Defeat ${value} ${targetName} to unlock`;
    }

    return 'Locked';
}

export function checkEnemyUnlocks() {
    normalizeKillStats(GameState.player);
    let changed = false;
    const newlyUnlockedIds = [];

    Object.entries(CONFIG.ENEMIES).forEach(([enemyId, enemy]) => {
        const unlock = enemy.unlockRequirement;
        let isUnlocked = true;

        if (unlock && typeof unlock === 'object') {
            const value = getSafeRequirementValue(unlock.value);

            if (unlock.type === 'level') {
                const playerLevel = Number.isFinite(GameState.player.level) ? GameState.player.level : 1;
                isUnlocked = playerLevel >= value;
            } else if (unlock.type === 'kills') {
                const targetEnemyId = unlock.enemyId || enemyId;
                isUnlocked = getKillCountForTarget(targetEnemyId) >= value;
            } else {
                isUnlocked = false;
            }
        }

        const nextUnlocked = !!isUnlocked;
        const prevUnlocked = !!enemy.isUnlocked;
        if (nextUnlocked !== prevUnlocked) {
            changed = true;
            if (!prevUnlocked && nextUnlocked) {
                newlyUnlockedIds.push(enemyId);
            }
        }
        enemy.isUnlocked = nextUnlocked;
    });

    if (changed && typeof unlocksChangedCallback === 'function') {
        unlocksChangedCallback(newlyUnlockedIds);
    }

    return changed;
}

export function getFirstUnlockedEnemyId() {
    const unlockedEntry = Object.entries(CONFIG.ENEMIES).find(([, enemy]) => enemy.isUnlocked);
    return unlockedEntry ? unlockedEntry[0] : 'training_dummy';
}

export function onEnemyUnlocksChanged(callback) {
    unlocksChangedCallback = typeof callback === 'function' ? callback : null;
}
