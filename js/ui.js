import { GameState } from './state.js';
import { CONFIG } from './config.js';
import * as Leveling from './leveling.js';
import * as EnemyUnlocks from './enemyUnlocks.js';
import * as Shop from './shop.js';
import * as Achievements from './achievements.js';
import * as Skills from './skills.js';
import * as StatusEffects from './statusEffects.js';
import { calculateItemStats, getRarityDefinition, normalizeRarityId } from './rarity.js';
import * as Missions from './missions.js';
import { getScaledEnemy } from './enemies.js';

function formatStat(value) {
    if (!Number.isFinite(value)) return '0';
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(3).replace(/\.?0+$/, '');
}

function getShopStatText(item) {
    const stats = item.finalStats || calculateItemStats(item);
    if (item.slot === 'weapon') {
        return `Damage +${stats.minHit || 0}-${stats.maxHit || 0}`;
    }
    if (item.slot === 'armor') {
        return `Damage Reduction +${stats.damageReduction || 0}%`;
    }
    if (item.slot === 'charm') {
        return `Accuracy +${stats.accuracy || 0}, Evasion +${stats.evasion || 0}`;
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
                     'enemy-selector', 'mission-list', 'mission-active-info', 'btn-end-mission', 'shop-list', 'skill-list', 'equipment-list', 'missions-toggle', 'missions-dropdown',
                     'achievement-list', 'log-list', 'btn-toggle-combat', 'save-status', 'offline-modal',
                     'offline-summary-text', 'btn-close-modal', 'player-effects', 'enemy-effects',
                     'tab-player-wins', 'tab-player-deaths', 'tab-target-name'];

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
                const rarityId = normalizeRarityId(item.rarity);
                const rarity = getRarityDefinition(rarityId);
                const suffix = item.unlocked ? '' : ` (Locked - ${item.cost} Gold)`;
                return `<option value="${item.id}" class="rarity-${rarityId}" style="color:${rarity.color};" ${selected} ${disabled}>${item.name} [${rarity.name}]${suffix}</option>`;
            }).join('');

            const selectedItem = items.find(item => item.id === selectedId) || null;
            const selectedRarity = getRarityDefinition(selectedItem?.rarity);
            selectElem.style.color = selectedRarity.color;
            selectElem.style.borderColor = selectedRarity.color;
        };

        populateEquipSelect(this.elements['equip-weapon'], CONFIG.EQUIPMENT.weapons, 'weaponId');
        populateEquipSelect(this.elements['equip-armor'], CONFIG.EQUIPMENT.armor, 'armorId');
        populateEquipSelect(this.elements['equip-charm'], CONFIG.EQUIPMENT.charms, 'charmId');

        this.renderEnemies();
    },


    renderEnemies() {
        const selector = this.elements['enemy-selector'];
        if (!selector) return;

        EnemyUnlocks.checkEnemyUnlocks?.();
        const missionActive = Missions.isMissionActive?.() || false;

        if (!CONFIG.ENEMIES[GameState.enemy.id] || (!missionActive && !CONFIG.ENEMIES[GameState.enemy.id].isUnlocked)) {
            GameState.enemy.id = EnemyUnlocks.getFirstUnlockedEnemyId?.() || 'goblin';
            GameState.enemy.currentHp = (getScaledEnemy(GameState.enemy.id, GameState.player.level) || CONFIG.ENEMIES[GameState.enemy.id]).hp;
            GameState.enemy.tickTimer = 0;
            GameState.enemy.activeEffects = [];
        }

        selector.innerHTML = Object.entries(CONFIG.ENEMIES).map(([id, enemy]) => {
            const selected = id === GameState.enemy.id ? 'selected' : '';
            const isLocked = !enemy.isUnlocked && !missionActive;
            const disabled = isLocked ? 'disabled' : '';
            const suffix = isLocked ? ` (${EnemyUnlocks.getEnemyUnlockText?.(id, enemy) || 'Locked'})` : '';
            return `<option value="${id}" ${selected} ${disabled}>${enemy.name}${suffix}</option>`;
        }).join('');

        selector.disabled = missionActive;
        selector.title = missionActive ? 'Enemy selection is disabled while a mission is active.' : '';
    },

    updateAll() {
        this.renderPlayerStats();
        this.renderCombat();
        this.renderMissions();
        this.updateMissionPanel();
        this.renderSkills();
        this.renderShop();
        this.renderEquipment();
        this.renderAchievements();
        this.renderStatusEffects();
        this.updateLog();
        this.updateCombatButton();
        this.renderStatsTab();
    },

    renderPlayerStats() {
        this.updatePlayer();
    },

    renderCombat() {
        this.updateEnemy();
    },

    updatePlayer() {
        const pStatsWithEffects = StatusEffects.applyStatEffectModifiers?.({
            target: GameState.player,
            targetType: 'player',
            stats: GameState.getPlayerStats(),
            context: { phase: 'ui' }
        }) || GameState.getPlayerStats();
        const pStats = Missions.applyAreaModifiersToStats?.({
            targetType: 'player',
            stats: pStatsWithEffects
        }) || pStatsWithEffects;
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
        const eStatsWithEffects = StatusEffects.applyStatEffectModifiers?.({
            target: GameState.enemy,
            targetType: 'enemy',
            stats: getScaledEnemy(GameState.enemy.id, GameState.player.level) || CONFIG.ENEMIES[GameState.enemy.id],
            context: { phase: 'ui' }
        }) || getScaledEnemy(GameState.enemy.id, GameState.player.level) || CONFIG.ENEMIES[GameState.enemy.id];
        const eStats = Missions.applyAreaModifiersToStats?.({
            targetType: 'enemy',
            stats: eStatsWithEffects
        }) || eStatsWithEffects;

        const missionSummary = Missions.getActiveMissionSummary?.() || { active: false, waveText: '' };
        this.elements['enemy-name-display'].textContent = missionSummary.active
            ? `${eStats.name} (${missionSummary.waveText})`
            : eStats.name;

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

    renderMissions() {
        const list = this.elements['mission-list'];
        if (!list) return;

        const missions = Missions.getMissionsForUI?.() || [];
        list.innerHTML = missions.map(mission => {
            const missionClass = mission.active
                ? 'mission-active'
                : (mission.unlocked ? 'mission-unlocked' : 'mission-locked');
            const actionButton = mission.active
                ? `<button class="btn-secondary" disabled>Active</button>`
                : `<button class="btn-secondary" data-action="start-mission" data-mission-id="${mission.id}" ${mission.unlocked ? '' : 'disabled'}>${mission.unlocked ? 'Start' : 'Locked'}</button>`;
            const requirementText = mission.unlocked ? 'Unlocked' : mission.unlockRequirementText;

            return `
                <div class="mission-item ${missionClass}">
                    <div class="mission-item-header">
                        <span class="mission-item-title">${mission.name}</span>
                        <span class="mission-item-waves">${mission.waves} Waves</span>
                    </div>
                    <div class="mission-item-desc">${mission.description}</div>
                    <div class="mission-item-modifier">${mission.areaModifierText}</div>
                    <div class="mission-item-reward">${mission.rewardText}</div>
                    <div class="mission-item-meta">${requirementText} • ${mission.progressText || ''}</div>
                    <div class="mission-item-actions">${actionButton}</div>
                </div>
            `;
        }).join('');
    },

    updateMissionPanel() {
        const info = this.elements['mission-active-info'];
        const endBtn = this.elements['btn-end-mission'];
        if (!info || !endBtn) return;

        const summary = Missions.getActiveMissionSummary?.() || { active: false };
        if (!summary.active) {
            info.innerHTML = `<div class="mission-active-text">Mode: Free Fight</div>`;
            endBtn.disabled = true;
            return;
        }

        info.innerHTML = `
            <div class="mission-active-text">Mission: ${summary.name}</div>
            <div class="mission-active-wave">${summary.waveText}</div>
            <div class="mission-active-modifier">${summary.modifierText}</div>
        `;
        endBtn.disabled = false;
    },

    renderStatsTab() {
        if (this.elements['tab-player-wins']) {
            this.elements['tab-player-wins'].textContent = GameState.player.wins;
        }
        if (this.elements['tab-player-deaths']) {
            this.elements['tab-player-deaths'].textContent = GameState.player.deaths;
        }
        if (this.elements['tab-target-name']) {
            const activeEnemy = CONFIG.ENEMIES[GameState.enemy.id];
            this.elements['tab-target-name'].textContent = activeEnemy?.name || 'Unknown';
        }
    },

    renderStatusEffects() {
        const playerContainer = this.elements['player-effects'];
        const enemyContainer = this.elements['enemy-effects'];

        if (playerContainer) {
            const playerEffects = StatusEffects.getRenderableEffects?.(GameState.player) || [];
            playerContainer.innerHTML = playerEffects.map(effect => {
                const iconText = effect.icon || effect.name.slice(0, 3).toUpperCase();
                const title = `${effect.name} (${effect.remaining.toFixed(1)}s): ${effect.description || ''}`;
                return `
                    <div class="status-effect status-${effect.type}" title="${title}">
                        <div class="status-effect-top">
                            <span class="status-effect-icon">${iconText}</span>
                            <span class="status-effect-time">${effect.remaining.toFixed(1)}s</span>
                        </div>
                        <div class="status-effect-progress">
                            <span style="width:${effect.progressPct}%;"></span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (enemyContainer) {
            const enemyEffects = StatusEffects.getRenderableEffects?.(GameState.enemy) || [];
            enemyContainer.innerHTML = enemyEffects.map(effect => {
                const iconText = effect.icon || effect.name.slice(0, 3).toUpperCase();
                const title = `${effect.name} (${effect.remaining.toFixed(1)}s): ${effect.description || ''}`;
                return `
                    <div class="status-effect status-${effect.type}" title="${title}">
                        <div class="status-effect-top">
                            <span class="status-effect-icon">${iconText}</span>
                            <span class="status-effect-time">${effect.remaining.toFixed(1)}s</span>
                        </div>
                        <div class="status-effect-progress">
                            <span style="width:${effect.progressPct}%;"></span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    },

    renderShop() {
        const shopList = this.elements['shop-list'];
        if (!shopList) return;

        const playerGold = Number.isFinite(GameState.player.gold) ? Math.max(0, Math.floor(GameState.player.gold)) : 0;
        const items = Shop.getShopItems?.() || [];

        shopList.innerHTML = items.map(item => {
            const unlocked = !!item.unlocked;
            const rarityId = normalizeRarityId(item.rarity);
            const rarityInfo = item.rarityInfo || getRarityDefinition(rarityId);
            const itemClass = `${unlocked ? 'item-owned' : 'item-locked'} rarity-${rarityId}`;
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
                <div class="shop-item ${itemClass}" style="--item-rarity-color: ${rarityInfo.color};" title="${statText}">
                    <div class="shop-item-details">
                        <div class="shop-item-title">${item.name} <span class="shop-slot">[${slotLabel}]</span></div>
                        <div class="shop-item-rarity">${rarityInfo.name}</div>
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
        const playerGold = Number.isFinite(GameState.player.gold) ? Math.max(0, Math.floor(GameState.player.gold)) : 0;

        list.innerHTML = skills.map(skill => {
            const isActive = skill.type === 'active';
            const itemClass = skill.learned ? 'skill-learned' : 'skill-locked';

            let statusClass = 'skill-cooldown';
            let statusText = skill.unlockRequirementText || 'Locked';

            if (skill.learned) {
                statusClass = skill.available ? 'skill-ready' : 'skill-cooldown';
                statusText = isActive
                    ? (skill.available ? 'Ready' : `${skill.currentCooldown.toFixed(1)}s`)
                    : 'Passive';
            }

            let actionButton = `<button class="btn-secondary" disabled>Locked</button>`;
            if (skill.learned) {
                actionButton = isActive
                    ? `<button class="btn-secondary" data-action="use-skill" data-skill-id="${skill.id}" ${skill.available ? '' : 'disabled'}>Use</button>`
                    : `<button class="btn-secondary" disabled>Passive</button>`;
            } else if (skill.canPurchase) {
                const canAfford = playerGold >= skill.purchaseCost;
                const buttonLabel = `Buy (${skill.purchaseCost}g)`;
                actionButton = `<button class="btn-secondary" data-action="purchase-skill" data-skill-id="${skill.id}" ${canAfford ? '' : 'disabled'}>${buttonLabel}</button>`;
            }

            return `
                <div class="skill-item ${itemClass}">
                    <div class="skill-item-details">
                        <div class="skill-item-title">${skill.name}</div>
                        <div class="skill-item-desc">${skill.description}</div>
                        <div class="skill-item-status ${statusClass}">${statusText}</div>
                    </div>
                    <div class="skill-item-actions">
                        ${actionButton}
                    </div>
                </div>
            `;
        }).join('');
    },


    renderEquipment() {
        const list = this.elements['equipment-list'];
        if (!list) return;

        const allItems = [
            ...CONFIG.EQUIPMENT.weapons,
            ...CONFIG.EQUIPMENT.armor,
            ...CONFIG.EQUIPMENT.charms
        ];

        const rows = allItems.filter(item => item.unlocked).map(item => {
            const stateKey = Shop.getSlotStateKey?.(item.slot);
            const equippedId = stateKey ? GameState.equipment[stateKey] : null;
            const equipped = equippedId === item.id;
            const stats = calculateItemStats(item);
            const statText = getShopStatText({ ...item, finalStats: stats });
            return `
                <div class="equipment-item ${equipped ? 'equipment-item-equipped' : ''}">
                    <div>
                        <div>${item.name}</div>
                        <div class="equipment-item-meta">${statText}</div>
                    </div>
                    <button class="btn-secondary" data-action="equip" data-item-id="${item.id}" ${equipped ? 'disabled' : ''}>${equipped ? 'Equipped' : 'Equip'}</button>
                </div>
            `;
        });

        list.innerHTML = rows.length ? rows.join('') : '<div class="equipment-item">No equipment unlocked yet.</div>';
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
