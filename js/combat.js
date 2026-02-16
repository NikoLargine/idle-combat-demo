import { GameState } from './state.js';
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';
import * as Leveling from './leveling.js';
import * as Economy from './economy.js';
import * as EnemyUnlocks from './enemyUnlocks.js';
import * as Achievements from './achievements.js';
import * as Skills from './skills.js';

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
        Skills.reduceCooldowns?.(CONFIG.TICK_RATE_MS / 1000);

        // Player Turn
        if (GameState.player.tickTimer >= pStats.attackInterval) {
            Skills.tryAutoUseSkills?.(GameState.enemy.id, { silent: isOffline });
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

        const defenderType = attackerType === 'player' ? 'enemy' : 'player';
        const modifiedStats = Skills.applyPassiveStatModifiers?.({
            attackerType,
            defenderType,
            attackerStats,
            defenderStats
        }) || { attackerStats, defenderStats };
        const effectiveAttackerStats = modifiedStats.attackerStats || attackerStats;
        const effectiveDefenderStats = modifiedStats.defenderStats || defenderStats;

        const hitDenominator = effectiveAttackerStats.accuracy + effectiveDefenderStats.evasion;
        const chance = hitDenominator > 0 ? (effectiveAttackerStats.accuracy / hitDenominator) : 0;

        if (Math.random() < chance) {
            let damage = Utils.randomInt(effectiveAttackerStats.minHit, effectiveAttackerStats.maxHit);
            damage = Skills.applyActiveDamageModifiers?.(attackerType, damage) ?? damage;
            damage = Skills.applyPassiveDamageModifiers?.({ attackerType, defenderType, damage, silent: isOffline }) ?? damage;

            const dr = effectiveDefenderStats.damageReduction || 0;
            damage = Math.max(1, Math.floor(damage * (1 - dr / 100)));

            if (attackerType === 'player') {
                // Player hits enemy
                GameState.enemy.currentHp = Math.max(0, GameState.enemy.currentHp - damage);
                if (!isOffline) UI.spawnFloatingText('enemy-avatar', damage, 'damage');

                Skills.applyPassivePostHit?.({
                    attackerType: 'player',
                    defenderType: 'enemy',
                    damageDealt: damage,
                    silent: isOffline
                });

                // Check for enemy death
                if (GameState.enemy.currentHp <= 0) {
                    this.handleDeath('enemy', isOffline);
                }
            } else {
                // Enemy hits player
                GameState.player.currentHp = Math.max(0, GameState.player.currentHp - damage);
                if (!isOffline) UI.spawnFloatingText('player-avatar', damage, 'damage');

                const postHit = Skills.applyPassivePostHit?.({
                    attackerType: 'enemy',
                    defenderType: 'player',
                    damageDealt: damage,
                    silent: isOffline
                }) || { counterDamage: 0 };

                if (postHit.counterDamage > 0) {
                    GameState.enemy.currentHp = Math.max(0, GameState.enemy.currentHp - postHit.counterDamage);
                    if (!isOffline) UI.spawnFloatingText('enemy-avatar', postHit.counterDamage, 'damage');
                }

                // Check for player death before enemy counter-kill result.
                if (GameState.player.currentHp <= 0) {
                    this.handleDeath('player', isOffline);
                    return;
                }

                if (GameState.enemy.currentHp <= 0) {
                    this.handleDeath('enemy', isOffline);
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
            const defeatedEnemyId = GameState.enemy.id;
            const defeatedEnemy = CONFIG.ENEMIES[defeatedEnemyId];
            EnemyUnlocks.registerEnemyDefeat?.(defeatedEnemyId);
            EnemyUnlocks.checkEnemyUnlocks?.();
            Achievements.onEnemyDefeated?.(defeatedEnemy);

            const xpGained = Leveling.addXPFromEnemyDefeat?.(defeatedEnemyId) ?? 0;
            const goldGained = Economy.addGoldFromEnemyDefeat?.(defeatedEnemyId) ?? 0;
            GameState.addLog(`Defeated ${defeatedEnemy.name}! +${xpGained} XP, +${goldGained} gold (Total wins: ${GameState.player.wins})`);
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
