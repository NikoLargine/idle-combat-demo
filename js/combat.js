import { GameState } from './state.js';
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { UI } from './ui.js';
import * as Leveling from './leveling.js';
import * as Economy from './economy.js';
import * as EnemyUnlocks from './enemyUnlocks.js';
import * as Achievements from './achievements.js';
import * as Skills from './skills.js';
import * as StatusEffects from './statusEffects.js';
import * as Missions from './missions.js';

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

        GameState.player.tickTimer += CONFIG.TICK_RATE_MS;
        GameState.enemy.tickTimer += CONFIG.TICK_RATE_MS;
        Skills.reduceCooldowns?.(CONFIG.TICK_RATE_MS / 1000);
        const effectUpdate = StatusEffects.updateEffects?.(CONFIG.TICK_RATE_MS / 1000, { silent: isOffline }) || { events: [] };

        if (!isOffline && Array.isArray(effectUpdate.events)) {
            effectUpdate.events.forEach(event => {
                if (event.type !== 'damage' || !Number.isFinite(event.amount) || event.amount <= 0) return;
                const containerId = event.targetType === 'player' ? 'player-avatar' : 'enemy-avatar';
                UI.spawnFloatingText(containerId, event.amount, 'damage');
            });
        }

        if (GameState.player.currentHp <= 0) {
            this.handleDeath('player', isOffline);
            return;
        }
        if (GameState.enemy.currentHp <= 0) {
            this.handleDeath('enemy', isOffline);
            return;
        }

        const pStats = StatusEffects.applyStatEffectModifiers?.({
            target: GameState.player,
            targetType: 'player',
            stats: GameState.getPlayerStats(),
            context: { phase: 'tick_player_turn' }
        }) || GameState.getPlayerStats();
        const eStats = StatusEffects.applyStatEffectModifiers?.({
            target: GameState.enemy,
            targetType: 'enemy',
            stats: CONFIG.ENEMIES[GameState.enemy.id],
            context: { phase: 'tick_player_turn' }
        }) || CONFIG.ENEMIES[GameState.enemy.id];
        const pStatsForTiming = Missions.applyAreaModifiersToStats?.({
            targetType: 'player',
            stats: pStats
        }) || pStats;
        const eStatsForTiming = Missions.applyAreaModifiersToStats?.({
            targetType: 'enemy',
            stats: eStats
        }) || eStats;

        // Player Turn
        if (GameState.player.tickTimer >= pStatsForTiming.attackInterval) {
            Skills.tryAutoUseSkills?.(GameState.enemy.id, { silent: isOffline });
            this.processHit('player', pStats, eStats, isOffline);
            GameState.player.tickTimer = 0;
            // If enemy died, stop processing this tick
            if (this.isRespawning) return;
        }

        // Enemy Turn (only if not already respawning)
        const refreshedPStats = StatusEffects.applyStatEffectModifiers?.({
            target: GameState.player,
            targetType: 'player',
            stats: GameState.getPlayerStats(),
            context: { phase: 'tick_enemy_turn' }
        }) || GameState.getPlayerStats();
        const refreshedEStats = StatusEffects.applyStatEffectModifiers?.({
            target: GameState.enemy,
            targetType: 'enemy',
            stats: CONFIG.ENEMIES[GameState.enemy.id],
            context: { phase: 'tick_enemy_turn' }
        }) || CONFIG.ENEMIES[GameState.enemy.id];
        const refreshedEStatsForTiming = Missions.applyAreaModifiersToStats?.({
            targetType: 'enemy',
            stats: refreshedEStats
        }) || refreshedEStats;

        if (!this.isRespawning && GameState.enemy.tickTimer >= refreshedEStatsForTiming.attackInterval) {
            this.processHit('enemy', refreshedEStats, refreshedPStats, isOffline);
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
        const attackerEntity = attackerType === 'player' ? GameState.player : GameState.enemy;
        const defenderEntity = defenderType === 'player' ? GameState.player : GameState.enemy;
        const statusModifiedAttackerStats = StatusEffects.applyStatEffectModifiers?.({
            target: attackerEntity,
            targetType: attackerType,
            stats: effectiveAttackerStats,
            context: { phase: 'attack' }
        }) || effectiveAttackerStats;
        const statusModifiedDefenderStats = StatusEffects.applyStatEffectModifiers?.({
            target: defenderEntity,
            targetType: defenderType,
            stats: effectiveDefenderStats,
            context: { phase: 'defend' }
        }) || effectiveDefenderStats;
        const missionModifiedAttackerStats = Missions.applyAreaModifiersToStats?.({
            targetType: attackerType,
            stats: statusModifiedAttackerStats
        }) || statusModifiedAttackerStats;
        const missionModifiedDefenderStats = Missions.applyAreaModifiersToStats?.({
            targetType: defenderType,
            stats: statusModifiedDefenderStats
        }) || statusModifiedDefenderStats;

        const hitDenominator = missionModifiedAttackerStats.accuracy + missionModifiedDefenderStats.evasion;
        const chance = hitDenominator > 0 ? (missionModifiedAttackerStats.accuracy / hitDenominator) : 0;

        if (Math.random() < chance) {
            let damage = Utils.randomInt(missionModifiedAttackerStats.minHit, missionModifiedAttackerStats.maxHit);
            damage = Skills.applyActiveDamageModifiers?.(attackerType, damage) ?? damage;
            damage = Skills.applyPassiveDamageModifiers?.({ attackerType, defenderType, damage, silent: isOffline }) ?? damage;

            const dr = missionModifiedDefenderStats.damageReduction || 0;
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
                StatusEffects.applyOnHitEffects?.({
                    attackerType: 'player',
                    defenderType: 'enemy',
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
                StatusEffects.applyOnHitEffects?.({
                    attackerType: 'enemy',
                    defenderType: 'player',
                    silent: isOffline
                });

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

            const rewardMultipliers = Missions.getRewardMultipliers?.() || { xpMultiplier: 1, goldMultiplier: 1 };
            const baseXp = Leveling.getEnemyDefeatXP?.(defeatedEnemyId) ?? 0;
            const baseGold = Economy.getEnemyDefeatGold?.(defeatedEnemyId) ?? 0;
            const xpGained = Math.max(0, Math.floor(baseXp * (rewardMultipliers.xpMultiplier || 1)));
            const goldGained = Math.max(0, Math.floor(baseGold * (rewardMultipliers.goldMultiplier || 1)));

            if (xpGained > 0) Leveling.addXP?.(xpGained);
            if (goldGained > 0) Economy.addGold?.(goldGained);

            const missionResult = Missions.onEnemyDefeated?.({
                xpGained,
                goldGained,
                silent: isOffline
            }) || null;

            if (missionResult?.completed) {
                const bonusText = missionResult.bonusXp > 0 || missionResult.bonusGold > 0
                    ? ` Mission bonus: +${missionResult.bonusXp} XP, +${missionResult.bonusGold} gold.`
                    : '';
                GameState.addLog(`Mission Complete: ${missionResult.missionName}.${bonusText}`);
            }

            GameState.addLog(`Defeated ${defeatedEnemy.name}! +${xpGained} XP, +${goldGained} gold (Total wins: ${GameState.player.wins})`);
        } else {
            // Player dies
            GameState.player.deaths++;
            Missions.failMission?.({ reason: 'player_defeat', silent: isOffline });
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
            StatusEffects.clearTemporaryEffects?.(GameState.enemy);
        } else {
            // Reset player to full HP
            const pStats = GameState.getPlayerStats();
            GameState.player.currentHp = pStats.hp;
            GameState.player.tickTimer = 0;
            StatusEffects.clearTemporaryEffects?.(GameState.player);
        }
    }
};
