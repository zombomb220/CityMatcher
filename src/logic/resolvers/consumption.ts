
import type { CityState, PlacedTileWithHistory } from '../../types';
import { BuildingType, ResourceType } from '../../types';
import { BUILDING_STATS } from '../../config/buildingStats';

// Contract: Resolve Consumption (Priority-Ordered).
// - Consumption is atomic.
// - If building cannot fully consume inputs => Disabled.
// - Disabled buildings produce nothing (handled: their secondary production won't happen).
// - Secondary Production (Shops: Consume Goods -> Product) happens HERE.

export const resolveConsumption = (
    city: CityState,
    tiles: PlacedTileWithHistory[],
    trackChange: (res: string, amt: number, src: string) => void,
    buildingAlerts: any[]
): void => {

    // Sort by Priority (Lower = First)
    const sorted = [...tiles].sort((a, b) => {
        // Strict Type Access with String Keys
        const sA = BUILDING_STATS[a.tile.type][a.tile.tier.toString() as "1" | "2" | "3"];
        const sB = BUILDING_STATS[b.tile.type][b.tile.tier.toString() as "1" | "2" | "3"];
        // Priority defaults to 10 if missing (shouldn't happen with strict schema)
        const pA = sA?.priority ?? 10;
        const pB = sB?.priority ?? 10;

        return (pA - pB) || ((a.r * 100 + a.c) - (b.r * 100 + b.c));
    });

    for (const t of sorted) {
        if (t.tile.disabled) continue; // Already disabled (Status Effect)

        const stats = BUILDING_STATS[t.tile.type][t.tile.tier.toString() as "1" | "2" | "3"];

        // Determine Requirements (Base + Star)
        const starKey = t.tile.stars.toString() as "2" | "3";
        const starReqs = (t.tile.stars > 1 && stats.starRequirements?.[starKey]) || {};
        const baseReqs = stats.baseRequirements || {};

        // Calculate Total Wants
        const allResources = new Set([...Object.keys(baseReqs), ...Object.keys(starReqs)]) as Set<ResourceType>;

        let canAfford = true;
        const potentialCost: Record<string, number> = {};

        for (const res of allResources) {
            const base = baseReqs[res as keyof typeof baseReqs] || 0;
            const star = starReqs[res as keyof typeof starReqs];
            const finalReq = (star !== undefined) ? star : base;

            if (finalReq > 0) {
                potentialCost[res] = finalReq;
                // Check Affordability
                let available = 0;
                if (res === ResourceType.Power) available = city.powerAvailable;
                else if (res === ResourceType.Workforce) available = city.workforceAvailable;
                else if (res === ResourceType.RawGoods) available = city.rawGoodsAvailable;
                else if (res === ResourceType.Money) available = city.money;
                else if (res === ResourceType.Products) available = city.productsAvailable;
                else if (res === ResourceType.Population) available = city.population;

                if (available < finalReq) {
                    canAfford = false;
                    t.tile.disabledReason = res; // Mark reason
                }
            }
        }

        if (canAfford) {
            // Apply Consumption
            for (const [res, amt] of Object.entries(potentialCost)) {
                if (res === ResourceType.Power) city.powerAvailable -= amt;
                else if (res === ResourceType.Workforce) city.workforceAvailable -= amt;
                else if (res === ResourceType.RawGoods) city.rawGoodsAvailable -= amt;
                else if (res === ResourceType.Money) city.money -= amt;
                else if (res === ResourceType.Products) city.productsAvailable -= amt;

                trackChange(res, -amt, t.tile.type);
            }

            // Production 2.0: Shops (Consumption -> Production)
            if (t.tile.type === BuildingType.Shop) {
                const prodStarKey = t.tile.stars.toString() as "1" | "2" | "3";
                const production = stats.produces[prodStarKey] || stats.produces["1"] || {};

                for (const [res, amt] of Object.entries(production)) {
                    const val = amt as number;
                    if (res === ResourceType.Products) {
                        city.productsAvailable += val;
                        trackChange(ResourceType.Products, val, t.tile.type);
                    } else if (res === ResourceType.Money) {
                        city.money += val;
                        trackChange(ResourceType.Money, val, t.tile.type);
                    }
                }
            }
        } else {
            // Disable Building
            t.tile.disabled = true;
            t.tile.stars = 0;
            buildingAlerts.push({ id: t.tile.id, type: 'disable', message: `No ${t.tile.disabledReason}` });

            if (t.tile.type === BuildingType.Power) {
                const prodStarKey = t.tile.stars.toString() as "1" | "2" | "3";
                const production = stats.produces[prodStarKey] || stats.produces["1"] || {};
                const powerOut = (production[ResourceType.Power] as number) || 0;
                if (powerOut > 0) {
                    city.powerCapacity -= powerOut;
                    city.powerAvailable -= powerOut;
                    trackChange(ResourceType.Power, -powerOut, `${t.tile.type} (Failure)`);
                }
            }
        }
    }

    city.jobsCapacity = city.population - city.workforceAvailable;
    city.unemployed = city.workforceAvailable;
};
