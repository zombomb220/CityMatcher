
import type { CityState, PlacedTileWithHistory } from '../../types';

// Contract: Produce Resources (Same-Turn Usable).
import { ResourceType } from '../../types';
import { BUILDING_STATS, POPULATION_PARAMS } from '../../config/buildingStats';

// Contract: Produce Resources (Same-Turn Usable).
// 1. Calculate Potential (Base + Stars).
// 2. Apply Multipliers (from Status Effects).
// 3. Add to City Pools.

export const produceResources = (
    city: CityState,
    tiles: PlacedTileWithHistory[],
    multipliers: Record<string, number>,
    disabledTypes: Set<string>,
    trackChange: (res: string, amt: number, src: string) => void
): void => {

    const getMultiplier = (type: string) => {
        const specific = multipliers[type] || 1;
        const global = multipliers['all'] || 1;
        return specific * global;
    };

    for (const t of tiles) {
        // Skip disabled types (from status effects)
        if (disabledTypes.has(t.tile.type)) {
            t.tile.disabled = true;
            t.tile.disabledReason = "Status Effect";
            t.tile.stars = 0;
            continue;
        }

        // Fix Type Lookup (Tier is number, Keys are string "1", "2", "3")
        // Type Lookup Fix
        // Actually, BUILDING_STATS keys are "1", "2", "3" (strings) in JSON, but mapped to numbers in TS?
        // Let's check Schema.
        // Schema: z.record(z.enum(["1", "2", "3"])...
        // So keys are STRINGS.
        // t.tile.tier is NUMBER.
        const stats = BUILDING_STATS[t.tile.type]?.[t.tile.tier.toString() as "1" | "2" | "3"];

        if (!stats) continue;

        // Determine Production based on Stars
        const starKey = t.tile.stars.toString() as "1" | "2" | "3";
        const production = stats.produces[starKey] || stats.produces["1"] || {};
        const mult = getMultiplier(t.tile.type);

        for (const [res, baseAmt] of Object.entries(production)) {
            const amount = Math.floor((baseAmt as number) * mult);
            if (amount <= 0) continue;

            if (res === ResourceType.Power) {
                city.powerCapacity += amount;
                city.powerAvailable += amount; // Available for consumption
                trackChange(ResourceType.Power, amount, t.tile.type);
            } else if (res === ResourceType.Population) {
                // Special Scalar Logic
                city.population += amount;
                city.workforceAvailable += amount; // Pop generates workforce
                trackChange(ResourceType.Population, amount, "Growth");
            } else if (res === ResourceType.RawGoods) {
                city.rawGoodsAvailable += amount;
                trackChange(ResourceType.RawGoods, amount, t.tile.type);
            } else if (res === ResourceType.Money) {
                city.money += amount;
                trackChange(ResourceType.Money, amount, t.tile.type);
            }
        }
    }

    // Population Tax (Derived Production)
    const tax = Math.floor(city.population * (POPULATION_PARAMS.taxPerPop || 0.25));
    if (tax > 0) {
        city.money += tax;
        trackChange(ResourceType.Money, tax, "Taxes");
    }
};
