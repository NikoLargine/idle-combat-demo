export const CONFIG = {
    TICK_RATE_MS: 100,
    SAVE_INTERVAL_MS: 30000,
    MAX_OFFLINE_HOURS: 4,

    PLAYER_BASE: {
        hp: 100,
        minHit: 5,
        maxHit: 12,
        attackInterval: 2000, // in ms
        accuracy: 50,
        evasion: 10,
        damageReduction: 0
    },

    ENEMIES: {
        training_dummy: { name: "Training Dummy", hp: 200, minHit: 1, maxHit: 2, attackInterval: 3000, accuracy: 10, evasion: 0 },
        forest_beast: { name: "Forest Beast", hp: 120, minHit: 8, maxHit: 15, attackInterval: 1500, accuracy: 40, evasion: 20 },
        stone_guardian: { name: "Stone Guardian", hp: 500, minHit: 15, maxHit: 25, attackInterval: 4000, accuracy: 30, evasion: 5 }
    },

    EQUIPMENT: {
        weapons: [
            { id: 'w1', name: 'Rusted Sword', minHit: 2, maxHit: 5 },
            { id: 'w2', name: 'Steel Blade', minHit: 5, maxHit: 10 }
        ],
        armor: [
            { id: 'a1', name: 'Cloth Tunic', damageReduction: 5 },
            { id: 'a2', name: 'Iron Plate', damageReduction: 15 }
        ],
        charms: [
            { id: 'c1', name: 'Focus Ring', accuracy: 10 },
            { id: 'c2', name: 'Evasion Pendant', evasion: 10 }
        ]
    }
};