import { CONFIG } from './config.js';
import { GameState } from './state.js';

let rewardHandlers = {
    gold: () => {},
    xp: () => {},
    equipment: () => {}
};

let achievementUnlockedListener = null;

function getSafeNumber(value, fallback = 0) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(0, Math.floor(value));
}

function getAchievementStateEntry(id) {
    if (!GameState.achievements || typeof GameState.achievements !== 'object' || Array.isArray(GameState.achievements)) {
        GameState.achievements = {};
    }

    if (!GameState.achievements[id] || typeof GameState.achievements[id] !== 'object') {
        GameState.achievements[id] = { current: 0, unlocked: false };
    }

    const entry = GameState.achievements[id];
    entry.current = getSafeNumber(entry.current, 0);
    entry.unlocked = !!entry.unlocked;
    return entry;
}

function getAchievementById(id) {
    return CONFIG.ACHIEVEMENTS.find(a => a.id === id) || null;
}

function applyAchievementReward(achievement) {
    const reward = achievement.reward || {};
    if (!reward.type) return;

    if (reward.type === 'gold') {
        rewardHandlers.gold(getSafeNumber(reward.amount, 0));
        return;
    }

    if (reward.type === 'xp') {
        rewardHandlers.xp(getSafeNumber(reward.amount, 0));
        return;
    }

    if (reward.type === 'equipment') {
        rewardHandlers.equipment(reward.itemId || reward.amount || '');
    }
}

function unlockAchievement(achievement, entry) {
    if (entry.unlocked) return false;

    entry.unlocked = true;
    entry.current = Math.max(entry.current, getSafeNumber(achievement.target, 0));
    applyAchievementReward(achievement);
    onAchievementUnlocked({
        ...achievement,
        current: entry.current,
        unlocked: true
    });
    return true;
}

function updateAchievementProgress(achievement, nextValue) {
    const entry = getAchievementStateEntry(achievement.id);
    if (entry.unlocked) return false;

    entry.current = Math.max(0, Math.floor(nextValue));
    if (entry.current >= getSafeNumber(achievement.target, 0)) {
        return unlockAchievement(achievement, entry);
    }
    return false;
}

function incrementAchievementProgress(achievement, amount) {
    const entry = getAchievementStateEntry(achievement.id);
    if (entry.unlocked) return false;

    entry.current += getSafeNumber(amount, 0);
    if (entry.current >= getSafeNumber(achievement.target, 0)) {
        return unlockAchievement(achievement, entry);
    }
    return false;
}

export function configureAchievementRewardHandlers(handlers) {
    rewardHandlers = {
        gold: typeof handlers?.gold === 'function' ? handlers.gold : () => {},
        xp: typeof handlers?.xp === 'function' ? handlers.xp : () => {},
        equipment: typeof handlers?.equipment === 'function' ? handlers.equipment : () => {}
    };
}

export function setAchievementUnlockedListener(listener) {
    achievementUnlockedListener = typeof listener === 'function' ? listener : null;
}

export function onAchievementUnlocked(achievement) {
    if (achievementUnlockedListener) {
        achievementUnlockedListener(achievement);
    }
}

export function normalizeAchievementsState() {
    if (!GameState.achievements || typeof GameState.achievements !== 'object' || Array.isArray(GameState.achievements)) {
        GameState.achievements = {};
    }

    CONFIG.ACHIEVEMENTS.forEach(achievement => {
        const entry = getAchievementStateEntry(achievement.id);
        if (typeof entry.current !== 'number') {
            entry.current = getSafeNumber(achievement.current, 0);
        }
        if (typeof entry.unlocked !== 'boolean') {
            entry.unlocked = !!achievement.unlocked;
        }
        entry.current = getSafeNumber(entry.current, getSafeNumber(achievement.current, 0));
        entry.unlocked = !!entry.unlocked;
    });
}

export function getAchievementProgressText(achievement) {
    if (achievement.type === 'time_played') {
        const current = achievement.current;
        const target = achievement.target;
        return `${Math.floor(current / 60)}m / ${Math.floor(target / 60)}m`;
    }
    return `${achievement.current} / ${achievement.target}`;
}

export function getAchievements() {
    normalizeAchievementsState();
    return CONFIG.ACHIEVEMENTS.map(def => {
        const entry = getAchievementStateEntry(def.id);
        return {
            ...def,
            current: entry.current,
            unlocked: entry.unlocked
        };
    });
}

export function onEnemyDefeated(enemy) {
    void enemy;
    let changed = false;
    CONFIG.ACHIEVEMENTS.forEach(achievement => {
        if (achievement.type !== 'kill') return;
        changed = incrementAchievementProgress(achievement, 1) || changed;
    });
    return changed;
}

export function onLevelUp(level) {
    let changed = false;
    const safeLevel = getSafeNumber(level, 1);
    CONFIG.ACHIEVEMENTS.forEach(achievement => {
        if (achievement.type !== 'level') return;
        changed = updateAchievementProgress(achievement, safeLevel) || changed;
    });
    return changed;
}

export function onXPGained(amount) {
    let changed = false;
    const safeAmount = getSafeNumber(amount, 0);
    if (safeAmount <= 0) return false;

    CONFIG.ACHIEVEMENTS.forEach(achievement => {
        if (achievement.type !== 'xp') return;
        changed = incrementAchievementProgress(achievement, safeAmount) || changed;
    });
    return changed;
}

export function onGoldGained(amount) {
    let changed = false;
    const safeAmount = getSafeNumber(amount, 0);
    if (safeAmount <= 0) return false;

    CONFIG.ACHIEVEMENTS.forEach(achievement => {
        if (achievement.type !== 'gold') return;
        changed = incrementAchievementProgress(achievement, safeAmount) || changed;
    });
    return changed;
}

export function onTimePlayed(seconds) {
    let changed = false;
    const safeSeconds = getSafeNumber(seconds, 0);
    if (safeSeconds <= 0) return false;

    CONFIG.ACHIEVEMENTS.forEach(achievement => {
        if (achievement.type !== 'time_played') return;
        changed = incrementAchievementProgress(achievement, safeSeconds) || changed;
    });
    return changed;
}
