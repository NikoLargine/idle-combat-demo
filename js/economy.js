import { CONFIG } from './config.js';
import { GameState } from './state.js';
import * as Achievements from './achievements.js';

export function normalizePlayerEconomy(player) {
    if (!player || typeof player !== 'object') return;

    if (!Number.isFinite(player.gold) || player.gold < 0) {
        player.gold = 0;
    } else {
        player.gold = Math.floor(player.gold);
    }
}

export function onGoldGained(amount) {
    Achievements.onGoldGained?.(amount);
}

export function onGoldSpent(amount) {
    void amount;
}

export function addGold(amount) {
    normalizePlayerEconomy(GameState.player);

    const goldAmount = Number.isFinite(amount) ? Math.floor(amount) : 0;
    if (goldAmount <= 0) return GameState.player.gold;

    GameState.player.gold += goldAmount;
    onGoldGained(goldAmount);
    return GameState.player.gold;
}

export function spendGold(amount) {
    normalizePlayerEconomy(GameState.player);

    const goldAmount = Number.isFinite(amount) ? Math.floor(amount) : 0;
    if (goldAmount <= 0) return false;
    if (GameState.player.gold < goldAmount) return false;

    GameState.player.gold -= goldAmount;
    onGoldSpent(goldAmount);
    return true;
}

export function getEnemyDefeatGold(enemyId) {
    const enemy = CONFIG.ENEMIES[enemyId];
    if (!enemy) return 0;

    const enemyLevel = Number.isFinite(enemy.level) ? Math.max(1, Math.floor(enemy.level)) : 1;
    return Math.floor(enemyLevel * CONFIG.ECONOMY.GOLD_PER_ENEMY_LEVEL);
}

export function addGoldFromEnemyDefeat(enemyId) {
    const goldGained = getEnemyDefeatGold(enemyId);
    if (goldGained <= 0) return 0;

    addGold(goldGained);
    return goldGained;
}

/*
Example integration at enemy defeat:
const goldGained = Math.floor(enemy.level * 5);
addGold(goldGained);
*/
