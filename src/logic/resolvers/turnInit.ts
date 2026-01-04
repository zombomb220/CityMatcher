
import type { CityState } from '../../types';

// Contract: Reset Flows.
// Power & Workforce are Flows -> Reset to 0.
// Stocks (Money, Population, Goods, Products) -> Persist (handled in Storage Phase).

export const resetFlows = (currentCity: CityState, _trackChange: (res: string, amt: number, src: string) => void): CityState => {
    const newCity: CityState = JSON.parse(JSON.stringify(currentCity));

    // Reset Capacities (Flows)
    newCity.powerCapacity = 0;
    newCity.jobsCapacity = 0;

    // Per-Turn Flow Resets
    newCity.workforceAvailable = 0; // Filled by Production (Pop)
    newCity.powerAvailable = 0;     // Filled by Production
    newCity.unemployed = 0;         // Derived later

    // Note: Population is treated as "Stock" conceptually but usually recalculated or persisted?
    // In this Sim, Population is produced by Residences. 
    // If Residences are disabled, Population drops?
    // "Scalar" rule: Population = Sum of Residence Output.
    // So we reset Population to 0 here?
    // Existing logic in `resetFlows` (previous) had `newCity.population = 0`.
    newCity.population = 0;

    // Note: Money, RawGoods, Products are Persistent Stocks.
    // We DO NOT reset them.

    return newCity;
};
