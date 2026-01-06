
import type { Cell, CityState, SimulationResult, Tile } from '../../types';
import { resetFlows } from './turnInit';
import { applyStatusEffects } from './statusEffects';
import { resolveProduction } from './production';
import { resolveConsumption } from './consumption';
import { resolveStorage } from './storage';
import { finalizeTurn } from './penalties';
import { checkUnlockConditions, checkSlotUnlock } from '../blueprintManager';
import { ResourceType } from '../../types';

export const runSimulation = (grid: Cell[][], currentCity: CityState): SimulationResult => {
    // 0. Setup Tracking
    const breakdown: { source: string; amount: number; resource: string }[] = [];
    const netChanges: Record<string, number> = {};
    const buildingAlerts: { id: string; type: 'disable' | 'star_loss'; message: string }[] = [];

    const trackChange = (res: string, amount: number, source: string) => {
        if (amount === 0) return;
        netChanges[res] = (netChanges[res] || 0) + amount;
        breakdown.push({ source, amount, resource: res });
    };

    // 1. Turn Init & Reset Flows
    const city = resetFlows(currentCity, trackChange);

    // 2. Apply Status Effects (Modifiers)
    const { productionMultipliers, disabledTypes } = applyStatusEffects(city, trackChange);

    // Collect Tiles for Iteration
    const tiles: { r: number, c: number, tile: Tile }[] = [];
    const buildingCounts: Record<string, number> = {};

    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            const t = grid[r][c].tile;
            if (t) {
                // Pre-turn cleanup?
                // Don't reset stars here, wait for consumption to validate them.
                t.disabled = false;
                t.disabledReason = undefined;

                // If previously disabled, we assume it attempts to start (Star 1 potential).
                // If it was Star 0, `resolveProduction` treats it as Star 1 for output.

                // Check Status Effect Disabling
                if (disabledTypes.has(t.type)) {
                    t.disabled = true;
                    t.disabledReason = "Status Effect";
                    t.stars = 0;
                }

                tiles.push({ r, c, tile: t });
                buildingCounts[t.type] = (buildingCounts[t.type] || 0) + 1;
            }
        }
    }

    // 3. Production Phase (Generate Resources)
    // - Global: Added to City.
    // - Local: Added to tile.producedThisTurn.
    resolveProduction(city, tiles, productionMultipliers, trackChange);

    // 4. Consumption Phase (Satisfy Demands)
    // - Consumes from Neighbors (producedThisTurn > storage).
    // - Updates tile.stars / tile.disabled.
    const { unmetPowerDemand } = resolveConsumption(city, grid, tiles, trackChange, buildingAlerts);

    // 5. Storage Phase (Logistics & Export)
    // - Moves producedThisTurn -> storage.
    // - Handles Caps.
    // - Handles Export (if T3 Warehouse).
    resolveStorage(city, tiles, trackChange);

    // 6. Finalize (Stats & Triggers)

    // Aggregation Step: 
    // Since we used Local Storage, `city.rawGoodsAvailable` and `city.productsAvailable`
    // are currently NOT updated (they are persistent stocks in `city`, but we operated on Tiles).
    // We should Sync: City.Stock = Sum(Tile.Storage).
    // This allows UI to show total available.

    let totalRaw = 0;
    let totalProducts = 0;
    for (const { tile } of tiles) {
        if (tile.storage) {
            totalRaw += tile.storage[ResourceType.RawGoods] || 0;
            totalProducts += tile.storage[ResourceType.Products] || 0;
        }
    }
    // Update City "Available" counters to match reality
    // Note: netChanges tracks deltas, but specific totals might drift if not synced.
    // Let's force sync for correctness.
    city.rawGoodsAvailable = totalRaw;
    city.productsAvailable = totalProducts;

    // Unemployed = Workforce Remaining after Consumption
    city.unemployed = city.workforceAvailable;

    const result = finalizeTurn(city, buildingCounts, netChanges, breakdown, buildingAlerts, unmetPowerDemand, tiles);

    // 7. Unlocks
    const newUnlocks = checkUnlockConditions(result.city, buildingCounts);
    if (newUnlocks.length > 0) {
        const reallyNew = newUnlocks.filter(id => !result.city.blueprintState.unlockedIds.includes(id));
        if (reallyNew.length > 0) {
            result.city.blueprintState.unlockedIds.push(...reallyNew);
            result.city.blueprintState.newUnlocks.push(...reallyNew);
        }
    }

    if (checkSlotUnlock(result.city)) {
        result.city.blueprintState.maxSlots += 1;
        result.city.blueprintState.newUnlocks.push('SLOT_UPGRADE');
    }

    return result;
};
