import { CONFIG } from './config.js';
import { GameState } from './state.js';
import * as Economy from './economy.js';
import {
    calculateItemStats,
    getRarityDefinition,
    normalizeItemBaseStats,
    normalizeRarityId,
    rollRarity
} from './rarity.js';

const SLOT_TO_STATE_KEY = {
    weapon: 'weaponId',
    armor: 'armorId',
    charm: 'charmId'
};

const STARTER_ITEM_IDS = new Set(['w1', 'a1', 'c1']);

function forEachEquipmentItem(callback) {
    CONFIG.EQUIPMENT.weapons.forEach(item => callback(item, 'weapon'));
    CONFIG.EQUIPMENT.armor.forEach(item => callback(item, 'armor'));
    CONFIG.EQUIPMENT.charms.forEach(item => callback(item, 'charm'));
}

function getAllEquipmentItems() {
    return [
        ...CONFIG.EQUIPMENT.weapons,
        ...CONFIG.EQUIPMENT.armor,
        ...CONFIG.EQUIPMENT.charms
    ];
}

function getRawItemById(itemId) {
    if (!itemId) return null;
    return getAllEquipmentItems().find(item => item.id === itemId) || null;
}

export function normalizeShopState() {
    if (!GameState.shop || typeof GameState.shop !== 'object') {
        GameState.shop = { itemUnlocks: {}, itemRarities: {} };
    }
    if (!GameState.shop.itemUnlocks || typeof GameState.shop.itemUnlocks !== 'object' || Array.isArray(GameState.shop.itemUnlocks)) {
        GameState.shop.itemUnlocks = {};
    }
    if (!GameState.shop.itemRarities || typeof GameState.shop.itemRarities !== 'object' || Array.isArray(GameState.shop.itemRarities)) {
        GameState.shop.itemRarities = {};
    }

    forEachEquipmentItem((item, fallbackSlot) => {
        if (!item.slot || !SLOT_TO_STATE_KEY[item.slot]) {
            item.slot = fallbackSlot;
        }
        normalizeItemBaseStats(item);

        if (!Number.isFinite(item.cost) || item.cost < 0) {
            item.cost = 0;
        } else {
            item.cost = Math.floor(item.cost);
        }

        if (typeof item.unlocked !== 'boolean') {
            item.unlocked = false;
        }

        const stateKey = SLOT_TO_STATE_KEY[item.slot];
        const isEquipped = stateKey ? GameState.equipment[stateKey] === item.id : false;
        const savedUnlocked = GameState.shop.itemUnlocks[item.id];

        if (typeof savedUnlocked === 'boolean') {
            item.unlocked = savedUnlocked;
        } else {
            item.unlocked = !!(item.unlocked || isEquipped || STARTER_ITEM_IDS.has(item.id));
        }

        // Never allow an equipped item to be treated as locked.
        if (isEquipped && !item.unlocked) {
            item.unlocked = true;
        }

        const savedRarity = GameState.shop.itemRarities[item.id];
        const rarityFromItem = normalizeRarityId(item.rarity);
        const shouldRollInitialRarity = typeof savedRarity !== 'string';
        // First-time generated items roll rarity once, then persist in GameState.shop.itemRarities.
        const nextRarity = typeof savedRarity === 'string'
            ? normalizeRarityId(savedRarity)
            : (STARTER_ITEM_IDS.has(item.id) ? rarityFromItem : rollRarity());

        item.rarity = shouldRollInitialRarity ? nextRarity : normalizeRarityId(savedRarity);
        GameState.shop.itemUnlocks[item.id] = item.unlocked;
        GameState.shop.itemRarities[item.id] = item.rarity;
    });
}

export function onItemPurchased(item) {
    void item;
}

export function getShopItems() {
    normalizeShopState();
    return getAllEquipmentItems().map(item => {
        const rarity = normalizeRarityId(item.rarity);
        return {
            ...item,
            rarity,
            rarityInfo: getRarityDefinition(rarity),
            finalStats: calculateItemStats(item)
        };
    });
}

export function getItemById(itemId) {
    normalizeShopState();
    return getRawItemById(itemId);
}

export function isItemUnlocked(itemId) {
    const item = getItemById(itemId);
    return !!(item && item.unlocked);
}

export function purchaseItem(itemId) {
    const item = getItemById(itemId);
    if (!item) return false;
    if (item.unlocked) return false;

    const cost = Number.isFinite(item.cost) ? Math.max(0, Math.floor(item.cost)) : 0;
    if (cost > 0 && !Economy.spendGold?.(cost)) return false;

    item.unlocked = true;
    GameState.shop.itemUnlocks[item.id] = true;
    onItemPurchased(item);
    return true;
}

export function equipItem(itemId) {
    const item = getItemById(itemId);
    if (!item || !item.unlocked) return false;

    const stateKey = SLOT_TO_STATE_KEY[item.slot];
    if (!stateKey) return false;

    GameState.equipment[stateKey] = item.id;
    return true;
}

export function unlockItem(itemId) {
    const item = getItemById(itemId);
    if (!item) return false;
    if (item.unlocked) return false;

    item.unlocked = true;
    GameState.shop.itemUnlocks[item.id] = true;
    return true;
}

export function getSlotStateKey(slot) {
    return SLOT_TO_STATE_KEY[slot] || null;
}
