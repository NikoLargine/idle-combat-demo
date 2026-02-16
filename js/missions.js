import { GameState } from './state.js';
import { CONFIG } from './config.js';
import * as Leveling from './leveling.js';
import * as Economy from './economy.js';
import * as StatusEffects from './statusEffects.js';

const DEFAULT_MISSION_STATE = {
    currentMissionId: null,
    currentWave: 0,
    accumulatedXp: 0,
    accumulatedGold: 0,
    lastResult: null
};

let missionStartedListener = null;
let missionWaveListener = null;
let missionCompletedListener = null;
let missionFailedListener = null;

function getSafeNumber(value, fallback = 0) {
    if (!Number.isFinite(value)) return fallback;
    return value;
}

function getSafeInt(value, fallback = 0) {
    return Math.max(0, Math.floor(getSafeNumber(value, fallback)));
}

function toPercentText(value) {
    return `${(value * 100).toFixed(0)}%`;
}

function getAreaModifiers(mission) {
    if (!mission || typeof mission !== 'object') return [];
    if (Array.isArray(mission.areaModifiers)) {
        return mission.areaModifiers.filter(Boolean);
    }
    if (mission.areaModifier && typeof mission.areaModifier === 'object') {
        return [mission.areaModifier];
    }
    return [];
}

function getRequirementText(requirement) {
    if (!requirement || typeof requirement !== 'object') return 'Locked';
    if (requirement.type === 'level') {
        return `Reach Level ${Math.max(1, Math.floor(requirement.value || 1))}`;
    }
    return 'Locked';
}

function getRewardText(reward) {
    if (!reward || typeof reward !== 'object') return 'No bonus reward';
    const parts = [];
    const gold = getSafeInt(reward.gold, 0);
    const xpBonusPercent = getSafeNumber(reward.xpBonusPercent, 0);

    if (gold > 0) {
        parts.push(`${gold} Gold`);
    }
    if (xpBonusPercent > 0) {
        parts.push(`+${toPercentText(xpBonusPercent)} mission XP bonus`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'No bonus reward';
}

function getAreaModifierTextFromModifier(modifier) {
    if (!modifier || typeof modifier !== 'object') return 'No area modifier';
    if (modifier.type === 'xp_multiplier') {
        const value = getSafeNumber(modifier.value, 0);
        const prefix = value >= 0 ? '+' : '';
        return `XP Gain: ${prefix}${toPercentText(value)}`;
    }
    if (modifier.type === 'gold_multiplier') {
        const value = getSafeNumber(modifier.value, 0);
        const prefix = value >= 0 ? '+' : '';
        return `Gold Gain: ${prefix}${toPercentText(value)}`;
    }

    const stat = modifier.stat || 'Stat';
    const value = getSafeNumber(modifier.value, 0);
    const isPercent = Math.abs(value) <= 1;
    const prefix = value >= 0 ? '+' : '';
    const amountText = isPercent ? `${prefix}${toPercentText(value)}` : `${prefix}${value}`;
    const targetLabel = modifier.type === 'enemy_stat' ? 'Enemies' : 'Player';
    return `${targetLabel}: ${amountText} ${stat}`;
}

function getAreaModifierText(mission) {
    const entries = getAreaModifiers(mission);
    if (!entries.length) return 'No area modifier';
    return entries.map(getAreaModifierTextFromModifier).join(' | ');
}

function chooseEnemyFromPool(mission) {
    const validIds = (mission.enemyPool || []).filter(enemyId => !!CONFIG.ENEMIES[enemyId]);
    if (!validIds.length) return null;
    const randomIndex = Math.floor(Math.random() * validIds.length);
    return validIds[randomIndex];
}

function applyMissionEnemy(enemyId) {
    const enemy = CONFIG.ENEMIES[enemyId];
    if (!enemy) return false;

    GameState.enemy.id = enemyId;
    GameState.enemy.currentHp = enemy.hp;
    GameState.enemy.tickTimer = 0;
    GameState.enemy.activeEffects = [];
    StatusEffects.clearTemporaryEffects?.(GameState.enemy);
    return true;
}

function getMissionById(missionId) {
    if (!missionId) return null;
    return (CONFIG.MISSIONS || []).find(mission => mission.id === missionId) || null;
}

function getCurrentMissionStateEntry() {
    normalizeMissionState();
    return GameState.mission;
}

function onMissionStarted(payload) {
    if (typeof missionStartedListener === 'function') {
        missionStartedListener(payload);
    }
}

function onMissionWave(payload) {
    if (typeof missionWaveListener === 'function') {
        missionWaveListener(payload);
    }
}

function onMissionCompleted(payload) {
    if (typeof missionCompletedListener === 'function') {
        missionCompletedListener(payload);
    }
}

function onMissionFailed(payload) {
    if (typeof missionFailedListener === 'function') {
        missionFailedListener(payload);
    }
}

export function normalizeMissionState() {
    if (!GameState.mission || typeof GameState.mission !== 'object' || Array.isArray(GameState.mission)) {
        GameState.mission = { ...DEFAULT_MISSION_STATE };
    }

    const state = GameState.mission;
    state.currentMissionId = typeof state.currentMissionId === 'string' ? state.currentMissionId : null;
    state.currentWave = getSafeInt(state.currentWave, 0);
    state.accumulatedXp = getSafeInt(state.accumulatedXp, 0);
    state.accumulatedGold = getSafeInt(state.accumulatedGold, 0);
    if (!state.lastResult || typeof state.lastResult !== 'object') {
        state.lastResult = null;
    }

    if (!state.currentMissionId) return;
    const mission = getMissionById(state.currentMissionId);
    if (!mission) {
        state.currentMissionId = null;
        state.currentWave = 0;
        state.accumulatedXp = 0;
        state.accumulatedGold = 0;
        return;
    }

    const safeWaves = Math.max(1, getSafeInt(mission.waves, 1));
    if (state.currentWave <= 0) {
        state.currentWave = 1;
    }
    if (state.currentWave > safeWaves) {
        state.currentWave = safeWaves;
    }

    if (!mission.enemyPool.includes(GameState.enemy.id)) {
        const replacementEnemy = chooseEnemyFromPool(mission);
        if (replacementEnemy) {
            applyMissionEnemy(replacementEnemy);
        } else {
            state.currentMissionId = null;
            state.currentWave = 0;
            state.accumulatedXp = 0;
            state.accumulatedGold = 0;
        }
    }
}

export function isMissionUnlocked(mission) {
    if (!mission || typeof mission !== 'object') return false;
    const requirement = mission.unlockRequirement;
    if (!requirement || typeof requirement !== 'object') return true;

    if (requirement.type === 'level') {
        const neededLevel = Math.max(1, Math.floor(requirement.value || 1));
        return Math.max(1, Math.floor(GameState.player.level || 1)) >= neededLevel;
    }

    return false;
}

export function getCurrentMission() {
    normalizeMissionState();
    return getMissionById(GameState.mission.currentMissionId);
}

export function isMissionActive() {
    return !!getCurrentMission();
}

export function getActiveMissionSummary() {
    const mission = getCurrentMission();
    if (!mission) {
        return {
            active: false,
            text: 'Free Fight Mode',
            waveText: '',
            modifierText: ''
        };
    }

    const safeWave = Math.max(0, getSafeInt(GameState.mission.currentWave, 0));
    const totalWaves = Math.max(1, getSafeInt(mission.waves, 1));
    return {
        active: true,
        missionId: mission.id,
        name: mission.name,
        wave: safeWave,
        totalWaves,
        waveText: `Wave ${safeWave}/${totalWaves}`,
        modifierText: getAreaModifierText(mission),
        rewardText: getRewardText(mission.reward)
    };
}

export function getMissionsForUI() {
    normalizeMissionState();
    const activeMissionId = GameState.mission.currentMissionId;

    return (CONFIG.MISSIONS || []).map(mission => {
        const unlocked = isMissionUnlocked(mission);
        const totalWaves = Math.max(1, getSafeInt(mission.waves, 1));
        return {
            ...mission,
            waves: totalWaves,
            unlocked,
            active: mission.id === activeMissionId,
            unlockRequirementText: getRequirementText(mission.unlockRequirement),
            areaModifierText: getAreaModifierText(mission),
            rewardText: getRewardText(mission.reward)
        };
    });
}

export function applyAreaModifiersToStats({ targetType, stats }) {
    if (!stats || typeof stats !== 'object') return stats;
    const mission = getCurrentMission();
    if (!mission) return { ...stats };

    return getAreaModifiers(mission).reduce((nextStats, modifier) => {
        if (!modifier || typeof modifier !== 'object') return nextStats;
        if ((modifier.type === 'player_stat' && targetType !== 'player') ||
            (modifier.type === 'enemy_stat' && targetType !== 'enemy')) {
            return nextStats;
        }

        const stat = modifier.stat;
        if (!stat || !(stat in nextStats)) return nextStats;

        const currentValue = getSafeNumber(nextStats[stat], 0);
        const value = getSafeNumber(modifier.value, 0);
        const modified = Math.abs(value) <= 1
            ? currentValue * (1 + value)
            : currentValue + value;

        return {
            ...nextStats,
            [stat]: Math.max(0, Number.isInteger(currentValue) ? Math.round(modified) : modified)
        };
    }, { ...stats });
}

export function getRewardMultipliers() {
    const mission = getCurrentMission();
    if (!mission) {
        return { xpMultiplier: 1, goldMultiplier: 1 };
    }

    return getAreaModifiers(mission).reduce((multipliers, modifier) => {
        if (!modifier || typeof modifier !== 'object') return multipliers;
        const value = getSafeNumber(modifier.value, 0);
        if (modifier.type === 'xp_multiplier') {
            multipliers.xpMultiplier = Math.max(0, multipliers.xpMultiplier * (1 + value));
        }
        if (modifier.type === 'gold_multiplier') {
            multipliers.goldMultiplier = Math.max(0, multipliers.goldMultiplier * (1 + value));
        }
        return multipliers;
    }, { xpMultiplier: 1, goldMultiplier: 1 });
}

export function progressWave(options = {}) {
    const mission = getCurrentMission();
    if (!mission) return { advanced: false, completed: false };

    const totalWaves = Math.max(1, getSafeInt(mission.waves, 1));
    const state = getCurrentMissionStateEntry();

    if (state.currentWave >= totalWaves) {
        return endMission({ reason: 'completed', silent: options.silent });
    }

    state.currentWave += 1;
    const nextEnemyId = chooseEnemyFromPool(mission);
    if (!nextEnemyId) {
        return failMission({ reason: 'invalid_enemy_pool', silent: options.silent });
    }

    applyMissionEnemy(nextEnemyId);
    onMissionWave({
        silent: !!options.silent,
        mission,
        currentWave: state.currentWave,
        totalWaves
    });

    return {
        advanced: true,
        completed: false,
        mission,
        currentWave: state.currentWave,
        totalWaves
    };
}

export function startMission(missionId, options = {}) {
    normalizeMissionState();

    const mission = getMissionById(missionId);
    if (!mission) return false;
    if (!isMissionUnlocked(mission)) return false;

    const state = getCurrentMissionStateEntry();
    state.currentMissionId = mission.id;
    state.currentWave = 0;
    state.accumulatedXp = 0;
    state.accumulatedGold = 0;
    state.lastResult = null;

    GameState.player.tickTimer = 0;
    GameState.enemy.tickTimer = 0;
    StatusEffects.clearTemporaryEffects?.(GameState.enemy);

    const progressed = progressWave(options);
    if (progressed.failed) return false;

    onMissionStarted({
        silent: !!options.silent,
        mission,
        currentWave: GameState.mission.currentWave,
        totalWaves: Math.max(1, getSafeInt(mission.waves, 1))
    });
    return true;
}

export function endMission({ reason = 'manual', silent = false } = {}) {
    const mission = getCurrentMission();
    if (!mission) {
        return { ended: false, completed: false };
    }

    const state = getCurrentMissionStateEntry();
    const totalWaves = Math.max(1, getSafeInt(mission.waves, 1));
    const completed = reason === 'completed' || state.currentWave >= totalWaves;
    const baseRewardGold = getSafeInt(mission.reward?.gold, 0);
    const xpBonusPercent = Math.max(0, getSafeNumber(mission.reward?.xpBonusPercent, 0));
    const xpBonus = completed ? Math.floor(state.accumulatedXp * xpBonusPercent) : 0;
    const goldBonus = completed ? baseRewardGold : 0;

    if (goldBonus > 0) {
        Economy.addGold?.(goldBonus);
    }
    if (xpBonus > 0) {
        Leveling.addXP?.(xpBonus);
    }

    const result = {
        missionId: mission.id,
        missionName: mission.name,
        reason,
        completed,
        waveReached: state.currentWave,
        totalWaves,
        accumulatedXp: state.accumulatedXp,
        accumulatedGold: state.accumulatedGold,
        bonusXp: xpBonus,
        bonusGold: goldBonus,
        silent: !!silent
    };

    state.currentMissionId = null;
    state.currentWave = 0;
    state.accumulatedXp = 0;
    state.accumulatedGold = 0;
    state.lastResult = result;

    if (completed) {
        onMissionCompleted(result);
    } else if (reason === 'failed') {
        onMissionFailed(result);
    }

    return {
        ended: true,
        completed,
        failed: reason === 'failed',
        ...result
    };
}

export function failMission({ reason = 'failed', silent = false } = {}) {
    const mission = getCurrentMission();
    if (!mission) {
        return { ended: false, failed: false };
    }
    void reason;
    return endMission({ reason: 'failed', silent });
}

export function onEnemyDefeated({ xpGained = 0, goldGained = 0, silent = false } = {}) {
    const mission = getCurrentMission();
    if (!mission) return { missionActive: false };

    const state = getCurrentMissionStateEntry();
    state.accumulatedXp += getSafeInt(xpGained, 0);
    state.accumulatedGold += getSafeInt(goldGained, 0);

    const totalWaves = Math.max(1, getSafeInt(mission.waves, 1));
    if (state.currentWave >= totalWaves) {
        return endMission({ reason: 'completed', silent });
    }

    return progressWave({ silent });
}

export function setMissionStartedListener(listener) {
    missionStartedListener = typeof listener === 'function' ? listener : null;
}

export function setMissionWaveListener(listener) {
    missionWaveListener = typeof listener === 'function' ? listener : null;
}

export function setMissionCompletedListener(listener) {
    missionCompletedListener = typeof listener === 'function' ? listener : null;
}

export function setMissionFailedListener(listener) {
    missionFailedListener = typeof listener === 'function' ? listener : null;
}

