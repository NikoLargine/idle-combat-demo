import { GameState } from './state.js';
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';

export const CombatEngine = {
    intervalId: null,
    isRespawning: false,

    start() {
        if (GameState.combat.isActive || this.isRespawning) return;
        GameState.combat.isActive = true;
        this.intervalId = setInterval(() => this.tick(), CONFIG.TICK_RATE_MS);
    },

    stop() {
        GameState.combat.isActive = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    },

    tick(isOffline = false) {
        // Don't process combat during respawn delay
        if (!GameState.combat.isActive || this.isRespawning) return;

        const pStats = GameState.getPlayerStats();
        const eStats = CONFIG.ENEMIES[GameState.enemy.id];

        GameState.player.tickTimer += CONFIG.TICK_RATE_MS;
        GameState.enemy.tickTimer += CONFIG.TICK_RATE_MS;

        // Player Turn
        if (GameState.player.tickTimer >= pStats.attackInterval) {
            this.processHit('player', pStats, eStats, isOffline);
            GameState.player.tickTimer = 0;
            // If enemy died, stop processing this tick
            if (this.isRespawning) return;
        }

        // Enemy Turn (only if not already respawning)
        if (!this.isRespawning && GameState.enemy.tickTimer >= eStats.attackInterval) {
            this.processHit('enemy', eStats, pStats, isOffline);
            GameState.enemy.tickTimer = 0;
        }

        if (!isOffline) UI.updateAll();
    },

    processHit(attackerType, attackerStats, defenderStats, isOffline) {
        // Don't process hits during respawn
        if (this.isRespawning) return;

        const chance = attackerStats.accuracy / (attackerStats.accuracy + defenderStats.evasion);

        if (Math.random() < chance) {
            let damage = Utils.randomInt(attackerStats.minHit, attackerStats.maxHit);
            const dr = defenderStats.damageReduction || 0;
            damage = Math.max(1, Math.floor(damage * (1 - dr / 100)));

            if (attackerType === 'player') {
                // Player hits enemy
                GameState.enemy.currentHp = Math.max(0, GameState.enemy.currentHp - damage);
                if (!isOffline) UI.spawnFloatingText('enemy-avatar', damage, 'damage');

                // Check for enemy death
                if (GameState.enemy.currentHp <= 0) {
                    this.handleDeath('enemy', isOffline);
                }
            } else {
                // Enemy hits player
                GameState.player.currentHp = Math.max(0, GameState.player.currentHp - damage);
                if (!isOffline) UI.spawnFloatingText('player-avatar', damage, 'damage');

                // Check for player death
                if (GameState.player.currentHp <= 0) {
                    this.handleDeath('player', isOffline);
                }
            }
        } else {
            // Miss
            const target = attackerType === 'player' ? 'enemy-avatar' : 'player-avatar';
            if (!isOffline) UI.spawnFloatingText(target, 'Miss', 'miss');
        }
    },

    handleDeath(victimType, isOffline) {
        // Prevent multiple death handlers from running simultaneously
        if (this.isRespawning) return;

        this.isRespawning = true;

        if (victimType === 'enemy') {
            // Player wins
            GameState.player.wins++;
            GameState.addLog(`Defeated ${CONFIG.ENEMIES[GameState.enemy.id].name}! (Total wins: ${GameState.player.wins})`);
        } else {
            // Player dies
            GameState.player.deaths++;
            GameState.addLog(`You were defeated! (Total deaths: ${GameState.player.deaths})`);
        }

        if (isOffline) {
            // Instant respawn during offline calculation
            this.resetAfterDeath(victimType);
            this.isRespawning = false;
        } else {
            // Visual pause for player to see the death
            setTimeout(() => {
                this.resetAfterDeath(victimType);
                this.isRespawning = false;
                UI.updateAll();
            }, CONFIG.RESPAWN_TIME_MS);
        }
    },

    resetAfterDeath(victimType) {
        if (victimType === 'enemy') {
            // Reset enemy to full HP
            GameState.enemy.currentHp = CONFIG.ENEMIES[GameState.enemy.id].hp;
            GameState.enemy.tickTimer = 0;
        } else {
            // Reset player to full HP
            const pStats = GameState.getPlayerStats();
            GameState.player.currentHp = pStats.hp;
            GameState.player.tickTimer = 0;
        }
    }
};