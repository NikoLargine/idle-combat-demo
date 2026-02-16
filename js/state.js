import { CONFIG } from './config.js';
import { calculateItemStats } from './rarity.js';
import { getScaledEnemy } from './enemies.js';

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
        tickTimer: 0,
        activeEffects: []
    },
    enemy: {
        id: 'goblin',
        currentHp: getScaledEnemy('goblin', 1)?.hp || 100,
        tickTimer: 0,
        activeEffects: []
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
        },
        itemRarities: {}
    },
    achievements: {},
    mission: {
        currentMissionId: null,
        currentWave: 0,
        accumulatedXp: 0,
        accumulatedGold: 0,
        lastResult: null
    },
    combat: {
        isActive: false,
        log: []
    },
    system: {
        lastSaveTime: Date.now(),
        unlockedPermanentEffects: {}
    },

    getPlayerStats() {
        const base = CONFIG.PLAYER_BASE;
        const statGain = CONFIG.LEVELING.STAT_GAIN_PER_LEVEL;
        const safeLevel = Number.isFinite(this.player.level) ? Math.max(1, Math.floor(this.player.level)) : 1;
        const levelsGained = safeLevel - 1;
        const weapon = CONFIG.EQUIPMENT.weapons.find(w => w.id === this.equipment.weaponId) || {};
        const armor = CONFIG.EQUIPMENT.armor.find(a => a.id === this.equipment.armorId) || {};
        const charm = CONFIG.EQUIPMENT.charms.find(c => c.id === this.equipment.charmId) || {};
        const weaponStats = calculateItemStats(weapon);
        const armorStats = calculateItemStats(armor);
        const charmStats = calculateItemStats(charm);

        return {
            hp: base.hp + (levelsGained * statGain.maxHp),
            attackInterval: base.attackInterval,
            minHit: base.minHit + (levelsGained * statGain.damage) + (weaponStats.minHit || 0),
            maxHit: base.maxHit + (levelsGained * statGain.damage) + (weaponStats.maxHit || 0),
            accuracy: base.accuracy + (levelsGained * statGain.accuracy) + (charmStats.accuracy || 0),
            evasion: base.evasion + (levelsGained * statGain.evasion) + (charmStats.evasion || 0),
            damageReduction: base.damageReduction + (armorStats.damageReduction || 0)
        };
    },

    addLog(message) {
        this.combat.log.unshift(message);
        if (this.combat.log.length > 8) this.combat.log.pop();
    }
};
