import { CONFIG } from './config.js';

export const GameState = {
    player: {
        currentHp: CONFIG.PLAYER_BASE.hp,
        level: 1,
        wins: 0,
        deaths: 0,
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
        log: []
    },
    system: {
        lastSaveTime: Date.now()
    },

    getPlayerStats() {
        const base = CONFIG.PLAYER_BASE;
        const weapon = CONFIG.EQUIPMENT.weapons.find(w => w.id === this.equipment.weaponId) || {};
        const armor = CONFIG.EQUIPMENT.armor.find(a => a.id === this.equipment.armorId) || {};
        const charm = CONFIG.EQUIPMENT.charms.find(c => c.id === this.equipment.charmId) || {};

        return {
            hp: base.hp,
            attackInterval: base.attackInterval,
            minHit: base.minHit + (weapon.minHit || 0),
            maxHit: base.maxHit + (weapon.maxHit || 0),
            accuracy: base.accuracy + (charm.accuracy || 0),
            evasion: base.evasion + (charm.evasion || 0),
            damageReduction: base.damageReduction + (armor.damageReduction || 0)
        };
    },

    addLog(message) {
        this.combat.log.unshift(message);
        if (this.combat.log.length > 8) this.combat.log.pop();
    }
};