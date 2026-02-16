export const CONFIG = {
    TICK_RATE_MS: 100,
    RESPAWN_TIME_MS: 1200,
    SAVE_INTERVAL_MS: 30000,

    PLAYER_BASE: { hp: 100, minHit: 5, maxHit: 10, attackInterval: 2000, accuracy: 50, evasion: 10, damageReduction: 0 },

    ENEMIES: {
        training_dummy: { name: "Training Dummy", hp: 100, minHit: 0, maxHit: 0, attackInterval: 5000, accuracy: 0, evasion: 0 },
        shadow_vermin: { name: "Shadow Vermin", hp: 60, minHit: 4, maxHit: 8, attackInterval: 1000, accuracy: 40, evasion: 40 },
        mountain_orc: { name: "Mountain Orc", hp: 250, minHit: 15, maxHit: 25, attackInterval: 3000, accuracy: 35, evasion: 5 },
        void_stalker: { name: "Void Stalker", hp: 180, minHit: 20, maxHit: 30, attackInterval: 1500, accuracy: 70, evasion: 60 },
        iron_sentinel: { name: "Iron Sentinel", hp: 800, minHit: 35, maxHit: 50, attackInterval: 4500, accuracy: 40, evasion: 0 },
        Ancient_Dragon: { name: "Ancient Dragon", hp: 2500, minHit: 80, maxHit: 150, attackInterval: 6000, accuracy: 100, evasion: 20 }
    },

    EQUIPMENT: {
        weapons: [
            { id: 'w1', name: 'Rusted Blade', minHit: 2, maxHit: 5 },
            { id: 'w2', name: 'Steel Falchion', minHit: 10, maxHit: 18 },
            { id: 'w3', name: 'Heavy Greataxe', minHit: 35, maxHit: 60 },
            { id: 'w4', name: 'Sun-Forged Spear', minHit: 55, maxHit: 90 },
            { id: 'w5', name: 'Demon-Slayer Katana', minHit: 120, maxHit: 200 }
        ],
        armor: [
            { id: 'a1', name: 'Ragged Tunic', damageReduction: 0 },
            { id: 'a2', name: 'Hardened Leather', damageReduction: 10 },
            { id: 'a3', name: 'Full Plate Mail', damageReduction: 25 },
            { id: 'a4', name: 'Enchanted Aegis', damageReduction: 45 },
            { id: 'a5', name: 'God-King’s Mantle', damageReduction: 75 }
        ],
        charms: [
            { id: 'c1', name: 'None', accuracy: 0, evasion: 0 },
            { id: 'c2', name: 'Focus Amulet', accuracy: 30, evasion: 0 },
            { id: 'c3', name: 'Shadow Cloak', accuracy: 0, evasion: 40 },
            { id: 'c4', name: 'Eye of the Storm', accuracy: 60, evasion: 20 },
            { id: 'c5', name: 'Infinity Sigil', accuracy: 150, evasion: 100 }
        ]
    }
};