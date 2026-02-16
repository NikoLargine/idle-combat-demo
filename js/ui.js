import { GameState } from './state.js';
import { CONFIG } from './config.js';
import * as Leveling from './leveling.js';
import * as EnemyUnlocks from './enemyUnlocks.js';
import * as Shop from './shop.js';
import * as Achievements from './achievements.js';
import * as Skills from './skills.js';

function formatStat(value) {
    if (!Number.isFinite(value)) return '0';
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(3).replace(/\.?0+$/, '');
}

function getShopStatText(item) {
    if (item.slot === 'weapon') {
        return `Damage +${item.minHit || 0}-${item.maxHit || 0}`;
    }
    if (item.slot === 'armor') {
        return `Damage Reduction +${item.damageReduction || 0}%`;
    }
    if (item.slot === 'charm') {
        return `Accuracy +${item.accuracy || 0}, Evasion +${item.evasion || 0}`;
    }
    return '';
}

export const UI = {
    // Cache DOM elements
    elements: {},

    init() {
        // Hydrate DOM cache
        const ids = ['player-current-hp', 'player-max-hp', 'player-hp-fill', 'player-level-stat', 'player-xp-stat',
                     'player-xp-required-stat', 'player-xp-fill', 'player-gold-stat', 'player-dmg-stat', 'player-acc-stat',
                     'player-eva-stat', 'player-dr-stat', 'player-wins-stat', 'player-deaths-stat',
                     'enemy-current-hp', 'enemy-max-hp', 'enemy-hp-fill', 'enemy-dmg-stat', 'enemy-acc-stat',
                     'enemy-eva-stat', 'enemy-name-display', 'equip-weapon', 'equip-armor', 'equip-charm',
                     'enemy-selector', 'shop-list', 'skill-list', 'achievement-list', 'log-list', 'btn-toggle-combat', 'save-status', 'offline-modal',
                     'offline-summary-text', 'btn-close-modal'];

        ids.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });

        // Automatically refresh enemy selector when new enemies unlock.
        EnemyUnlocks.onEnemyUnlocksChanged?.(() => {
            if (!this.elements['enemy-selector']) return;
            this.populateDropdowns();
            this.updateAll();
        });

        this.populateDropdowns();
        this.updateAll();
    },

    populateDropdowns() {
        Shop.normalizeShopState?.();

        // Populate Equipment and prevent selecting locked items from dropdowns.
        const populateEquipSelect = (selectElem, items, stateKey) => {
            let selectedId = GameState.equipment[stateKey];
            if (!items.some(item => item.id === selectedId && item.unlocked)) {
                const firstUnlocked = items.find(item => item.unlocked);
                selectedId = firstUnlocked ? firstUnlocked.id : selectedId;
                GameState.equipment[stateKey] = selectedId;
            }

            selectElem.innerHTML = items.map(item => {
                const selected = item.id === selectedId ? 'selected' : '';
                const disabled = item.unlocked ? '' : 'disabled';
                const suffix = item.unlocked ? '' : ` (Locked - ${item.cost} Gold)`;
                return `<option value="${item.id}" ${selected} ${disabled}>${item.name}${suffix}</option>`;
            }).join('');
        };

        populateEquipSelect(this.elements['equip-weapon'], CONFIG.EQUIPMENT.weapons, 'weaponId');
        populateEquipSelect(this.elements['equip-armor'], CONFIG.EQUIPMENT.armor, 'armorId');
        populateEquipSelect(this.elements['equip-charm'], CONFIG.EQUIPMENT.charms, 'charmId');

        // Populate Enemies with dynamic unlock state.
        EnemyUnlocks.checkEnemyUnlocks?.();

        if (!CONFIG.ENEMIES[GameState.enemy.id] || !CONFIG.ENEMIES[GameState.enemy.id].isUnlocked) {
            GameState.enemy.id = EnemyUnlocks.getFirstUnlockedEnemyId?.() || 'training_dummy';
            GameState.enemy.currentHp = CONFIG.ENEMIES[GameState.enemy.id].hp;
            GameState.enemy.tickTimer = 0;
        }

        this.elements['enemy-selector'].innerHTML = Object.entries(CONFIG.ENEMIES).map(([id, enemy]) => {
            const selected = id === GameState.enemy.id ? 'selected' : '';
            const isLocked = !enemy.isUnlocked;
            const disabled = isLocked ? 'disabled' : '';
            const optionClass = isLocked ? 'enemy-locked' : '';
            const suffix = isLocked ? ` (${EnemyUnlocks.getEnemyUnlockText?.(id, enemy) || 'Locked'})` : '';
            return `<option value="${id}" class="${optionClass}" ${selected} ${disabled}>${enemy.name}${suffix}</option>`;
        }).join('');
    },

    updateAll() {
        this.updatePlayer();
        this.renderSkills();
        this.renderShop();
        this.renderAchievements();
        this.updateEnemy();
        this.updateLog();
        this.updateCombatButton();
    },

    updatePlayer() {
        const pStats = GameState.getPlayerStats();
        const level = Number.isFinite(GameState.player.level) ? Math.max(1, Math.floor(GameState.player.level)) : 1;
        const xp = Number.isFinite(GameState.player.xp) ? Math.max(0, Math.floor(GameState.player.xp)) : 0;
        const gold = Number.isFinite(GameState.player.gold) ? Math.max(0, Math.floor(GameState.player.gold)) : 0;
        const requiredXp = Math.max(1, Leveling.getXPRequired?.(level) || 1);

        // HP values - ensure never negative
        const currentHp = Math.max(0, Math.ceil(GameState.player.currentHp));
        this.elements['player-current-hp'].textContent = currentHp;
        this.elements['player-max-hp'].textContent = pStats.hp;

        // HP bar percentage - clamped 0-100
        const pPercent = Math.max(0, Math.min(100, (GameState.player.currentHp / pStats.hp) * 100));
        this.elements['player-hp-fill'].style.width = `${pPercent}%`;

        // Color code HP bar based on health
        this.elements['player-hp-fill'].style.backgroundColor = pPercent < 30 ? '#ef4444' : '#22c55e';

        // Progression
        this.elements['player-level-stat'].textContent = level;
        this.elements['player-xp-stat'].textContent = xp;
        this.elements['player-xp-required-stat'].textContent = requiredXp;
        this.elements['player-gold-stat'].textContent = gold.toLocaleString();
        const xpPercent = Math.max(0, Math.min(100, (xp / requiredXp) * 100));
        this.elements['player-xp-fill'].style.width = `${xpPercent}%`;

        // Stats
        this.elements['player-dmg-stat'].textContent = `${pStats.minHit}-${pStats.maxHit}`;
        this.elements['player-acc-stat'].textContent = formatStat(pStats.accuracy);
        this.elements['player-eva-stat'].textContent = formatStat(pStats.evasion);
        this.elements['player-dr-stat'].textContent = `${pStats.damageReduction || 0}%`;
        this.elements['player-wins-stat'].textContent = GameState.player.wins;
        this.elements['player-deaths-stat'].textContent = GameState.player.deaths;
    },

    updateEnemy() {
        const eStats = CONFIG.ENEMIES[GameState.enemy.id];

        this.elements['enemy-name-display'].textContent = eStats.name;

        // HP values - ensure never negative
        const currentHp = Math.max(0, Math.ceil(GameState.enemy.currentHp));
        this.elements['enemy-current-hp'].textContent = currentHp;
        this.elements['enemy-max-hp'].textContent = eStats.hp;

        // HP bar percentage - clamped 0-100
        const ePercent = Math.max(0, Math.min(100, (GameState.enemy.currentHp / eStats.hp) * 100));
        this.elements['enemy-hp-fill'].style.width = `${ePercent}%`;

        // Stats
        this.elements['enemy-dmg-stat'].textContent = `${eStats.minHit}-${eStats.maxHit}`;
        this.elements['enemy-acc-stat'].textContent = eStats.accuracy;
        this.elements['enemy-eva-stat'].textContent = eStats.evasion;
    },

    renderShop() {
        const shopList = this.elements['shop-list'];
        if (!shopList) return;

        const playerGold = Number.isFinite(GameState.player.gold) ? Math.max(0, Math.floor(GameState.player.gold)) : 0;
        const items = Shop.getShopItems?.() || [];

        shopList.innerHTML = items.map(item => {
            const unlocked = !!item.unlocked;
            const itemClass = unlocked ? 'item-owned' : 'item-locked';
            const slotLabel = item.slot.charAt(0).toUpperCase() + item.slot.slice(1);
            const cost = Number.isFinite(item.cost) ? Math.max(0, Math.floor(item.cost)) : 0;
            const canAfford = playerGold >= cost;
            const purchaseDisabled = unlocked || !canAfford;
            const stateKey = Shop.getSlotStateKey?.(item.slot);
            const equippedId = stateKey ? GameState.equipment[stateKey] : '';
            const isEquipped = equippedId === item.id;

            const statusText = unlocked ? 'Owned' : `${cost} Gold`;
            const purchaseLabel = unlocked ? 'Owned' : 'Purchase';
            const equipDisabled = !unlocked;
            const equipLabel = isEquipped ? 'Equipped' : 'Equip';
            const statText = getShopStatText(item);

            return `
                <div class="shop-item ${itemClass}">
                    <div class="shop-item-details">
                        <div class="shop-item-title">${item.name} <span class="shop-slot">[${slotLabel}]</span></div>
                        <div class="shop-item-stats">${statText}</div>
                        <div class="shop-item-status">${statusText}</div>
                    </div>
                    <div class="shop-item-actions">
                        <button class="btn-secondary" data-action="purchase" data-item-id="${item.id}" ${purchaseDisabled ? 'disabled' : ''}>${purchaseLabel}</button>
                        <button class="btn-secondary" data-action="equip" data-item-id="${item.id}" ${equipDisabled ? 'disabled' : ''}>${equipLabel}</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderSkills() {
        const list = this.elements['skill-list'];
        if (!list) return;

        const skills = Skills.getSkillStatesForUI?.() || [];
        list.innerHTML = skills.map(skill => {
            const isActive = skill.type === 'active';
            const itemClass = skill.learned ? 'skill-learned' : 'skill-locked';
            const statusClass = skill.available ? 'skill-ready' : 'skill-cooldown';
            const cooldownText = isActive
                ? (skill.available ? 'Ready' : `${skill.currentCooldown.toFixed(1)}s`)
                : 'Passive';
            const actionButton = isActive
                ? `<button class="btn-secondary" data-action="use-skill" data-skill-id="${skill.id}" ${skill.available ? '' : 'disabled'}>Use</button>`
                : `<button class="btn-secondary" disabled>Passive</button>`;

            return `
                <div class="skill-item ${itemClass}">
                    <div class="skill-item-details">
                        <div class="skill-item-title">${skill.name}</div>
                        <div class="skill-item-desc">${skill.description}</div>
                        <div class="skill-item-status ${statusClass}">${cooldownText}</div>
                    </div>
                    <div class="skill-item-actions">
                        ${actionButton}
                    </div>
                </div>
            `;
        }).join('');
    },

    renderAchievements() {
        const list = this.elements['achievement-list'];
        if (!list) return;

        const achievements = Achievements.getAchievements?.() || [];
        list.innerHTML = achievements.map(achievement => {
            const itemClass = achievement.unlocked ? 'achievement-unlocked' : 'achievement-locked';
            const badge = achievement.unlocked ? 'Badge Unlocked' : 'Badge Locked';
            const progressText = Achievements.getAchievementProgressText?.(achievement) || `${achievement.current || 0} / ${achievement.target || 0}`;

            return `
                <div class="achievement-item ${itemClass}">
                    <div class="achievement-head">
                        <span class="achievement-name">${achievement.name}</span>
                        <span class="achievement-badge">${badge}</span>
                    </div>
                    <div class="achievement-desc">${achievement.description}</div>
                    <div class="achievement-progress">${progressText}</div>
                </div>
            `;
        }).join('');
    },

    updateLog() {
        if (!this.elements['log-list']) return;
        this.elements['log-list'].innerHTML = GameState.combat.log.map(msg => `<li>${msg}</li>`).join('');
    },

    updateCombatButton() {
        const btn = this.elements['btn-toggle-combat'];
        if (!btn) return;

        btn.textContent = GameState.combat.isActive ? 'Disengage' : 'Engage Combat';
        btn.style.background = GameState.combat.isActive ? 'var(--border)' : 'var(--accent)';
    },

    spawnFloatingText(containerId, text, type) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const el = document.createElement('span');
        el.className = `floating-text ${type}`;
        el.textContent = text;

        // Randomize horizontal position slightly to prevent overlapping
        const randomX = (Math.random() - 0.5) * 40;
        el.style.marginLeft = `${randomX}px`;

        container.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    },

    showModal(title, text) {
        if (!this.elements['offline-modal']) return;
        this.elements['offline-summary-text'].textContent = text;
        this.elements['offline-modal'].classList.remove('hidden');
    },

    hideModal() {
        if (!this.elements['offline-modal']) return;
        this.elements['offline-modal'].classList.add('hidden');
    }
};
