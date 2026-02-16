import { GameState } from './state.js';
import { CONFIG } from './config.js';

export const UI = {
    // Cache DOM elements
    elements: {},

    init() {
        // Hydrate DOM cache
        const ids = ['player-current-hp', 'player-max-hp', 'player-hp-fill', 'player-dmg-stat', 'player-acc-stat',
                     'player-eva-stat', 'player-dr-stat', 'player-wins-stat', 'enemy-current-hp', 'enemy-max-hp',
                     'enemy-hp-fill', 'enemy-dmg-stat', 'enemy-acc-stat', 'enemy-eva-stat', 'enemy-name-display',
                     'equip-weapon', 'equip-armor', 'equip-charm', 'enemy-selector', 'log-list', 'btn-toggle-combat',
                     'save-status', 'offline-modal', 'offline-summary-text', 'btn-close-modal'];

        ids.forEach(id => { this.elements[id] = document.getElementById(id); });

        this.populateDropdowns();
        this.updateAll();
    },

    populateDropdowns() {
        // Populate Equipment
        const populateSelect = (selectElem, items, currentId) => {
            selectElem.innerHTML = items.map(i => `<option value="${i.id}" ${i.id === currentId ? 'selected' : ''}>${i.name}</option>`).join('');
        };

        populateSelect(this.elements['equip-weapon'], CONFIG.EQUIPMENT.weapons, GameState.equipment.weaponId);
        populateSelect(this.elements['equip-armor'], CONFIG.EQUIPMENT.armor, GameState.equipment.armorId);
        populateSelect(this.elements['equip-charm'], CONFIG.EQUIPMENT.charms, GameState.equipment.charmId);

        // Populate Enemies
        const enemies = Object.entries(CONFIG.ENEMIES).map(([id, data]) => ({ id, name: data.name }));
        populateSelect(this.elements['enemy-selector'], enemies, GameState.enemy.id);
    },

    updateAll() {
        this.updatePlayer();
        this.updateEnemy();
        this.updateLog();
        this.updateCombatButton();
    },

    updatePlayer() {
        const pStats = GameState.getPlayerStats(); // Returns merged stats (Base + Equipment)

        this.elements['player-current-hp'].textContent = GameState.player.currentHp;
        this.elements['player-max-hp'].textContent = pStats.hp;
        this.elements['player-hp-fill'].style.width = `${Math.max(0, (GameState.player.currentHp / pStats.hp) * 100)}%`;

        this.elements['player-dmg-stat'].textContent = `${pStats.minHit}-${pStats.maxHit}`;
        this.elements['player-acc-stat'].textContent = pStats.accuracy;
        this.elements['player-eva-stat'].textContent = pStats.evasion;
        this.elements['player-dr-stat'].textContent = `${pStats.damageReduction || 0}%`;
        this.elements['player-wins-stat'].textContent = GameState.player.wins;
    },

    updateEnemy() {
        const eStats = CONFIG.ENEMIES[GameState.enemy.id];

        this.elements['enemy-name-display'].textContent = eStats.name;
        this.elements['enemy-current-hp'].textContent = GameState.enemy.currentHp;
        this.elements['enemy-max-hp'].textContent = eStats.hp;
        this.elements['enemy-hp-fill'].style.width = `${Math.max(0, (GameState.enemy.currentHp / eStats.hp) * 100)}%`;

        this.elements['enemy-dmg-stat'].textContent = `${eStats.minHit}-${eStats.maxHit}`;
        this.elements['enemy-acc-stat'].textContent = eStats.accuracy;
        this.elements['enemy-eva-stat'].textContent = eStats.evasion;
    },

    updateLog() {
        this.elements['log-list'].innerHTML = GameState.combat.log.map(msg => `<li>${msg}</li>`).join('');
    },

    updateCombatButton() {
        const btn = this.elements['btn-toggle-combat'];
        btn.textContent = GameState.combat.isActive ? 'Disengage' : 'Engage Combat';
        btn.style.background = GameState.combat.isActive ? 'var(--border)' : 'var(--accent)';
    },

    spawnFloatingText(containerId, text, type) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const el = document.createElement('span');
        el.className = `floating-text ${type}`;
        el.textContent = text;

        // Randomize horizontal position slightly to prevent text overlapping
        const randomX = (Math.random() - 0.5) * 40;
        el.style.marginLeft = `${randomX}px`;

        container.appendChild(el);
        setTimeout(() => el.remove(), 1000); // Clean up DOM
    },

    showModal(title, text) {
        this.elements['offline-summary-text'].textContent = text;
        this.elements['offline-modal'].classList.remove('hidden');
    },

    hideModal() {
        this.elements['offline-modal'].classList.add('hidden');
    }
};