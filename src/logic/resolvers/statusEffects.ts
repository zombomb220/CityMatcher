
import type { CityState } from '../../types';
import { ResourceType } from '../../types';
import { STATUS_EFFECTS } from '../../config/buildingStats';

// Contract: Data-Driven Status Effects.
// Evaluates triggers. Returns Active Effects & Multipliers.
// May modify resources directly (Immediate effects).

interface StatusEffectsResult {
    activeEffects: string[];
    productionMultipliers: Record<string, number>;
    disabledTypes: Set<string>;
}

export const applyStatusEffects = (city: CityState, trackChange: (res: string, amt: number, src: string) => void): StatusEffectsResult => {
    const activeIds = new Set(city.activeStatusEffects || []);
    const activeEffects = STATUS_EFFECTS.filter(e => activeIds.has(e.id));

    // Result Accumulators
    const productionMultipliers: Record<string, number> = {};
    const disabledTypes = new Set<string>();

    for (const effect of activeEffects) {
        for (const action of effect.effects) {
            if (action.type === 'productionMultiplier') {
                const target = action.target;
                const val = action.value || 1;
                // Accumulate Multipliers (Multiplicative)
                if (target === 'all') {
                    // We need a list of all building types? Or just handle 'all' logic in production.
                    // Let's store a special '*' key or handle it later.
                    // For now, let's assume specific types or 'all'.
                    productionMultipliers['all'] = (productionMultipliers['all'] || 1) * val;
                } else {
                    productionMultipliers[target] = (productionMultipliers[target] || 1) * val;
                }
            } else if (action.type === 'resourceDelta') {
                const target = action.target;
                const val = action.value || 0;

                if (target === ResourceType.Happiness) {
                    city.happiness = Math.max(0, Math.min(100, city.happiness + val));
                    trackChange(ResourceType.Happiness, val, effect.name);
                } else if (target === ResourceType.Money) {
                    city.money += val;
                    trackChange(ResourceType.Money, val, effect.name);
                }
            } else if (action.type === 'disableBuilding') {
                disabledTypes.add(action.target);
            }
        }
    }

    // Return the derived modifiers for this turn
    return {
        activeEffects: Array.from(activeIds),
        productionMultipliers,
        disabledTypes
    };
};
