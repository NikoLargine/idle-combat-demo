import { CONFIG } from './config.js';

export const GameState = {
    player: {
        currentHp: CONFIG.PLAYER_BASE.hp,
        level: 1,
        xp: 0,
        gold: 0,
        skills: {
            learned: {}
        },
        killStats: {},
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
    shop: {
        itemUnlocks: {
            w1: true,
            a1: true,
            c1: true
        }
    },
    achievements: {},
    combat: {
        isActive: false,
        log: []
    },
    system: {
        lastSaveTime: Date.now()
    },

    getPlayerStats() {
        const base = CONFIG.PLAYER_BASE;
        const statGain = CONFIG.LEVELING.STAT_GAIN_PER_LEVEL;
        const safeLevel = Number.isFinite(this.player.level) ? Math.max(1, Math.floor(this.player.level)) : 1;
        const levelsGained = safeLevel - 1;
        const weapon = CONFIG.EQUIPMENT.weapons.find(w => w.id === this.equipment.weaponId) || {};
        const armor = CONFIG.EQUIPMENT.armor.find(a => a.id === this.equipment.armorId) || {};
        const charm = CONFIG.EQUIPMENT.charms.find(c => c.id === this.equipment.charmId) || {};

        return {
            hp: base.hp + (levelsGained * statGain.maxHp),
            attackInterval: base.attackInterval,
            minHit: base.minHit + (levelsGained * statGain.damage) + (weapon.minHit || 0),
            maxHit: base.maxHit + (levelsGained * statGain.damage) + (weapon.maxHit || 0),
            accuracy: base.accuracy + (levelsGained * statGain.accuracy) + (charm.accuracy || 0),
            evasion: base.evasion + (levelsGained * statGain.evasion) + (charm.evasion || 0),
            damageReduction: base.damageReduction + (armor.damageReduction || 0)
        };
    },

    addLog(message) {
        this.combat.log.unshift(message);
        if (this.combat.log.length > 8) this.combat.log.pop();
    }
};
