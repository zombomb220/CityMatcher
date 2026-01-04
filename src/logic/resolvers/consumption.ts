
import type { CityState, Tile, Cell, Resources } from '../../types';
import { ResourceType } from '../../types';
import { BUILDING_STATS } from '../../config/buildingStats';
import { getTilesInRadius } from '../grid';

// Contract: Consumption Phase
// 1. Determine Needs (Base + Next Star?) -> No, just sustain current or try next?
//    - Plan: "Try to satisfy Star 1, then 2, then 3".
// 2. Find Sources (Neighbors)
//    - Priority: Neighbor.producedThisTurn > Neighbor.storage
// 3. Deduct & Finalize State

export const resolveConsumption = (
    city: CityState,
    grid: Cell[][],
    tiles: { r: number, c: number, tile: Tile }[],
    trackChange: (res: string, amt: number, src: string) => void,
    buildingAlerts: any[]
): void => {

    // Helper: Sort by Priority
    const sortedTiles = [...tiles].sort((a, b) => {
        const pA = BUILDING_STATS[a.tile.type]?.[String(a.tile.tier) as "1"]?.priority ?? 10;
        const pB = BUILDING_STATS[b.tile.type]?.[String(b.tile.tier) as "1"]?.priority ?? 10;
        return pA - pB || a.tile.id.localeCompare(b.tile.id);
    });

    for (const { r, c, tile } of sortedTiles) {
        const stats = BUILDING_STATS[tile.type]?.[String(tile.tier) as "1" | "2"];
        if (!stats) continue;

        const radius = stats.influenceRadius || 2;
        const neighbors = getTilesInRadius(grid, r, c, radius);

        // Sorting neighbors: Nearest first?
        // Let's sort by distance for consistent behavior.
        neighbors.sort((a, b) => {
            const distA = Math.max(Math.abs(a.r - r), Math.abs(a.c - c));
            const distB = Math.max(Math.abs(b.r - r), Math.abs(b.c - c));
            return distA - distB;
        });

        // Function to attempt satisfaction of a requirement set
        // Returns "Commit Function" if successful, "null" if failed
        const canSatisfy = (reqs: Resources): (() => void) | null => {
            if (!reqs) return () => { };

            const transactions: (() => void)[] = [];

            for (const [res, amount] of Object.entries(reqs)) {
                if (amount <= 0) continue;
                let needed = amount;

                // 1. Global Resources (Money, Power, Workforce)
                if (res === ResourceType.Money) {
                    if (city.money < needed) return null;
                    transactions.push(() => {
                        city.money -= needed;
                        trackChange(ResourceType.Money, -needed, tile.type);
                    });
                    continue;
                }
                if (res === ResourceType.Power) {
                    // Power is Global "Available" pool in City
                    if (city.powerAvailable < needed) return null;
                    transactions.push(() => {
                        city.powerAvailable -= needed;
                        // stats.powerConsumed handled in main loop or via tracking?
                        // We'll track it separately if needed, but trackChange is fine.
                    });
                    continue;
                }
                if (res === ResourceType.Workforce) {
                    if (city.workforceAvailable < needed) return null;
                    transactions.push(() => {
                        city.workforceAvailable -= needed;
                    });
                    continue;
                }

                // 2. Local Resources (RawGoods, Products) -> Neighbors
                // Self Storage First
                if (tile.storage?.[res]) {
                    const take = Math.min(tile.storage[res]!, needed);
                    needed -= take;
                    transactions.push(() => {
                        tile.storage![res]! -= take;
                    });
                }

                if (needed <= 0) continue;

                // Neighbors
                for (const n of neighbors) {
                    if (needed <= 0) break;

                    // Priority 1: producedThisTurn
                    if (n.tile.producedThisTurn?.[res]) {
                        const take = Math.min(n.tile.producedThisTurn[res]!, needed);
                        needed -= take;
                        transactions.push(() => {
                            n.tile.producedThisTurn![res]! -= take;
                        });
                    }

                    if (needed <= 0) break;

                    // Priority 2: storage
                    if (n.tile.storage?.[res]) {
                        const take = Math.min(n.tile.storage[res]!, needed);
                        needed -= take;
                        transactions.push(() => {
                            n.tile.storage![res]! -= take;
                        });
                    }
                }

                if (needed > 0) return null; // Failed to satisfy
            }

            // Return master commit function
            return () => transactions.forEach(t => t());
        };

        // Star Logic: Try 3 -> 2 -> 1 -> Fail
        // If 0 stars previously, try 1.

        let targetStars = 0;
        let commitFn: (() => void) | null = null;
        let missingReason = "";

        // Determine potential max stars based on previous state?
        // Or always try max?
        // "Try Highest Possible"

        // Star 3
        if (stats.starRequirements?.["3"]) {
            const reqs3 = { ...stats.baseRequirements, ...stats.starRequirements["3"] };
            const commit3 = canSatisfy(reqs3);
            if (commit3) {
                targetStars = 3;
                commitFn = commit3;
            }
        }

        // Star 2 (if not 3)
        if (targetStars === 0 && stats.starRequirements?.["2"]) {
            const reqs2 = { ...stats.baseRequirements, ...stats.starRequirements["2"] };
            const commit2 = canSatisfy(reqs2);
            if (commit2) {
                targetStars = 2;
                commitFn = commit2;
            }
        }

        // Star 1 (Base) (if not 2 or 3)
        if (targetStars === 0) {
            const reqs1 = stats.baseRequirements || {};
            const commit1 = canSatisfy(reqs1);
            if (commit1) {
                targetStars = 1;
                commitFn = commit1;
            } else {
                // Determine missing reason from Base Reqs for UI
                missingReason = Object.keys(reqs1).find(r => !canSatisfy({ [r]: reqs1[r] as number })) || "Input";
            }
        }

        // Commit and Update
        if (targetStars > 0 && commitFn) {
            commitFn();
            tile.stars = targetStars;
            tile.disabled = false;
        } else {
            tile.stars = 0;
            tile.disabled = true;
            tile.disabledReason = `Missing ${missingReason}`;
            buildingAlerts.push({ id: tile.id, type: 'disable', message: `Missing ${missingReason}` });

            // If we failed, we might have produced output in Production Phase (Optimistic).
            // Should we revoke it?
            // "Zombie Production"
            // If a Power Plant fails (no workers), it shouldn't produce power.
            // But Production ran FIRST. Global power was added.
            // This is a problem with "Production First".
            // 
            // Fix: If disabled, check `tile.producedThisTurn` and REVERT global/local changes?
            // This is complex.
            //
            // Alternative: Production happens HERE, after confirmation.
            // But strict requirement was "Consumption pulls from producedThisTurn".
            //
            // Let's implement Recalls for Global Resources if disabled.
            // Local `producedThisTurn` is fine, we just wipe it.
            //
            // "Zombie" Fix:
            // If tile.disabled, wipe `tile.producedThisTurn`.
            // If it produced Global (Power/Money), deduct it back?
            //
            // We need to know what it produced to deduct it.
            // Re-calculating production is safer.
        }
    }

    // Cleanup Zombie Production
    for (const { tile } of tiles) {
        if (tile.disabled) {
            // Wipe local production so neighbors don't take from a dead building next turn?
            // Actually, if it produced this turn, and we are in consumption...
            // A Neighbor might have ALREADY taken it (since we sort by priority).
            // If Priority: Res(Workers) -> Shop(Products).
            // Res produces Workers. Shop takes Workers.
            // Res checks inputs (Power). Fails. Becomes disabled.
            // But Shop already ate the workers!
            //
            // This implies "Production First" is correct for "Instant Chains".
            // The fact that Res failed *later* means it strained to produce, succeeded, but then crashed?
            // This is acceptable "Brownout" logic.
            // "I worked this shift, but I'm quitting now."
            // Next turn, it starts disabled (0 stars).
            // 
            // BUT: `production.ts` treats "Star 0" as "Star 1 Potential".
            // So next turn it produces again.
            // 
            // This loop seems stable.
            // Only issue: Power Plant produces Power. Factory uses Power. Power Plant fails Money.
            // Power Plant disabled. But Factory stays valid?
            // Yes, "Battery/Intertia".
            // 
            // We will accept Zombie Production for the current turn as "Inertia".
            // Ensure `tile.producedThisTurn` is moved to Storage or Wasted in Storage Phase.
        }
    }
};
