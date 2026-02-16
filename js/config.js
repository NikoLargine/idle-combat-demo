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
        { id: 'kill_10_enemies', name: 'Monster Hunter', description: 'Defeat 10 enemies.', type: 'kill', target: 10, current: 0, unlocked: false, reward: { type: 'gold', amount: 100 } },
        { id: 'kill_50_enemies', name: 'Goblin Exterminator', description: 'Defeat 50 enemies.', type: 'kill', target: 50, current: 0, unlocked: false, reward: { type: 'gold', amount: 400 } },
        { id: 'reach_level_5', name: 'Rising Hero', description: 'Reach player level 5.', type: 'level', target: 5, current: 0, unlocked: false, reward: { type: 'xp', amount: 200 } },
        { id: 'earn_1000_gold', name: 'Treasure Hoarder', description: 'Gain 1000 total gold.', type: 'gold', target: 1000, current: 0, unlocked: false, reward: { type: 'equipment', itemId: 'w2' } },
        { id: 'play_30_minutes', name: 'Persistent Warrior', description: 'Play for 30 minutes total.', type: 'time_played', target: 1800, current: 0, unlocked: false, reward: { type: 'gold', amount: 250 } }
    ],

    PLAYER_BASE: { hp: 100, minHit: 5, maxHit: 10, attackInterval: 2000, accuracy: 50, evasion: 10, damageReduction: 0 },

    ENEMIES: {
        goblin: {
            id: 'goblin', name: 'Goblin', levelRequirement: 1,
            baseStats: { hp: 70, damage: 8, critChance: 5, evasion: 8 },
            possibleStatusEffects: [], goldDropRange: { min: 8, max: 14 }, accuracy: 42, attackInterval: 2100,
            unlockRequirement: { type: 'level', value: 1 }, isUnlocked: false
        },
        goblin_archer: {
            id: 'goblin_archer', name: 'Goblin Archer', levelRequirement: 2,
            baseStats: { hp: 60, damage: 9, critChance: 8, evasion: 18 },
            possibleStatusEffects: [], goldDropRange: { min: 10, max: 18 }, accuracy: 46, attackInterval: 1700,
            unlockRequirement: { type: 'level', value: 2 }, isUnlocked: false
        },
        wolf: {
            id: 'wolf', name: 'Wolf', levelRequirement: 3,
            baseStats: { hp: 85, damage: 10, critChance: 18, evasion: 12 },
            possibleStatusEffects: [{ effectId: 'bleed', chance: 0.12, duration: 3 }],
            onHitEffects: [{ effectId: 'bleed', chance: 0.12, duration: 3 }],
            goldDropRange: { min: 12, max: 20 }, accuracy: 48, attackInterval: 1650,
            unlockRequirement: { type: 'level', value: 3 }, isUnlocked: false
        },
        bandit: {
            id: 'bandit', name: 'Bandit', levelRequirement: 4,
            baseStats: { hp: 105, damage: 12, critChance: 10, evasion: 10 },
            possibleStatusEffects: [], goldDropRange: { min: 15, max: 24 }, accuracy: 50, attackInterval: 1950,
            unlockRequirement: { type: 'level', value: 4 }, isUnlocked: false
        },
        skeleton: {
            id: 'skeleton', name: 'Skeleton', levelRequirement: 5,
            baseStats: { hp: 130, damage: 14, critChance: 6, evasion: 6 },
            possibleStatusEffects: [], goldDropRange: { min: 20, max: 28 }, accuracy: 52, attackInterval: 2200,
            unlockRequirement: { type: 'level', value: 5 }, isUnlocked: false
        },
        dark_acolyte: {
            id: 'dark_acolyte', name: 'Dark Acolyte', levelRequirement: 6,
            baseStats: { hp: 120, damage: 16, critChance: 9, evasion: 10 },
            possibleStatusEffects: [{ effectId: 'bleed', chance: 0.15, duration: 4 }],
            onHitEffects: [{ effectId: 'bleed', chance: 0.15, duration: 4 }],
            goldDropRange: { min: 24, max: 34 }, accuracy: 55, attackInterval: 1800,
            unlockRequirement: { type: 'level', value: 6 }, isUnlocked: false
        },
        orc_warrior: {
            id: 'orc_warrior', name: 'Orc Warrior', levelRequirement: 7,
            baseStats: { hp: 190, damage: 15, critChance: 7, evasion: 5 },
            possibleStatusEffects: [], goldDropRange: { min: 28, max: 40 }, accuracy: 54, attackInterval: 2400,
            unlockRequirement: { type: 'level', value: 7 }, isUnlocked: false
        },
        rogue_assassin: {
            id: 'rogue_assassin', name: 'Rogue Assassin', levelRequirement: 8,
            baseStats: { hp: 140, damage: 18, critChance: 20, evasion: 22 },
            possibleStatusEffects: [{ effectId: 'exposed', chance: 0.22, duration: 4 }],
            onHitEffects: [{ effectId: 'exposed', chance: 0.22, duration: 4 }],
            goldDropRange: { min: 32, max: 46 }, accuracy: 62, attackInterval: 1500,
            unlockRequirement: { type: 'level', value: 8 }, isUnlocked: false
        },
        forest_troll: {
            id: 'forest_troll', name: 'Forest Troll', levelRequirement: 9,
            baseStats: { hp: 260, damage: 17, critChance: 8, evasion: 4 },
            possibleStatusEffects: [], goldDropRange: { min: 36, max: 52 }, accuracy: 56, attackInterval: 2500,
            unlockRequirement: { type: 'level', value: 9 }, isUnlocked: false
        },
        necromancer: {
            id: 'necromancer', name: 'Necromancer', levelRequirement: 10,
            baseStats: { hp: 180, damage: 20, critChance: 12, evasion: 10 },
            possibleStatusEffects: [{ effectId: 'poison', chance: 0.22, duration: 5 }],
            onHitEffects: [{ effectId: 'poison', chance: 0.22, duration: 5 }],
            goldDropRange: { min: 45, max: 62 }, accuracy: 60, attackInterval: 1850,
            unlockRequirement: { type: 'level', value: 10 }, isUnlocked: false
        },
        war_brute: {
            id: 'war_brute', name: 'War Brute', levelRequirement: 11,
            baseStats: { hp: 220, damage: 25, critChance: 9, evasion: 6 },
            possibleStatusEffects: [], goldDropRange: { min: 52, max: 74 }, accuracy: 58, attackInterval: 2300,
            unlockRequirement: { type: 'level', value: 11 }, isUnlocked: false
        },
        shadow_knight: {
            id: 'shadow_knight', name: 'Shadow Knight', levelRequirement: 12,
            baseStats: { hp: 240, damage: 24, critChance: 14, evasion: 14 },
            possibleStatusEffects: [{ effectId: 'exposed', chance: 0.18, duration: 5 }],
            onHitEffects: [{ effectId: 'exposed', chance: 0.18, duration: 5 }],
            goldDropRange: { min: 70, max: 100 }, accuracy: 65, attackInterval: 1750,
            unlockRequirement: { type: 'kills', enemyId: 'war_brute', value: 8 }, isUnlocked: false
        }
    },

    MISSIONS: [
        {
            id: 'goblin_forest', name: 'Goblin Forest', description: 'Push through goblin scouts and break their ambush lines.', levelRequirement: 1,
            areaModifier: { type: 'player_stat', stat: 'evasion', value: -0.05 },
            waves: [{ enemyId: 'goblin', count: 3 }, { enemyId: 'goblin_archer', count: 2 }, { enemyId: 'bandit', count: 1 }],
            reward: { gold: 120, xp: 80, possibleItemDrop: 'a2' }, unlockRequirement: { type: 'level', value: 1 }
        },
        {
            id: 'wolf_den', name: 'Wolf Den', description: 'Cull the pack before the alpha tears through the frontier.', levelRequirement: 3,
            areaModifier: { type: 'enemy_stat', stat: 'critChance', value: 0.1 },
            waves: [{ enemyId: 'wolf', count: 3 }, { enemyId: 'bandit', count: 1 }, { enemyId: 'rogue_assassin', count: 1 }],
            reward: { gold: 170, xp: 130, possibleItemDrop: 'c2' }, unlockRequirement: { type: 'level', value: 3 }
        },
        {
            id: 'bandit_camp', name: 'Bandit Camp', description: 'Raid fortified tents and defeat the camp enforcer.', levelRequirement: 5,
            areaModifier: { type: 'player_stat', stat: 'damageReduction', value: -5 },
            waves: [{ enemyId: 'bandit', count: 3 }, { enemyId: 'goblin_archer', count: 2 }, { enemyId: 'orc_warrior', count: 1 }],
            reward: { gold: 260, xp: 220, possibleItemDrop: 'w3' }, unlockRequirement: { type: 'level', value: 5 }
        },
        {
            id: 'haunted_graveyard', name: 'Haunted Graveyard', description: 'Survive cursed undead waves led by a venomous caster.', levelRequirement: 6,
            areaModifier: { type: 'enemy_status', effectId: 'poison', chance: 0.2 },
            waves: [{ enemyId: 'skeleton', count: 3 }, { enemyId: 'dark_acolyte', count: 2 }, { enemyId: 'necromancer', count: 1 }],
            reward: { gold: 330, xp: 300, possibleItemDrop: 'a3' }, unlockRequirement: { type: 'level', value: 6 }
        },
        {
            id: 'orc_stronghold', name: 'Orc Stronghold', description: 'Clash with heavy infantry and face their siege commander.', levelRequirement: 8,
            areaModifier: { type: 'enemy_stat', stat: 'hp', value: 0.15 },
            waves: [{ enemyId: 'orc_warrior', count: 3 }, { enemyId: 'war_brute', count: 2 }, { enemyId: 'shadow_knight', count: 1 }],
            reward: { gold: 520, xp: 420, possibleItemDrop: 'w4' }, unlockRequirement: { type: 'level', value: 8 }
        },
        {
            id: 'dark_ruins', name: 'Dark Ruins', description: 'Fight through ruin guardians in a zone that weakens recovery.', levelRequirement: 10,
            areaModifier: { type: 'healing_modifier', value: -0.1 },
            waves: [{ enemyId: 'necromancer', count: 2 }, { enemyId: 'forest_troll', count: 2 }, { enemyId: 'shadow_knight', count: 1 }],
            reward: { gold: 700, xp: 560, possibleItemDrop: 'w5' }, unlockRequirement: { type: 'level', value: 10 }
        }
    ],

    EQUIPMENT: {
        weapons: [
            { id: 'w1', name: 'Rusty Dagger', slot: 'weapon', baseStats: { minHit: 2, maxHit: 5 }, rarity: 'common', cost: 0, unlocked: false },
            { id: 'w2', name: 'Iron Sword', slot: 'weapon', baseStats: { minHit: 6, maxHit: 12 }, rarity: 'common', cost: 160, unlocked: false },
            { id: 'w3', name: 'Steel Blade', slot: 'weapon', baseStats: { minHit: 13, maxHit: 24 }, rarity: 'common', cost: 520, unlocked: false },
            { id: 'w4', name: 'Enchanted Saber', slot: 'weapon', baseStats: { minHit: 23, maxHit: 38 }, rarity: 'common', cost: 1300, unlocked: false, onHitEffects: [{ effectId: 'bleed', chance: 0.2, duration: 4 }] },
            { id: 'w5', name: 'Dragonfang', slot: 'weapon', baseStats: { minHit: 45, maxHit: 70 }, rarity: 'common', cost: 2900, unlocked: false }
        ],
        armor: [
            { id: 'a1', name: 'Leather Armor', slot: 'armor', baseStats: { damageReduction: 0 }, rarity: 'common', cost: 0, unlocked: false },
            { id: 'a2', name: 'Chainmail', slot: 'armor', baseStats: { damageReduction: 9 }, rarity: 'common', cost: 190, unlocked: false },
            { id: 'a3', name: 'Steel Plate', slot: 'armor', baseStats: { damageReduction: 20 }, rarity: 'common', cost: 650, unlocked: false },
            { id: 'a4', name: 'Shadow Cloak', slot: 'armor', baseStats: { damageReduction: 32 }, rarity: 'common', cost: 1400, unlocked: false },
            { id: 'a5', name: 'Guardian Plate', slot: 'armor', baseStats: { damageReduction: 48 }, rarity: 'common', cost: 3200, unlocked: false }
        ],
        charms: [
            { id: 'c1', name: 'Lucky Charm', slot: 'charm', baseStats: { accuracy: 6, evasion: 2 }, rarity: 'common', cost: 0, unlocked: false },
            { id: 'c2', name: 'Swift Emblem', slot: 'charm', baseStats: { accuracy: 12, evasion: 6 }, rarity: 'common', cost: 180, unlocked: false },
            { id: 'c3', name: 'Vampire Sigil', slot: 'charm', baseStats: { accuracy: 16, evasion: 8 }, rarity: 'common', cost: 480, unlocked: false },
            { id: 'c4', name: 'Evasion Band', slot: 'charm', baseStats: { accuracy: 8, evasion: 18 }, rarity: 'common', cost: 920, unlocked: false },
            { id: 'c5', name: 'War Talisman', slot: 'charm', baseStats: { accuracy: 24, evasion: 12 }, rarity: 'common', cost: 1800, unlocked: false }
        ]
    }
};
