import { GameState } from './state.js';
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { UI } from './ui.js'; // to trigger UI updates and floating text

export const CombatEngine = {
    intervalId: null,

    start() {
        if (GameState.combat.isActive) return;
        GameState.combat.isActive = true;
        this.intervalId = setInterval(() => this.tick(), CONFIG.TICK_RATE_MS);
    },

    stop() {
        GameState.combat.isActive = false;
        clearInterval(this.intervalId);
    },

    tick(isOfflineSimulation = false) {
        const pStats = GameState.getPlayerStats();
        const eStats = CONFIG.ENEMIES[GameState.enemy.id];

        // Increment timers
        GameState.player.tickTimer += CONFIG.TICK_RATE_MS;
        GameState.enemy.tickTimer += CONFIG.TICK_RATE_MS;

        // Player Attack Check
        if (GameState.player.tickTimer >= pStats.attackInterval) {
            this.executeAttack('player', pStats, eStats, isOfflineSimulation);
            GameState.player.tickTimer = 0;
        }

        // Enemy Attack Check
        if (GameState.enemy.tickTimer >= eStats.attackInterval) {
            this.executeAttack('enemy', eStats, pStats, isOfflineSimulation);
            GameState.enemy.tickTimer = 0;
        }

        // Only render if we aren't rapidly simulating offline progress
        if (!isOfflineSimulation) {
            UI.updateAll();
        }
    },

    executeAttack(attackerType, attackerStats, defenderStats, isOffline) {
        const chance = Utils.calculateHitChance(attackerStats.accuracy, defenderStats.evasion);

        if (Utils.isHit(chance)) {
            const damage = Utils.calculateDamage(attackerStats.minHit, attackerStats.maxHit, defenderStats.damageReduction || 0);

            if (attackerType === 'player') {
                GameState.enemy.currentHp -= damage;
                if (!isOffline) UI.spawnFloatingText('enemy-avatar', damage, 'damage');
                if (GameState.enemy.currentHp <= 0) this.handleEnemyDeath();
            } else {
                GameState.player.currentHp -= damage;
                if (!isOffline) UI.spawnFloatingText('player-avatar', damage, 'damage');
                if (GameState.player.currentHp <= 0) this.handlePlayerDeath();
            }
        } else {
            if (!isOffline) UI.spawnFloatingText(attackerType === 'player' ? 'enemy-avatar' : 'player-avatar', 'Miss', 'miss');
        }
    },

    // handleEnemyDeath / handlePlayerDeath resets HP and increments counters...
};