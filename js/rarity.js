// Centralized rarity registry and helpers.
// Keep all multipliers and rarity metadata here so combat/shop remain decoupled.
export const RARITIES = {
    common: {
        id: 'common',
        name: 'Common',
        multiplier: 1.0,
        color: '#cccccc'
    },
    uncommon: {
        id: 'uncommon',
        name: 'Uncommon',
        multiplier: 1.1,
        color: '#4caf50'
    },
    rare: {
        id: 'rare',
        name: 'Rare',
        multiplier: 1.25,
        color: '#2196f3'
    },
    epic: {
        id: 'epic',
        name: 'Epic',
        multiplier: 1.5,
        color: '#9c27b0'
    },
    legendary: {
        id: 'legendary',
        name: 'Legendary',
        multiplier: 2.0,
        color: '#ff9800'
    }
};

const RARITY_ROLL_TABLE = [
    { id: 'common', weight: 50 },
    { id: 'uncommon', weight: 25 },
    { id: 'rare', weight: 15 },
    { id: 'epic', weight: 8 },
    { id: 'legendary', weight: 2 }
];

const LEGACY_STAT_KEYS = ['minHit', 'maxHit', 'damageReduction', 'accuracy', 'evasion'];

function toSafeNumber(value) {
    if (!Number.isFinite(value)) return 0;
    return value;
}

export function normalizeRarityId(rarityId) {
    if (typeof rarityId !== 'string') return 'common';
    const key = rarityId.trim().toLowerCase();
    return RARITIES[key] ? key : 'common';
}

export function getRarityDefinition(rarityId) {
    const key = normalizeRarityId(rarityId);
    return RARITIES[key];
}

export function rollRarity() {
    const totalWeight = RARITY_ROLL_TABLE.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of RARITY_ROLL_TABLE) {
        roll -= entry.weight;
        if (roll <= 0) {
            return entry.id;
        }
    }

    return 'common';
}

export function normalizeItemBaseStats(item) {
    if (!item || typeof item !== 'object') return;

    if (!item.baseStats || typeof item.baseStats !== 'object' || Array.isArray(item.baseStats)) {
        item.baseStats = {};
    }

    LEGACY_STAT_KEYS.forEach(key => {
        if (Number.isFinite(item.baseStats[key])) return;
        if (!Number.isFinite(item[key])) return;
        item.baseStats[key] = item[key];
    });
}

export function calculateItemStats(item) {
    if (!item || typeof item !== 'object') return {};

    const rarity = getRarityDefinition(item.rarity);
    const multiplier = Number.isFinite(rarity.multiplier) ? rarity.multiplier : 1;

    const baseStats = (item.baseStats && typeof item.baseStats === 'object' && !Array.isArray(item.baseStats))
        ? item.baseStats
        : LEGACY_STAT_KEYS.reduce((stats, key) => {
            if (Number.isFinite(item[key])) {
                stats[key] = item[key];
            }
            return stats;
        }, {});

    return Object.entries(baseStats).reduce((stats, [key, rawValue]) => {
        const safeBase = toSafeNumber(rawValue);
        const scaled = Math.max(0, safeBase * multiplier);

        // Keep combat-relevant stats integer-friendly.
        if (Number.isInteger(safeBase)) {
            stats[key] = Math.round(scaled);
            return stats;
        }

        stats[key] = Math.round(scaled * 1000) / 1000;
        return stats;
    }, {});
}
