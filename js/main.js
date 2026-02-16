import { GameState } from './state.js';
import { CombatEngine } from './combat.js';
import { Persistence } from './persistence.js';
import { UI } from './ui.js';
import { CONFIG } from './config.js';
import * as Shop from './shop.js';
import * as Economy from './economy.js';
import * as Leveling from './leveling.js';
import * as Achievements from './achievements.js';
import * as Skills from './skills.js';
import * as StatusEffects from './statusEffects.js';
import * as Missions from './missions.js';

document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = Array.from(document.querySelectorAll('.tab[data-tab-target]'));
    const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));

    const activateTab = (tabId) => {
        tabButtons.forEach(button => {
            const isActive = button.dataset.tabTarget === tabId;
            button.classList.toggle('tab-active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        tabPanels.forEach(panel => {
            panel.classList.toggle('tab-visible', panel.id === tabId);
        });
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tabTarget;
            if (!tabId) return;
            activateTab(tabId);
        });
    });

    activateTab('tab-shop');

    Achievements.configureAchievementRewardHandlers?.({
        gold: amount => Economy.addGold?.(amount),
        xp: amount => Leveling.addXP?.(amount),
        equipment: itemId => Shop.unlockItem?.(itemId)
    });

    Achievements.setAchievementUnlockedListener?.((achievement) => {
        GameState.addLog(`Achievement unlocked: ${achievement.name}`);
        Skills.checkSkillUnlocks?.('achievement', achievement.id);
        if (UI.elements && UI.elements['achievement-list']) {
            UI.populateDropdowns();
            UI.updateAll();
        }
    });
    Skills.setSkillUsedListener?.((skill) => {
        GameState.addLog(`Skill used: ${skill.name}`);
    });
    Skills.setSkillUnlockedListener?.((skill) => {
        GameState.addLog(`Skill unlocked: ${skill.name}`);
    });
    StatusEffects.setEffectAppliedListener?.(({ targetType, effect, refreshed, silent }) => {
        if (silent) return;
        const targetLabel = targetType === 'player' ? 'Player' : 'Enemy';
        const actionText = refreshed ? 'refreshed on' : 'applied to';
        GameState.addLog(`${effect.name} ${actionText} ${targetLabel}.`);
    });
    StatusEffects.setEffectExpiredListener?.(({ targetType, effect, silent }) => {
        if (silent) return;
        const targetLabel = targetType === 'player' ? 'Player' : 'Enemy';
        GameState.addLog(`${effect.name} expired on ${targetLabel}.`);
    });
    Missions.setMissionStartedListener?.(({ mission, currentWave, totalWaves, silent }) => {
        if (silent) return;
        GameState.addLog(`Mission started: ${mission.name} (Wave ${currentWave}/${totalWaves})`);
    });
    Missions.setMissionWaveListener?.(({ mission, currentWave, totalWaves, silent }) => {
        if (silent) return;
        GameState.addLog(`${mission.name}: Wave ${currentWave}/${totalWaves}`);
    });
    Missions.setMissionCompletedListener?.((result) => {
        if (!result || result.silent) return;
        GameState.addLog(`Mission Complete: ${result.missionName}`);
        UI.showModal(
            'Mission Complete',
            `${result.missionName} cleared. Bonus rewards: +${result.bonusXp} XP, +${result.bonusGold} gold.`
        );
    });
    Missions.setMissionFailedListener?.((result) => {
        if (!result || result.silent) return;
        GameState.addLog(`Mission Failed: ${result.missionName}`);
    });

    // 1. Initialize Systems
    Persistence.load();
    Skills.normalizePlayerSkills?.(GameState.player);
    Missions.normalizeMissionState?.();
    StatusEffects.normalizeStatusState?.();
    StatusEffects.clearAllTemporaryEffects?.();
    Skills.checkSkillUnlocks?.('level');
    Skills.checkSkillUnlocks?.('achievement');
    UI.init();

    // 2. Start Auto-Save Loop
    setInterval(() => {
        Persistence.save();
        const status = document.getElementById('save-status');
        status.textContent = `Saved at ${new Date().toLocaleTimeString()}`;
        setTimeout(() => status.textContent = 'Saved', 2000);
    }, CONFIG.SAVE_INTERVAL_MS);

    // Track active playtime for time-based achievements.
    setInterval(() => {
        Achievements.onTimePlayed?.(1);
        UI.renderAchievements();
    }, 1000);

    // 3. Bind UI Event Listeners
    document.getElementById('btn-toggle-combat').addEventListener('click', () => {
        if (GameState.combat.isActive) {
            CombatEngine.stop();
        } else {
            CombatEngine.start();
        }
        UI.updateCombatButton();
    });

    // Equipment Changes
    document.getElementById('equip-weapon').addEventListener('change', (e) => {
        if (!Shop.equipItem?.(e.target.value)) {
            UI.populateDropdowns();
            UI.updateAll();
            return;
        }
        UI.updateAll();
    });
    document.getElementById('equip-armor').addEventListener('change', (e) => {
        if (!Shop.equipItem?.(e.target.value)) {
            UI.populateDropdowns();
            UI.updateAll();
            return;
        }
        UI.updateAll();
    });
    document.getElementById('equip-charm').addEventListener('change', (e) => {
        if (!Shop.equipItem?.(e.target.value)) {
            UI.populateDropdowns();
            UI.updateAll();
            return;
        }
        UI.updateAll();
    });

    // Shop interactions (purchase/equip)
    document.getElementById('shop-list').addEventListener('click', (e) => {
        if (!(e.target instanceof Element)) return;
        const button = e.target.closest('button[data-action][data-item-id]');
        if (!button) return;

        const action = button.dataset.action;
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        if (action === 'purchase') {
            const didPurchase = Shop.purchaseItem?.(itemId);
            if (didPurchase) {
                const item = Shop.getItemById?.(itemId);
                if (item) {
                    GameState.addLog(`Purchased ${item.name} for ${item.cost} gold.`);
                }
            }
        } else if (action === 'equip') {
            const didEquip = Shop.equipItem?.(itemId);
            if (didEquip) {
                const item = Shop.getItemById?.(itemId);
                if (item) {
                    GameState.addLog(`Equipped ${item.name}.`);
                }
            }
        }

        UI.populateDropdowns();
        UI.updateAll();
    });

    // Skills interactions (manual active skill use)
    document.getElementById('skill-list').addEventListener('click', (e) => {
        if (!(e.target instanceof Element)) return;
        const button = e.target.closest('button[data-action][data-skill-id]');
        if (!button) return;

        const action = button.dataset.action;
        const skillId = button.dataset.skillId;
        if (!skillId) return;

        if (action === 'use-skill') {
            Skills.useSkill?.(skillId, GameState.enemy.id);
        }

        if (action === 'purchase-skill') {
            const didPurchase = Skills.purchaseSkill?.(skillId);
            if (didPurchase) {
                const skill = Skills.getSkillDefinition?.(skillId);
                if (skill) {
                    GameState.addLog(`Purchased skill: ${skill.name}`);
                }
            }
        }

        UI.updateAll();
    });

    // Enemy Selection
    document.getElementById('enemy-selector').addEventListener('change', (e) => {
        if (Missions.isMissionActive?.()) {
            UI.updateAll();
            return;
        }

        if (!CONFIG.ENEMIES[e.target.value] || !CONFIG.ENEMIES[e.target.value].isUnlocked) {
            UI.populateDropdowns();
            return;
        }

        CombatEngine.stop(); // Stop combat when switching targets
        GameState.enemy.id = e.target.value;
        GameState.enemy.currentHp = CONFIG.ENEMIES[e.target.value].hp;
        GameState.enemy.tickTimer = 0;
        GameState.enemy.activeEffects = [];
        UI.updateAll();
    });

    // Mission interactions
    document.getElementById('mission-list').addEventListener('click', (e) => {
        if (!(e.target instanceof Element)) return;
        const button = e.target.closest('button[data-action][data-mission-id]');
        if (!button) return;

        const action = button.dataset.action;
        const missionId = button.dataset.missionId;
        if (!missionId) return;

        if (action === 'start-mission') {
            const started = Missions.startMission?.(missionId);
            if (started) {
                UI.populateDropdowns();
                UI.updateAll();
            }
        }
    });

    document.getElementById('btn-end-mission').addEventListener('click', () => {
        const result = Missions.endMission?.({ reason: 'manual' });
        if (result?.ended) {
            GameState.addLog(`Mission ended: ${result.missionName}`);
        }
        UI.populateDropdowns();
        UI.updateAll();
    });

    // Manual Save
    document.getElementById('btn-manual-save').addEventListener('click', () => {
        Persistence.save();
        const status = document.getElementById('save-status');
        status.textContent = 'Manual Save OK';
        setTimeout(() => status.textContent = 'Saved', 2000);
    });

    // Restart Game
    document.getElementById('btn-restart').addEventListener('click', () => {
        if (confirm('Are you sure you want to restart? This will delete all progress.')) {
            Persistence.restart();
        }
    });

    // Modal Close
    document.getElementById('btn-close-modal').addEventListener('click', () => {
        UI.hideModal();
    });
});
