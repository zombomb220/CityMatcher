
import type { Cell, CityState, SimulationResult } from '../../types';
// ResourceType removed
import { resetFlows } from './turnInit';
import { applyStatusEffects } from './statusEffects';
import { produceResources } from './production';
import { resolveConsumption } from './consumption';
import { finalizeTurn } from './penalties';
import { checkUnlockConditions, checkSlotUnlock } from '../blueprintManager';

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

    // Collect Tiles
    const tiles: any[] = [];
    const buildingCounts: Record<string, number> = {};
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            const t = grid[r][c].tile;
            if (t) {
                t.disabled = false; // Reset disabled state (will be re-evaluated)
                t.disabledReason = undefined;
                delete t.missingReqs; // Clear missing reqs too

                // If it was disabled (Level 0), try to restart at Level 1
                if (t.stars === 0) {
                    t.stars = 1;
                }

                tiles.push({ r, c, tile: t });
                buildingCounts[t.type] = (buildingCounts[t.type] || 0) + 1;
            }
        }
    }

    // 3. Production Phase (Add to pools)
    produceResources(city, tiles, productionMultipliers, disabledTypes, trackChange);

    // 4. Consumption Phase (Draw from pools)
    resolveConsumption(city, tiles, trackChange, buildingAlerts);

    // 5. Finalize (Stats & Triggers)
    const result = finalizeTurn(city, buildingCounts, netChanges, breakdown, buildingAlerts);

    // 6. Check Blueprints & Unlocks (Post-Turn)
    // We check against the FINAL state of the city (after production/consumption)
    const newUnlocks = checkUnlockConditions(result.city, buildingCounts);
    if (newUnlocks.length > 0) {
        // Filter out already unlocked ones just in case checkUnlockConditions didn't (it does, but safety first)
        const reallyNew = newUnlocks.filter(id => !result.city.blueprintState.unlockedIds.includes(id));

        if (reallyNew.length > 0) {
            result.city.blueprintState.unlockedIds = [...result.city.blueprintState.unlockedIds, ...reallyNew];
            // Add to newUnlocks list for UI notification
            result.city.blueprintState.newUnlocks = [...result.city.blueprintState.newUnlocks, ...reallyNew];
        }
    }

    // Check Slot Unlock (Event-based logic, effectively)
    if (checkSlotUnlock(result.city)) {
        // If true, it means we met criteria to gain a slot.
        // We probably need a flag to track if we ALREADY gave this bonus? 
        // checkSlotUnlock implementation checks "if maxSlots >= 4 return false".
        // So it's safe to call repeatedly until condition met, then once met, it bumps maxSlots.
        // Wait, if it returns true, we bump. Next turn, maxSlots is 4. checkSlotUnlock returns false. Correct.
        result.city.blueprintState.maxSlots += 1;
        // Optional: Add notification for slot unlock?
        // Maybe add a special ID to newUnlocks?
        result.city.blueprintState.newUnlocks.push('SLOT_UPGRADE');
    }

    return result;
};
