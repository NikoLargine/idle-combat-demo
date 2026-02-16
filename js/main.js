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

document.addEventListener('DOMContentLoaded', () => {
    Achievements.configureAchievementRewardHandlers?.({
        gold: amount => Economy.addGold?.(amount),
        xp: amount => Leveling.addXP?.(amount),
        equipment: itemId => Shop.unlockItem?.(itemId)
    });

    Achievements.setAchievementUnlockedListener?.((achievement) => {
        GameState.addLog(`Achievement unlocked: ${achievement.name}`);
        if (UI.elements && UI.elements['achievement-list']) {
            UI.populateDropdowns();
            UI.updateAll();
        }
    });
    Skills.setSkillUsedListener?.((skill) => {
        GameState.addLog(`Skill used: ${skill.name}`);
    });

    // 1. Initialize Systems
    Persistence.load();
    Skills.normalizePlayerSkills?.(GameState.player);
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
        if (!skillId || action !== 'use-skill') return;

        Skills.useSkill?.(skillId, GameState.enemy.id);
        UI.updateAll();
    });

    // Enemy Selection
    document.getElementById('enemy-selector').addEventListener('change', (e) => {
        if (!CONFIG.ENEMIES[e.target.value] || !CONFIG.ENEMIES[e.target.value].isUnlocked) {
            UI.populateDropdowns();
            return;
        }

        CombatEngine.stop(); // Stop combat when switching targets
        GameState.enemy.id = e.target.value;
        GameState.enemy.currentHp = CONFIG.ENEMIES[e.target.value].hp;
        GameState.enemy.tickTimer = 0;
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
