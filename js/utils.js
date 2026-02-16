export const Utils = {
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

    // Core Combat Formula
    calculateHitChance: (attackerAcc, defenderEva) => {
        return attackerAcc / (attackerAcc + defenderEva);
    },

    isHit: (chance) => Math.random() < chance,

    calculateDamage: (min, max, reductionPercent) => {
        const rawDamage = Utils.randomInt(min, max);
        const reduction = rawDamage * (reductionPercent / 100);
        return Math.max(1, Math.floor(rawDamage - reduction));
    }
};