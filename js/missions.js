import { GameState } from './state.js';
import { CONFIG } from './config.js';
import * as Leveling from './leveling.js';
import * as Economy from './economy.js';
import * as StatusEffects from './statusEffects.js';
import { getScaledEnemy } from './enemies.js';

const DEFAULT_MISSION_STATE = {
    currentMissionId: null,
    currentWave: 0,
    accumulatedXp: 0,
    accumulatedGold: 0,
    missionProgress: {},
    lastResult: null
};

let missionStartedListener = null;
let missionWaveListener = null;
let missionCompletedListener = null;
let missionFailedListener = null;

const safeInt = (value, fallback = 0) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;

function getMissionById(id) { return (CONFIG.MISSIONS || []).find(m => m.id === id) || null; }

function getRequirementText(mission) {
    const levelReq = Math.max(1, safeInt(mission.levelRequirement || mission.unlockRequirement?.value || 1, 1));
    return `Requires Level ${levelReq}`;
}

function getAreaModifiers(mission) {
    if (Array.isArray(mission?.areaModifiers)) return mission.areaModifiers;
    return mission?.areaModifier ? [mission.areaModifier] : [];
}

function getAreaModifierTextFromModifier(mod) {
    if (!mod) return 'No area modifier';
    if (mod.type === 'enemy_status') return 'Enemies can apply poison';
    if (mod.type === 'healing_modifier') return `${mod.value < 0 ? '-' : '+'}${Math.abs(mod.value * 100).toFixed(0)}% healing`;
    const value = Math.abs(mod.value) <= 1 ? `${mod.value > 0 ? '+' : ''}${(mod.value * 100).toFixed(0)}%` : `${mod.value > 0 ? '+' : ''}${mod.value}`;
    const label = mod.type === 'enemy_stat' ? 'Enemy' : 'Player';
    return `${label} ${mod.stat}: ${value}`;
}

function getWavePlan(mission) {
    if (Array.isArray(mission?.waves) && mission.waves.length && typeof mission.waves[0] === 'object') {
        return mission.waves.flatMap((wave, index) => {
            const count = Math.max(1, safeInt(wave.count, 1));
            return Array.from({ length: count }, () => ({ enemyId: wave.enemyId, waveGroup: index + 1 }));
        }).filter(w => !!CONFIG.ENEMIES[w.enemyId]);
    }

    const total = Math.max(1, safeInt(mission?.waves, 1));
    const pool = Array.isArray(mission?.enemyPool) ? mission.enemyPool.filter(id => !!CONFIG.ENEMIES[id]) : [];
    return Array.from({ length: total }, (_, i) => ({ enemyId: pool[i % Math.max(1, pool.length)] }));
}

function applyMissionEnemy(enemyId) {
    const enemy = getScaledEnemy(enemyId, GameState.player.level) || CONFIG.ENEMIES[enemyId];
    if (!enemy) return false;
    GameState.enemy.id = enemyId;
    GameState.enemy.currentHp = enemy.hp;
    GameState.enemy.tickTimer = 0;
    GameState.enemy.activeEffects = [];
    StatusEffects.clearTemporaryEffects?.(GameState.enemy);
    return true;
}

export function normalizeMissionState() {
    if (!GameState.mission || typeof GameState.mission !== 'object' || Array.isArray(GameState.mission)) GameState.mission = { ...DEFAULT_MISSION_STATE };
    Object.entries(DEFAULT_MISSION_STATE).forEach(([k, v]) => {
        if (k === 'missionProgress') {
            if (!GameState.mission.missionProgress || typeof GameState.mission.missionProgress !== 'object') GameState.mission.missionProgress = {};
            return;
        }
        if (typeof GameState.mission[k] === 'undefined') GameState.mission[k] = v;
    });
}

export function isMissionUnlocked(mission) {
    const requiredLevel = Math.max(1, safeInt(mission.levelRequirement || mission.unlockRequirement?.value || 1, 1));
    return Math.max(1, safeInt(GameState.player.level, 1)) >= requiredLevel;
}

export function getCurrentMission() {
    normalizeMissionState();
    return getMissionById(GameState.mission.currentMissionId);
}

export function isMissionActive() { return !!getCurrentMission(); }

export function getActiveMissionSummary() {
    const mission = getCurrentMission();
    if (!mission) return { active: false, waveText: '', modifierText: '' };
    const plan = getWavePlan(mission);
    const totalWaves = Math.max(1, plan.length);
    return {
        active: true,
        missionId: mission.id,
        name: mission.name,
        wave: Math.max(1, safeInt(GameState.mission.currentWave, 1)),
        totalWaves,
        waveText: `Wave ${Math.max(1, safeInt(GameState.mission.currentWave, 1))}/${totalWaves}`,
        modifierText: getAreaModifiers(mission).map(getAreaModifierTextFromModifier).join(' | '),
        rewardText: `+${safeInt(mission.reward?.xp, 0)} XP | +${safeInt(mission.reward?.gold, 0)} Gold`
    };
}

export function getMissionsForUI() {
    normalizeMissionState();
    return (CONFIG.MISSIONS || []).map(mission => {
        const plan = getWavePlan(mission);
        const cleared = safeInt(GameState.mission.missionProgress?.[mission.id], 0);
        return {
            ...mission,
            waves: plan.length,
            unlocked: isMissionUnlocked(mission),
            active: mission.id === GameState.mission.currentMissionId,
            unlockRequirementText: getRequirementText(mission),
            areaModifierText: getAreaModifiers(mission).map(getAreaModifierTextFromModifier).join(' | '),
            rewardText: `+${safeInt(mission.reward?.xp, 0)} XP | +${safeInt(mission.reward?.gold, 0)} Gold${mission.reward?.possibleItemDrop ? ` | Drop: ${mission.reward.possibleItemDrop}` : ''}`,
            progressText: `Clears: ${cleared}`
        };
    });
}

export function applyAreaModifiersToStats({ targetType, stats }) {
    const mission = getCurrentMission();
    if (!mission || !stats) return { ...stats };
    return getAreaModifiers(mission).reduce((next, mod) => {
        if (!mod) return next;
        if ((mod.type === 'player_stat' && targetType !== 'player') || (mod.type === 'enemy_stat' && targetType !== 'enemy')) return next;
        if (!mod.stat || !(mod.stat in next)) return next;
        const current = Number(next[mod.stat]) || 0;
        const updated = Math.abs(mod.value) <= 1 ? current * (1 + mod.value) : current + mod.value;
        next[mod.stat] = Math.max(0, Number.isInteger(current) ? Math.round(updated) : updated);
        return next;
    }, { ...stats });
}

export function getRewardMultipliers() { return { xpMultiplier: 1, goldMultiplier: 1 }; }

export function progressWave(options = {}) {
    const mission = getCurrentMission();
    if (!mission) return { advanced: false, completed: false };
    const plan = getWavePlan(mission);
    const nextWave = safeInt(GameState.mission.currentWave, 0) + 1;
    if (nextWave > plan.length) return endMission({ reason: 'completed', silent: options.silent });

    GameState.mission.currentWave = nextWave;
    const entry = plan[nextWave - 1];
    if (!entry || !applyMissionEnemy(entry.enemyId)) return failMission({ reason: 'invalid_enemy_pool', silent: options.silent });

    missionWaveListener?.({ mission, currentWave: nextWave, totalWaves: plan.length, silent: !!options.silent });
    return { advanced: true, completed: false, mission, currentWave: nextWave, totalWaves: plan.length };
}

export function startMission(missionId, options = {}) {
    normalizeMissionState();
    const mission = getMissionById(missionId);
    if (!mission || !isMissionUnlocked(mission)) return false;

    GameState.mission.currentMissionId = mission.id;
    GameState.mission.currentWave = 0;
    GameState.mission.accumulatedXp = 0;
    GameState.mission.accumulatedGold = 0;
    GameState.mission.lastResult = null;

    const progressed = progressWave(options);
    if (progressed.failed) return false;
    missionStartedListener?.({ mission, currentWave: GameState.mission.currentWave, totalWaves: getWavePlan(mission).length, silent: !!options.silent });
    return true;
}

export function endMission({ reason = 'manual', silent = false } = {}) {
    const mission = getCurrentMission();
    if (!mission) return { ended: false, completed: false };

    const completed = reason === 'completed';
    const bonusGold = completed ? safeInt(mission.reward?.gold, 0) : 0;
    const bonusXp = completed ? safeInt(mission.reward?.xp, 0) : 0;
    if (bonusGold > 0) Economy.addGold?.(bonusGold);
    if (bonusXp > 0) Leveling.addXP?.(bonusXp);

    if (completed) {
        const clears = safeInt(GameState.mission.missionProgress[mission.id], 0);
        GameState.mission.missionProgress[mission.id] = clears + 1;
    }

    const result = {
        missionId: mission.id,
        missionName: mission.name,
        completed,
        reason,
        bonusXp,
        bonusGold,
        silent: !!silent
    };

    GameState.mission.currentMissionId = null;
    GameState.mission.currentWave = 0;
    GameState.mission.accumulatedXp = 0;
    GameState.mission.accumulatedGold = 0;
    GameState.mission.lastResult = result;

    if (completed) missionCompletedListener?.(result);
    if (reason === 'failed') missionFailedListener?.(result);
    return { ended: true, ...result };
}

export function failMission({ silent = false } = {}) { return endMission({ reason: 'failed', silent }); }

export function onEnemyDefeated({ xpGained = 0, goldGained = 0, silent = false } = {}) {
    const mission = getCurrentMission();
    if (!mission) return { missionActive: false };

    GameState.mission.accumulatedXp += safeInt(xpGained, 0);
    GameState.mission.accumulatedGold += safeInt(goldGained, 0);

    const plan = getWavePlan(mission);
    if (GameState.mission.currentWave >= plan.length) return endMission({ reason: 'completed', silent });
    return progressWave({ silent });
}

export function setMissionStartedListener(listener) { missionStartedListener = typeof listener === 'function' ? listener : null; }
export function setMissionWaveListener(listener) { missionWaveListener = typeof listener === 'function' ? listener : null; }
export function setMissionCompletedListener(listener) { missionCompletedListener = typeof listener === 'function' ? listener : null; }
export function setMissionFailedListener(listener) { missionFailedListener = typeof listener === 'function' ? listener : null; }
