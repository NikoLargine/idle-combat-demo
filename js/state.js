import { CONFIG } from './config.js';

export const GameState = {
    player: {
        currentHp: CONFIG.PLAYER_BASE.hp,
        level: 1,
        wins: 0,
        tickTimer: 0
    },
    enemy: {
        id: 'training_dummy',
        currentHp: CONFIG.ENEMIES['training_dummy'].hp,
        tickTimer: 0
    },
    equipment: {
        weaponId: 'w1',
        armorId: 'a1',
        charmId: 'c1'
    },
    combat: {
        isActive: false,
        log: [] // Array of string messages, capped at 10
    },
    system: {
        lastSaveTime: Date.now()
    },

    // Derived State Getters
    getPlayerStats() {
        // Here, merge CONFIG.PLAYER_BASE with stats from GameState.equipment IDs
        // This ensures data normalization (we only save IDs, not the full object)
        // ... implementation details
    },

    addLog(message) {
        this.combat.log.unshift(message);
        if (this.combat.log.length > 10) this.combat.log.pop();
    }
};