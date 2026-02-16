import { GameState } from './state.js';
import { CombatEngine } from './combat.js';
import { Persistence } from './persistence.js';
import { UI } from './ui.js';
import { CONFIG } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Systems
    Persistence.load();
    UI.init();

    // 2. Start Auto-Save Loop
    setInterval(() => {
        Persistence.save();
        const status = document.getElementById('save-status');
        status.textContent = `Saved at ${new Date().toLocaleTimeString()}`;
        setTimeout(() => status.textContent = 'Saved', 2000);
    }, CONFIG.SAVE_INTERVAL_MS);

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
        GameState.equipment.weaponId = e.target.value;
        UI.updatePlayer();
    });
    document.getElementById('equip-armor').addEventListener('change', (e) => {
        GameState.equipment.armorId = e.target.value;
        UI.updatePlayer();
    });
    document.getElementById('equip-charm').addEventListener('change', (e) => {
        GameState.equipment.charmId = e.target.value;
        UI.updatePlayer();
    });

    // Enemy Selection
    document.getElementById('enemy-selector').addEventListener('change', (e) => {
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