import { GameState } from './state.js';
import { CONFIG } from './config.js';
import { CombatEngine } from './combat.js';

export const Persistence = {
    SAVE_KEY: 'idle_combat_save_v1',

    save() {
        GameState.system.lastSaveTime = Date.now();
        const payload = JSON.stringify(GameState);
        localStorage.setItem(this.SAVE_KEY, payload);
    },

    load() {
        const payload = localStorage.getItem(this.SAVE_KEY);
        if (!payload) return null;

        try {
            const parsed = JSON.parse(payload);
            Object.assign(GameState, parsed); // Hydrate state
            this.calculateOfflineProgress();
        } catch (e) {
            console.error("Corrupted save data. Starting fresh.");
        }
    },

    calculateOfflineProgress() {
        const now = Date.now();
        const elapsedMs = now - GameState.system.lastSaveTime;
        const maxMs = CONFIG.MAX_OFFLINE_HOURS * 60 * 60 * 1000;
        const boundedMs = Math.min(elapsedMs, maxMs);

        const ticks = Math.floor(boundedMs / CONFIG.TICK_RATE_MS);
        if (ticks < 10) return; // Ignore very short reloads

        const startingWins = GameState.player.wins;

        // Run headless loop
        for(let i = 0; i < ticks; i++) {
            CombatEngine.tick(true); // pass true to disable UI rendering
        }

        const winsGained = GameState.player.wins - startingWins;

        // Show offline summary modal
        UI.showModal(`While you were away...`, `You simulated ${ticks} combat ticks and defeated ${winsGained} enemies.`);
    }
};