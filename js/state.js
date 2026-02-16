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


    addLog(message) {
        this.combat.log.unshift(message);
        if (this.combat.log.length > 10) this.combat.log.pop();
    }

    // Add this inside GameState in state.js
    getPlayerStats() {
        const base = CONFIG.PLAYER_BASE;
        const weapon = CONFIG.EQUIPMENT.weapons.find(w => w.id === this.equipment.weaponId);
        const armor = CONFIG.EQUIPMENT.armor.find(a => a.id === this.equipment.armorId);
        const charm = CONFIG.EQUIPMENT.charms.find(c => c.id === this.equipment.charmId);

        return {
            hp: base.hp,
            attackInterval: base.attackInterval,
            minHit: base.minHit + (weapon ? weapon.minHit : 0),
            maxHit: base.maxHit + (weapon ? weapon.maxHit : 0),
            accuracy: base.accuracy + (charm ? (charm.accuracy || 0) : 0),
            evasion: base.evasion + (charm ? (charm.evasion || 0) : 0),
            damageReduction: base.damageReduction + (armor ? (armor.damageReduction || 0) : 0)
        };
    }
};