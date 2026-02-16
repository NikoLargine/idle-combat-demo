import { GameState } from './state.js';
import { CONFIG } from './config.js';
import { CombatEngine } from './combat.js';
import { UI } from './ui.js';
import * as Leveling from './leveling.js';
import * as Economy from './economy.js';
import * as EnemyUnlocks from './enemyUnlocks.js';
import * as Shop from './shop.js';
import * as Achievements from './achievements.js';
import * as Skills from './skills.js';
import * as StatusEffects from './statusEffects.js';
import * as Missions from './missions.js';

export const Persistence = {
    SAVE_KEY: 'idle_combat_save_v1',

    save() {
        GameState.system.lastSaveTime = Date.now();
        const payload = JSON.stringify({
            ...GameState,
            player: {
                ...GameState.player,
                activeEffects: []
            },
            enemy: {
                ...GameState.enemy,
                activeEffects: []
            }
        });
        localStorage.setItem(this.SAVE_KEY, payload);
    },

    load() {
        const payload = localStorage.getItem(this.SAVE_KEY);
        if (!payload) return null;

        try {
            const parsed = JSON.parse(payload);

            // Validate that essential data exists
            if (!parsed.enemy || !parsed.enemy.id || !CONFIG.ENEMIES[parsed.enemy.id]) {
                throw new Error("Invalid enemy data");
            }

            Object.assign(GameState, parsed);

            // Ensure deaths property exists (for old saves that don't have it)
            if (typeof GameState.player.deaths === 'undefined') {
                GameState.player.deaths = 0;
            }
            Leveling.normalizePlayerProgression?.(GameState.player);
            Economy.normalizePlayerEconomy?.(GameState.player);
            Skills.normalizePlayerSkills?.(GameState.player);
            Skills.resetSkillRuntimeState?.();
            StatusEffects.normalizeStatusState?.();
            StatusEffects.clearAllTemporaryEffects?.();
            Missions.normalizeMissionState?.();
            EnemyUnlocks.normalizeKillStats?.(GameState.player);
            Shop.normalizeShopState?.();
            Achievements.normalizeAchievementsState?.();
            EnemyUnlocks.checkEnemyUnlocks?.();

            const missionActive = Missions.isMissionActive?.() || false;
            if (!CONFIG.ENEMIES[GameState.enemy.id] || (!missionActive && !CONFIG.ENEMIES[GameState.enemy.id].isUnlocked)) {
                GameState.enemy.id = EnemyUnlocks.getFirstUnlockedEnemyId?.() || 'training_dummy';
                GameState.enemy.currentHp = CONFIG.ENEMIES[GameState.enemy.id].hp;
                GameState.enemy.tickTimer = 0;
            }

            // Clamp HP to the current level-scaled max HP.
            const maxHp = GameState.getPlayerStats().hp;
            if (!Number.isFinite(GameState.player.currentHp)) {
                GameState.player.currentHp = maxHp;
            } else {
                GameState.player.currentHp = Math.max(0, Math.min(GameState.player.currentHp, maxHp));
            }

            this.calculateOfflineProgress();
        } catch (e) {
            console.error("Corrupted save data. Starting fresh.", e);
            // Clear corrupted save
            localStorage.removeItem(this.SAVE_KEY);

            // Reset to defaults
            GameState.enemy.id = 'training_dummy';
            GameState.enemy.currentHp = CONFIG.ENEMIES['training_dummy'].hp;
            GameState.enemy.tickTimer = 0;
            GameState.enemy.activeEffects = [];

            GameState.player.currentHp = CONFIG.PLAYER_BASE.hp;
            GameState.player.level = 1;
            GameState.player.xp = 0;
            GameState.player.gold = 0;
            GameState.player.skills = { learned: {} };
            GameState.player.killStats = {};
            GameState.player.wins = 0;
            GameState.player.deaths = 0;
            GameState.player.tickTimer = 0;
            GameState.player.activeEffects = [];

            GameState.equipment.weaponId = 'w1';
            GameState.equipment.armorId = 'a1';
            GameState.equipment.charmId = 'c1';
            GameState.shop = { itemUnlocks: { w1: true, a1: true, c1: true }, itemRarities: {} };
            GameState.achievements = {};
            GameState.mission = {
                currentMissionId: null,
                currentWave: 0,
                accumulatedXp: 0,
                accumulatedGold: 0,
                lastResult: null
            };

            GameState.combat.isActive = false;
            GameState.combat.log = [];

            GameState.system.lastSaveTime = Date.now();
            GameState.system.unlockedPermanentEffects = {};
            Shop.normalizeShopState?.();
            Achievements.normalizeAchievementsState?.();
            Skills.normalizePlayerSkills?.(GameState.player);
            Skills.resetSkillRuntimeState?.();
            StatusEffects.normalizeStatusState?.();
            StatusEffects.clearAllTemporaryEffects?.();
            Missions.normalizeMissionState?.();
            EnemyUnlocks.checkEnemyUnlocks?.();
        }
    },

    restart() {
        // Stop combat if active
        CombatEngine.stop();

        // Clear save data
        localStorage.removeItem(this.SAVE_KEY);

        // Reset enemy first (before player, so config exists)
        GameState.enemy.id = 'training_dummy';
        GameState.enemy.currentHp = CONFIG.ENEMIES['training_dummy'].hp;
        GameState.enemy.tickTimer = 0;
        GameState.enemy.activeEffects = [];

        // Reset player state
        GameState.player.currentHp = CONFIG.PLAYER_BASE.hp;
        GameState.player.level = 1;
        GameState.player.xp = 0;
        GameState.player.gold = 0;
        GameState.player.skills = { learned: {} };
        GameState.player.killStats = {};
        GameState.player.wins = 0;
        GameState.player.deaths = 0;
        GameState.player.tickTimer = 0;
        GameState.player.activeEffects = [];

        // Reset equipment
        GameState.equipment.weaponId = 'w1';
        GameState.equipment.armorId = 'a1';
        GameState.equipment.charmId = 'c1';
        GameState.shop = { itemUnlocks: { w1: true, a1: true, c1: true }, itemRarities: {} };
        GameState.achievements = {};
        GameState.mission = {
            currentMissionId: null,
            currentWave: 0,
            accumulatedXp: 0,
            accumulatedGold: 0,
            lastResult: null
        };

        // Reset combat state
        GameState.combat.isActive = false;
        GameState.combat.log = [];

        // Reset system
        GameState.system.lastSaveTime = Date.now();
        GameState.system.unlockedPermanentEffects = {};

        // Reset respawn flag
        CombatEngine.isRespawning = false;
        Shop.normalizeShopState?.();
        Achievements.normalizeAchievementsState?.();
        Skills.normalizePlayerSkills?.(GameState.player);
        Skills.resetSkillRuntimeState?.();
        StatusEffects.normalizeStatusState?.();
        StatusEffects.clearAllTemporaryEffects?.();
        Missions.normalizeMissionState?.();
        EnemyUnlocks.checkEnemyUnlocks?.();

        // Reinitialize UI (which repopulates dropdowns and updates display)
        UI.populateDropdowns();
        UI.updateAll();

        // Show confirmation
        const status = document.getElementById('save-status');
        if (status) {
            status.textContent = 'Game Restarted';
            setTimeout(() => status.textContent = 'Saved', 2000);
        }
    },

    calculateOfflineProgress() {
        const now = Date.now();
        const elapsedMs = now - GameState.system.lastSaveTime;

        // Max 8 hours of offline progress
        const maxMs = 8 * 60 * 60 * 1000;
        const boundedMs = Math.min(elapsedMs, maxMs);

        const ticks = Math.floor(boundedMs / CONFIG.TICK_RATE_MS);

        // Ignore very short reloads (less than 1 second)
        if (ticks < 10) return;

        const startingWins = GameState.player.wins;
        const startingDeaths = GameState.player.deaths;

        // Temporarily enable combat for offline simulation
        GameState.combat.isActive = true;

        // Run headless simulation
        for (let i = 0; i < ticks; i++) {
            CombatEngine.tick(true);
        }

        // Reset combat state after simulation
        GameState.combat.isActive = false;
        CombatEngine.isRespawning = false;

        const winsGained = GameState.player.wins - startingWins;
        const deathsGained = GameState.player.deaths - startingDeaths;

        // Show offline summary modal
        const hours = Math.floor(boundedMs / (1000 * 60 * 60));
        const minutes = Math.floor((boundedMs % (1000 * 60 * 60)) / (1000 * 60));
        const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        UI.showModal(
            `While you were away (${timeText})...`,
            `You defeated ${winsGained} enemies and died ${deathsGained} times.`
        );
    }
};
