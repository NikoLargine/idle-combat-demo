export const CONFIG = {
    TICK_RATE_MS: 100,
    RESPAWN_TIME_MS: 1200,
    SAVE_INTERVAL_MS: 30000,

    LEVELING: {
        XP_BASE: 100,
        XP_GROWTH: 1.15,
        STAT_GAIN_PER_LEVEL: {
            maxHp: 5,
            damage: 1,
            accuracy: 0.005,
            evasion: 0.005
        }
    },
    ECONOMY: {
        GOLD_PER_ENEMY_LEVEL: 5
    },
    ACHIEVEMENTS: [
        {
            id: 'kill_10_enemies',
            name: 'Monster Hunter',
            description: 'Defeat 10 enemies.',
            type: 'kill',
            target: 10,
            current: 0,
            unlocked: false,
            reward: { type: 'gold', amount: 100 }
        },
        {
            id: 'kill_50_enemies',
            name: 'Goblin Exterminator',
            description: 'Defeat 50 enemies.',
            type: 'kill',
            target: 50,
            current: 0,
            unlocked: false,
            reward: { type: 'gold', amount: 400 }
        },
        {
            id: 'reach_level_5',
            name: 'Rising Hero',
            description: 'Reach player level 5.',
            type: 'level',
            target: 5,
            current: 0,
            unlocked: false,
            reward: { type: 'xp', amount: 200 }
        },
        {
            id: 'earn_1000_gold',
            name: 'Treasure Hoarder',
            description: 'Gain 1000 total gold.',
            type: 'gold',
            target: 1000,
            current: 0,
            unlocked: false,
            reward: { type: 'equipment', itemId: 'w2' }
        },
        {
            id: 'play_30_minutes',
            name: 'Persistent Warrior',
            description: 'Play for 30 minutes total.',
            type: 'time_played',
            target: 1800,
            current: 0,
            unlocked: false,
            reward: { type: 'gold', amount: 250 }
        }
    ],

    PLAYER_BASE: { hp: 100, minHit: 5, maxHit: 10, attackInterval: 2000, accuracy: 50, evasion: 10, damageReduction: 0 },

    ENEMIES: {
        training_dummy: {
            name: "Training Dummy",
            level: 1,
            hp: 100,
            minHit: 0,
            maxHit: 0,
            attackInterval: 5000,
            accuracy: 0,
            evasion: 0,
            unlockRequirement: { type: "level", value: 1 },
            isUnlocked: false
        },
        shadow_vermin: {
            name: "Shadow Vermin",
            level: 2,
            hp: 60,
            minHit: 4,
            maxHit: 8,
            attackInterval: 1000,
            accuracy: 40,
            evasion: 40,
            unlockRequirement: { type: "level", value: 2 },
            isUnlocked: false
        },
        mountain_orc: {
            name: "Mountain Orc",
            level: 4,
            hp: 250,
            minHit: 15,
            maxHit: 25,
            attackInterval: 3000,
            accuracy: 35,
            evasion: 5,
            unlockRequirement: { type: "level", value: 4 },
            isUnlocked: false
        },
        void_stalker: {
            name: "Void Stalker",
            level: 6,
            hp: 180,
            minHit: 20,
            maxHit: 30,
            attackInterval: 1500,
            accuracy: 70,
            evasion: 60,
            onHitEffects: [
                { effectId: 'exposed', chance: 0.25, duration: 4 }
            ],
            unlockRequirement: { type: "kills", enemyId: "shadow_vermin", value: 20 },
            isUnlocked: false
        },
        iron_sentinel: {
            name: "Iron Sentinel",
            level: 8,
            hp: 800,
            minHit: 35,
            maxHit: 50,
            attackInterval: 4500,
            accuracy: 40,
            evasion: 0,
            unlockRequirement: { type: "level", value: 8 },
            isUnlocked: false
        },
        Ancient_Dragon: {
            name: "Ancient Dragon",
            level: 12,
            hp: 2500,
            minHit: 80,
            maxHit: 150,
            attackInterval: 6000,
            accuracy: 100,
            evasion: 20,
            unlockRequirement: { type: "kills", enemyId: "iron_sentinel", value: 10 },
            isUnlocked: false
        }
    },

    MISSIONS: [
        {
            id: 'training_patrol',
            name: 'Training Patrol',
            description: 'Sweep the outskirts and eliminate roaming threats.',
            waves: 3,
            enemyPool: ['training_dummy', 'shadow_vermin'],
            areaModifier: {
                type: 'player_stat',
                stat: 'evasion',
                value: -0.05
            },
            reward: {
                gold: 60,
                xpBonusPercent: 0.05
            },
            unlockRequirement: {
                type: 'level',
                value: 1
            }
        },
        {
            id: 'vermin_breakline',
            name: 'Vermin Breakline',
            description: 'Push through fast attackers before they overrun the line.',
            waves: 4,
            enemyPool: ['shadow_vermin', 'mountain_orc'],
            areaModifier: {
                type: 'enemy_stat',
                stat: 'accuracy',
                value: 0.08
            },
            reward: {
                gold: 150,
                xpBonusPercent: 0.1
            },
            unlockRequirement: {
                type: 'level',
                value: 4
            }
        },
        {
            id: 'void_breach',
            name: 'Void Breach',
            description: 'Stabilize the breach while elite foes surge forward.',
            waves: 5,
            enemyPool: ['void_stalker', 'iron_sentinel'],
            areaModifier: {
                type: 'player_stat',
                stat: 'evasion',
                value: -0.12
            },
            reward: {
                gold: 320,
                xpBonusPercent: 0.15
            },
            unlockRequirement: {
                type: 'level',
                value: 7
            }
        }
    ],

    EQUIPMENT: {
        weapons: [
            {
                id: 'w1',
                name: 'Rusted Blade',
                slot: 'weapon',
                baseStats: { minHit: 2, maxHit: 5 },
                rarity: 'common',
                cost: 0,
                unlocked: false
            },
            {
                id: 'w2',
                name: 'Steel Falchion',
                slot: 'weapon',
                baseStats: { minHit: 10, maxHit: 18 },
                rarity: 'common',
                cost: 150,
                unlocked: false
            },
            {
                id: 'w3',
                name: 'Heavy Greataxe',
                slot: 'weapon',
                baseStats: { minHit: 35, maxHit: 60 },
                rarity: 'common',
                cost: 500,
                unlocked: false
            },
            {
                id: 'w4',
                name: 'Sun-Forged Spear',
                slot: 'weapon',
                baseStats: { minHit: 55, maxHit: 90 },
                rarity: 'common',
                cost: 1200,
                unlocked: false,
                onHitEffects: [{ effectId: 'bleed', chance: 0.2, duration: 5 }]
            },
            {
                id: 'w5',
                name: 'Demon-Slayer Katana',
                slot: 'weapon',
                baseStats: { minHit: 120, maxHit: 200 },
                rarity: 'common',
                cost: 3000,
                unlocked: false
            }
        ],
        armor: [
            {
                id: 'a1',
                name: 'Ragged Tunic',
                slot: 'armor',
                baseStats: { damageReduction: 0 },
                rarity: 'common',
                cost: 0,
                unlocked: false
            },
            {
                id: 'a2',
                name: 'Hardened Leather',
                slot: 'armor',
                baseStats: { damageReduction: 10 },
                rarity: 'common',
                cost: 180,
                unlocked: false
            },
            {
                id: 'a3',
                name: 'Full Plate Mail',
                slot: 'armor',
                baseStats: { damageReduction: 25 },
                rarity: 'common',
                cost: 650,
                unlocked: false
            },
            {
                id: 'a4',
                name: 'Enchanted Aegis',
                slot: 'armor',
                baseStats: { damageReduction: 45 },
                rarity: 'common',
                cost: 1500,
                unlocked: false
            },
            {
                id: 'a5',
                name: "God-King's Mantle",
                slot: 'armor',
                baseStats: { damageReduction: 75 },
                rarity: 'common',
                cost: 4000,
                unlocked: false
            }
        ],
        charms: [
            {
                id: 'c1',
                name: 'None',
                slot: 'charm',
                baseStats: { accuracy: 0, evasion: 0 },
                rarity: 'common',
                cost: 0,
                unlocked: false
            },
            {
                id: 'c2',
                name: 'Focus Amulet',
                slot: 'charm',
                baseStats: { accuracy: 30, evasion: 0 },
                rarity: 'common',
                cost: 140,
                unlocked: false
            },
            {
                id: 'c3',
                name: 'Shadow Cloak',
                slot: 'charm',
                baseStats: { accuracy: 0, evasion: 40 },
                rarity: 'common',
                cost: 300,
                unlocked: false
            },
            {
                id: 'c4',
                name: 'Eye of the Storm',
                slot: 'charm',
                baseStats: { accuracy: 60, evasion: 20 },
                rarity: 'common',
                cost: 900,
                unlocked: false
            },
            {
                id: 'c5',
                name: 'Infinity Sigil',
                slot: 'charm',
                baseStats: { accuracy: 150, evasion: 100 },
                rarity: 'common',
                cost: 2600,
                unlocked: false
            }
        ]
    }
};
