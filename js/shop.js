import { CONFIG } from './config.js';
import { GameState } from './state.js';
import * as Economy from './economy.js';

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

export function normalizeShopState() {
    if (!GameState.shop || typeof GameState.shop !== 'object') {
        GameState.shop = { itemUnlocks: {} };
    }
    if (!GameState.shop.itemUnlocks || typeof GameState.shop.itemUnlocks !== 'object' || Array.isArray(GameState.shop.itemUnlocks)) {
        GameState.shop.itemUnlocks = {};
    }

    forEachEquipmentItem((item, fallbackSlot) => {
        if (!item.slot || !SLOT_TO_STATE_KEY[item.slot]) {
            item.slot = fallbackSlot;
        }

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

        GameState.shop.itemUnlocks[item.id] = item.unlocked;
    });
}

export function onItemPurchased(item) {
    void item;
}

export function getShopItems() {
    normalizeShopState();
    return [
        ...CONFIG.EQUIPMENT.weapons,
        ...CONFIG.EQUIPMENT.armor,
        ...CONFIG.EQUIPMENT.charms
    ];
}

export function getItemById(itemId) {
    if (!itemId) return null;
    return getShopItems().find(item => item.id === itemId) || null;
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
