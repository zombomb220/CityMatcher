import { v4 as uuidv4 } from 'uuid';
import { BuildingType } from '../types';
import type { Cell, Tile } from '../types';
import { GRID_SIZE, MAX_TIER, SPAWN_WEIGHTS } from '../config/buildingStats';

export const createGrid = (): Cell[][] => {
    const grid: Cell[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        const row: Cell[] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            row.push({ r, c, tile: null });
        }
        grid.push(row);
    }
    return grid;
};

export const generateRandomTile = (forceTier: number = 1): Tile => {
    const rand = Math.random();
    let type: BuildingType = BuildingType.Power; // Default fallback
    let accumulatedWeight = 0;

    for (const [t, weight] of Object.entries(SPAWN_WEIGHTS)) {
        accumulatedWeight += weight;
        if (rand < accumulatedWeight) {
            type = t as BuildingType;
            break;
        }
    }

    return {
        id: uuidv4(),
        type,
        tier: forceTier,
        stars: 0,
    };
};

export const getNeighbors = (r: number, c: number, size: number = GRID_SIZE): { r: number, c: number }[] => {
    const neighbors = [];
    if (r > 0) neighbors.push({ r: r - 1, c }); // N
    if (r < size - 1) neighbors.push({ r: r + 1, c }); // S
    if (c > 0) neighbors.push({ r, c: c - 1 }); // W
    if (c < size - 1) neighbors.push({ r, c: c + 1 }); // E
    return neighbors;
};

export const floodFill = (grid: Cell[][], startR: number, startC: number): { r: number, c: number }[] => {
    const startTile = grid[startR][startC].tile;
    if (!startTile) return [];

    const visited = new Set<string>();
    const cluster: { r: number, c: number }[] = [];
    const queue = [{ r: startR, c: startC }];
    visited.add(`${startR},${startC}`);

    // Type and Tier to match
    const targetType = startTile.type;
    const targetTier = startTile.tier;

    while (queue.length > 0) {
        const curr = queue.shift()!;
        cluster.push(curr);

        const neighbors = getNeighbors(curr.r, curr.c);
        for (const n of neighbors) {
            const key = `${n.r},${n.c}`;
            if (visited.has(key)) continue;

            const neighborTile = grid[n.r][n.c].tile;
            if (neighborTile &&
                neighborTile.type === targetType &&
                neighborTile.tier === targetTier) {

                visited.add(key);
                queue.push(n);
            }
        }
    }

    return cluster;
};

// Returns true if a merge happened
export const resolveMerge = (grid: Cell[][], startR: number, startC: number): boolean => {
    let activeR = startR;
    let activeC = startC;
    let cascades = 0;
    const MAX_CASCADES = 3;
    let mergeHappened = false;

    while (cascades < MAX_CASCADES) {
        const tile = grid[activeR][activeC].tile;
        // If tile is gone (shouldn't happen logic wise if we manage it right) or at max tier
        if (!tile || tile.tier >= MAX_TIER) break;

        // 1. Find cluster
        const cluster = floodFill(grid, activeR, activeC);

        // 2. Check size >= 3
        if (cluster.length < 3) break;

        // 3. Merge: Consume 3 tiles (Active + 2 others)
        // Sort cluster by distance to active (Active is distance 0)
        // Use stable sort or deterministic logic: Distance then Row/Col index
        cluster.sort((a, b) => {
            const distA = Math.abs(a.r - activeR) + Math.abs(a.c - activeC);
            const distB = Math.abs(b.r - activeR) + Math.abs(b.c - activeC);
            if (distA !== distB) return distA - distB;
            // Tie breaking for determinism
            if (a.r !== b.r) return a.r - b.r;
            return a.c - b.c;
        });

        // Take first 3: [0] is active, [1] and [2] are neighbors to remove
        // Remove [1] and [2]
        const remove1 = cluster[1];
        const remove2 = cluster[2];

        grid[remove1.r][remove1.c].tile = null;
        grid[remove2.r][remove2.c].tile = null;

        // Upgrade Active ([0])
        grid[activeR][activeC].tile = {
            ...tile,
            tier: tile.tier + 1
        };

        mergeHappened = true;
        cascades++;
        // Loop continues with new active tile at same position to check for cascades
    }

    return mergeHappened;
};
