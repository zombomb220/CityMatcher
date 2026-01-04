
import type { CityState, Tile } from '../../types';
import { ResourceType } from '../../types';
import { BUILDING_STATS } from '../../config/buildingStats';

// Contract: Production Phase
// 1. Apply Multipliers
// 2. Generate Resources
//    - Global (Money, Power, Pop) -> City State
//    - Local (RawGoods, Products) -> Tile.producedThisTurn

export const resolveProduction = (
    city: CityState,
    tiles: { r: number, c: number, tile: Tile }[],
    multipliers: Record<string, number>,
    trackChange: (res: string, amt: number, src: string) => void
): void => {

    const getMultiplier = (type: string) => {
        const specific = multipliers[type] || 1;
        const global = multipliers['all'] || 1;
        return specific * global;
    };

    for (const { tile } of tiles) {
        // Skip disabled? 
        // Note: In Production Phase, we usually assume building IS enabled if it was enabled last turn?
        // OR does Production happen AFTER consumption?
        // Standard Sim Rule: Production happens based on "Potential". 
        // Consumption determines if it *stays* enabled or *actually* produces?
        // In this architecture (Sim City style):
        // 1. Determine Potential Production (Here) ? 
        //    Actually no, usually Consumption (Input) -> Production (Output).
        //    But `simulation.ts` Monolith had: "Evaluate Requirements" -> "Consume" -> "Produce".
        //    
        //    If we split them:
        //    Option A: Production happens at START (based on last turn's state?). 
        //    Option B: Consumption Phase determines "Active State", then Production Phase generates output.
        //
        //    The Plan says: "Production attempts to output... Consumption pulls from producedThisTurn".
        //    This implies Production happens FIRST? 
        //    "Consumption pulls from producedThisTurn (Fresh)" -> Yes, implies Production is first.
        //
        //    So:
        //    1. Production (Assume inputs will be met? Or Free Production?)
        //       - Power Plants: Require Money/Workforce.
        //       - Farms: Require nothing?
        //       - Factories: Require Power.
        //
        //    If Production is First, it's "Optimistic Production".
        //    "I produce 5 goods."
        //    Then Consumption: "I need 5 goods. Oh neighbor has 5 producedThisTurn. Taking them."
        //    
        //    But what if the Factory (Producer) itself fails its consumption?
        //    E.g. Factory needs Power.
        //    If Factory produces FIRST, it outputs Goods.
        //    Then Consumption runs. Factory checks Power. Fails.
        //    Does the Goods disappear?
        //    
        //    This "Production First" model allows "Instant Chains" (Power -> Factory -> Shop in 1 turn).
        //    But it risks "Zombie Production" (Factory produces even if no power).
        //    
        //    mitigation:
        //    If Consumption fails later, we can "Revoke" production?
        //    Or we accept that "This Turn's Production" was based on "Last Turn's State"?
        //    
        //    Let's stick to the Plan: "Consumption pulls from producedThisTurn".
        //    So Production MUST be first.
        //    We generates `producedThisTurn`.
        //    If later the building is disabled (in Consumption), we might need to clear it?
        //    
        //    Let's produce based on `tile.stars` (current state).

        const stats = BUILDING_STATS[tile.type]?.[String(tile.tier) as "1" | "2" | "3"];
        if (!stats) continue;

        // Use current stars (from last turn end)
        // If stars=0, it's disabled. No production.
        // EXCEPT: Power Plants might be T1/Stars 1 by default?
        // Logic: if stars == 0, try to produce as Star 1? 
        // In monolith, we checked reqs for Star 1.
        // Here, we just respect `tile.stars`.
        // If it was disabled last turn, stars=0. 
        // How does it ever start?
        // 
        // We need a "Startup" or "Potential" check.
        // Let's assume everything tries to be at least Star 1 if configured?
        // Or handle "Turning On" in consumption?

        // Let's rely on `tile.stars`. If 0, treat as 0 (No production).
        // But then a disabled building never recovers.
        // Simulation loop usually:
        // 1. Reset (Assume Star 1 potential).
        // 2. Production (Optimistic).
        // 3. Consumption (Validation). If fail -> Star 0.
        //
        // Let's follow that: Optimistically assume Star 1 if Star is 0.

        const effectiveStars = (tile.stars === 0) ? 1 : tile.stars;

        const prodConfig = stats.produces?.[String(effectiveStars) as "1" | "2" | "3"];
        if (!prodConfig) continue;

        const mult = getMultiplier(tile.type);

        for (const [res, baseAmount] of Object.entries(prodConfig)) {
            const amount = Math.floor((baseAmount as number) * mult);
            if (amount <= 0) continue;

            // Global Resources -> Commit immediately
            if (res === ResourceType.Power || res === ResourceType.Money || res === ResourceType.Population || res === ResourceType.Happiness) {
                // Determine target pool
                if (res === ResourceType.Power) {
                    city.powerCapacity += amount;
                    city.powerAvailable += amount;
                    trackChange(ResourceType.Power, amount, tile.type);
                } else if (res === ResourceType.Money) {
                    city.money += amount;
                    trackChange(ResourceType.Money, amount, tile.type);
                } else if (res === ResourceType.Population) {
                    city.population += amount;
                    city.workforceAvailable += amount; // Pop = Workforce
                    trackChange(ResourceType.Population, amount, tile.type);
                } else if (res === ResourceType.Happiness) {
                    city.happiness += amount;
                    trackChange(ResourceType.Happiness, amount, tile.type);
                }
            } else {
                // Local Resources -> Store in `producedThisTurn` for spatial consumption
                tile.producedThisTurn = tile.producedThisTurn || {};
                tile.producedThisTurn[res] = (tile.producedThisTurn[res] || 0) + amount;

                // Track for UI stats (even though it's local)
                trackChange(res, amount, tile.type);
            }
        }
    }
};
