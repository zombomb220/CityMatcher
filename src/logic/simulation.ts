
import type { Cell, CityState, SimulationResult, Tile, Resources, BuildingStats } from '../types';
import { ResourceType } from '../types';
import { getTilesInRadius } from './grid';
import gameDataRaw from '../config/gameData.json';
import { checkUnlockConditions, checkSlotUnlock } from './blueprintManager';

// Type assertion for gameData since JSON imports can be loosely typed
const GAME_DATA = gameDataRaw as any;

// Helper to clone state shallowly or deeply where needed
const cloneState = (city: CityState) => {
    const nextCity = JSON.parse(JSON.stringify(city));
    return { nextCity };
};

export const runSimulation = (grid: Cell[][], currentCity: CityState): SimulationResult => {
    const { nextCity } = cloneState(currentCity);
    const nextGrid = grid; // Mutate in place to match legacy behavior and test expectations

    // 0. Initialization & Global Updates
    nextCity.turn += 1;

    // Reset global available pools (they are aggregations for UI, not used for logic except Money)
    nextCity.workforceAvailable = 0;
    nextCity.powerAvailable = 0;
    nextCity.rawGoodsAvailable = 0;
    nextCity.productsAvailable = 0;
    nextCity.unemployed = 0; // derived
    nextCity.jobsCapacity = 0; // derived from factories/shops reqs? Or just purely informational now.

    // Track detailed stats
    const stats = {
        powerProduced: 0,
        powerConsumed: 0,
        powerUtilization: 0,
        powerStars: 0,
        netChanges: {} as Record<string, number>,
        breakdown: [] as { source: string; amount: number; resource: string }[],
        buildingAlerts: [] as { id: string; type: 'disable' | 'star_loss'; message: string }[]
    };

    const trackChange = (res: string, amount: number, source: string) => {
        if (amount === 0) return;
        stats.netChanges[res] = (stats.netChanges[res] || 0) + amount;
        stats.breakdown.push({ source, amount, resource: res });

        // Update global city counters for UI
        if (res === ResourceType.Money) nextCity.money += amount;
        if (res === ResourceType.Population) nextCity.population += amount;
        if (res === ResourceType.Happiness) nextCity.happiness += amount;
        // Other resources are local, but we might aggregate totals for "Available" display
        if (res === ResourceType.Power) nextCity.powerAvailable += amount;
        if (res === ResourceType.Workforce) nextCity.workforceAvailable += amount;
        if (res === ResourceType.RawGoods) nextCity.rawGoodsAvailable += amount;
        if (res === ResourceType.Products) nextCity.productsAvailable += amount;
    };

    // 1. Collect All Tiles
    const tiles: { r: number, c: number, tile: Tile, config: BuildingStats }[] = [];
    const buildingCounts: Record<string, number> = {};

    for (let r = 0; r < nextGrid.length; r++) {
        for (let c = 0; c < nextGrid[0].length; c++) {
            const tile = nextGrid[r][c].tile;
            if (tile) {
                const config = GAME_DATA.buildingStats[tile.type][tile.tier];
                tiles.push({ r, c, tile, config });
                buildingCounts[tile.type] = (buildingCounts[tile.type] || 0) + 1;

                // Reset per-turn state
                tile.producedThisTurn = {}; // Clear transient output
                tile.missingReqs = undefined;
                tile.disabled = false;
                if (!tile.storage) tile.storage = {};
            }
        }
    }

    // Sort tiles by Priority (ascending)
    // Priority: Power(0) -> Res(1) -> Fac(2) -> Shop(3)
    tiles.sort((a, b) => {
        if (a.config.priority !== b.config.priority) {
            return a.config.priority - b.config.priority;
        }
        // Tie-break by ID for determinism
        return a.tile.id.localeCompare(b.tile.id);
    });

    // 2. Resolution Loop
    for (const { r, c, tile, config } of tiles) {
        const radius = config.influenceRadius || 2;
        const neighbors = getTilesInRadius(nextGrid, r, c, radius);

        // --- 2a. Determine Requirements ---
        // We check what we *would* need for Star 1, 2, 3

        // Helper: Check if a set of requirements can be met by neighbors
        // Returns: { met: boolean, consumers: { tile: Tile, resource: string, amount: number }[] }
        // We perform "Dry Run" first, then "Commit".

        const trySatisfy = (requirements: Resources): boolean => {
            if (!requirements) return true;

            for (const [res, amount] of Object.entries(requirements)) {
                if (amount <= 0) continue;

                // Special Global Resources
                if (res === ResourceType.Money) {
                    if (nextCity.money < amount) return false;
                    continue; // Check next resource
                }

                // Local Resources: Search neighbors
                let found = 0;

                // 1. Check Self Storage
                if (tile.storage && tile.storage[res]) {
                    found += tile.storage[res]!;
                }

                // 2. Check Neighbors (Produced This Turn or Storage)
                if (found < amount) {
                    for (const n of neighbors) {
                        // Can we take from n?
                        // We can take from n.storage (leftover from prev turn)
                        // OR n.producedThisTurn (created this turn by higher priority)

                        // We must NOT double count. 
                        // But here we are just checking availability.
                        // Actual consumption logic needs to be careful.

                        const available = (n.tile.storage?.[res] || 0) + (n.tile.producedThisTurn?.[res] || 0);
                        found += available;
                        if (found >= amount) break;
                    }
                }

                if (found < amount) return false;
            }
            return true;
        };

        const consume = (requirements: Resources) => {
            if (!requirements) return;

            for (const [res, amount] of Object.entries(requirements)) {
                if (amount <= 0) continue;

                let remainingNeeded = amount;

                // Global Money
                if (res === ResourceType.Money) {
                    trackChange(res, -amount, tile.type); // Deduct generic money (fn handles city.money)
                    continue;
                }

                // 1. Consume from Self Storage
                if (tile.storage && tile.storage[res]) {
                    const take = Math.min(tile.storage[res]!, remainingNeeded);
                    tile.storage[res]! -= take;
                    remainingNeeded -= take;
                    // trackChange(res, -take, tile.type + " (Self)"); // Local consumption doesn't need global logging?
                    // Maybe log "Consumption" for debug?
                }

                if (remainingNeeded <= 0) continue;

                // 2. Consume from Neighbors
                // Sort neighbors by distance? Or just iterate.
                // Distance sort sounds better for "Local" feel.
                const sortedNeighbors = [...neighbors].sort((a, b) => {
                    const distA = Math.max(Math.abs(a.r - r), Math.abs(a.c - c));
                    const distB = Math.max(Math.abs(b.r - r), Math.abs(b.c - c));
                    return distA - distB;
                });

                for (const n of sortedNeighbors) {
                    if (remainingNeeded <= 0) break;

                    // Priority: Consume 'producedThisTurn' first? Or 'storage' first?
                    // Spoilage: Storage decays. ProducedThisTurn might decay.
                    // Usually consume oldest (storage) first to avoid decay.

                    // Check Storage
                    if (n.tile.storage?.[res]) {
                        const take = Math.min(n.tile.storage[res]!, remainingNeeded);
                        n.tile.storage[res]! -= take;
                        remainingNeeded -= take;
                    }

                    if (remainingNeeded <= 0) continue;

                    // Check ProducedThisTurn
                    if (n.tile.producedThisTurn?.[res]) {
                        const take = Math.min(n.tile.producedThisTurn[res]!, remainingNeeded);
                        n.tile.producedThisTurn[res]! -= take;
                        remainingNeeded -= take;
                    }
                }
            }
        };

        // --- 2b. Evaluate Stars ---

        let newStars = 0;
        let satisfiedReqs: Resources | null = null;

        // Check Base (Level 1 / Enabled)
        if (trySatisfy(config.baseRequirements)) {
            newStars = 1;
            satisfiedReqs = { ...config.baseRequirements };

            // Check Star 2
            if (trySatisfy({ ...config.baseRequirements, ...config.starRequirements?.[2] })) {
                newStars = 2;
                satisfiedReqs = { ...config.baseRequirements, ...config.starRequirements?.[2] };

                // Check Star 3
                if (trySatisfy({ ...config.baseRequirements, ...config.starRequirements?.[3] })) {
                    newStars = 3;
                    satisfiedReqs = { ...config.baseRequirements, ...config.starRequirements?.[3] };
                }
            }
        }

        // --- 2c. Execute Consumption & Update State ---

        if (newStars === 0) {
            tile.stars = 0;
            tile.disabled = true;
            tile.disabledReason = "Missing Input"; // TODO: Be more specific
            // Identify missing resource from Base Reqs
        } else {
            tile.stars = newStars;
            // Execute consumption
            if (satisfiedReqs) consume(satisfiedReqs);

            // --- 3. Production ---
            // If active, produce
            if (newStars > 0) {
                const output = config.produces?.[String(newStars) as '1' | '2' | '3'];
                if (output) {
                    // Add to Global Stats OR Local Storage
                    for (const [res, amount] of Object.entries(output)) {
                        // Global Resources
                        if (['money', 'happiness', 'population'].includes(res)) {
                            trackChange(res, amount as number, tile.type);
                        } else {
                            // Local Resources -> Add to `producedThisTurn` for neighbors to use immediately (or store)
                            tile.producedThisTurn = tile.producedThisTurn || {};
                            tile.producedThisTurn[res] = (tile.producedThisTurn[res] || 0) + (amount as number);

                            // Also track creation in stats for visibility?
                            trackChange(res, amount as number, tile.type);
                        }
                    }
                }
            }
        }
    }

    // 3. Post-Loop: Migration & Decay
    // Move 'producedThisTurn' to 'storage'
    // Apply Decay

    // Decay params
    const DECAY_RATES: Record<string, number> = {
        [ResourceType.RawGoods]: GAME_DATA.productParams?.decayRate || 0.1, // assuming raw goods decay
        [ResourceType.Products]: GAME_DATA.productParams?.decayRate || 0.1,
        // Power and Workforce reset every turn (do not persist)
        [ResourceType.Power]: 1.0,
        [ResourceType.Workforce]: 1.0,
    };

    for (const { tile } of tiles) {
        // --- 4. Store Unused Production (Local) ---
        // If a building produced something but it wasn't fully consumed by neighbors in step 2b/2c?
        // Actually, step 2b/2c was about consuming FROM neighbors.
        // Where did we add to our own producedThisTurn?
        // We added to `producedThisTurn` in Step 3.

        // Decay & Spoilage
        if (tile.producedThisTurn) {
            for (const [res, amount] of Object.entries(tile.producedThisTurn)) {
                // Initialize storage if needed
                tile.storage = tile.storage || {};

                // Add new production to storage (it survives this turn, will decay next turn start/end?)
                // Design Doc: "Unused resources... decay... 5-10%."
                // "Spoilage: If > 24 units, all lost."

                // Merge into storage
                tile.storage[res] = (tile.storage[res] || 0) + amount;
            }
            // Clear producedThisTurn for next frame (conceptually)
            // But we clone state anyway.
        }

        // Apply Decay to Storage
        if (tile.storage) {
            for (const res of Object.keys(tile.storage)) {
                // Products spoil if > 24
                if (res === ResourceType.Products) {
                    const current = tile.storage[res]!;
                    const threshold = GAME_DATA.productParams?.spoilageThreshold || 24;

                    if (current > threshold) {
                        tile.storage[res] = 0;
                        // logs.push(`[${tile.id}] Spoilage! Lost ${current} products.`); // Assuming logs is defined
                        continue;
                    }
                }

                // General decay 5%
                const decayRate = DECAY_RATES[res] || 0; // Use the defined decay rates
                const current = tile.storage[res]!;
                if (current > 0 && decayRate > 0) {
                    const lose = Math.ceil(current * decayRate); // Integers?
                    if (lose > 0) {
                        tile.storage[res] = Math.max(0, current - lose);
                        // logs.push(`[${tile.id}] Decay ${res}: -${lose}`);
                    }
                }
            }
        }
    }

    // 4. Check Unlocks
    const newUnlocks = checkUnlockConditions(nextCity, buildingCounts);
    if (newUnlocks.length > 0) {
        const reallyNew = newUnlocks.filter(id => !nextCity.blueprintState.unlockedIds.includes(id));
        if (reallyNew.length > 0) {
            nextCity.blueprintState.unlockedIds.push(...reallyNew);
            nextCity.blueprintState.newUnlocks.push(...reallyNew);
        }
    }

    // Check Slot Unlocks
    if (checkSlotUnlock(nextCity)) {
        nextCity.blueprintState.maxSlots += 1;
        nextCity.blueprintState.newUnlocks.push('SLOT_UPGRADE');
    }

    return {
        city: nextCity,
        stats: {
            powerProduced: stats.netChanges[ResourceType.Power] || 0,
            powerConsumed: stats.powerConsumed, // need to track
            powerUtilization: 0,
            powerStars: 0,
            netChanges: stats.netChanges,
            breakdown: stats.breakdown,
            buildingAlerts: stats.buildingAlerts
        }
    };
};
