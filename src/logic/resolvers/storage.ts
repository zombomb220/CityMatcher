
import type { CityState, Tile } from '../../types';
import { ResourceType, BuildingType } from '../../types';
import { PRODUCT_PARAMS } from '../../config/buildingStats';

// Contract: Storage & Logistics Phase
// 1. Check Logistics Network (Global Export Hub?)
// 2. Move Fresh Production -> Storage
// 3. Handle Overflow (Export vs Waste)

export const resolveStorage = (
    city: CityState,
    tiles: { r: number, c: number, tile: Tile }[],
    trackChange: (res: string, amt: number, src: string) => void
): void => {

    // 1. Check Export Capability
    // Warehouse Tier 3 enables exports.
    const hasExportHub = tiles.some(t =>
        t.tile.type === BuildingType.Warehouse && t.tile.tier >= 3 && !t.tile.disabled
    );

    const EXPORT_RATE = 0.5; // Money per unit

    for (const { tile } of tiles) {
        // Initialize storage if missing
        tile.storage = tile.storage || {};

        // 2. Merge Fresh Production
        if (tile.producedThisTurn) {
            for (const [res, amount] of Object.entries(tile.producedThisTurn)) {
                tile.storage[res] = (tile.storage[res] || 0) + amount;
            }
            // Clear fresh production (it's in storage now)
            tile.producedThisTurn = {};
        }

        // 3. Apply Limits & Export Logic
        // Determine Max Storage for this tile
        // Default 10? Or Config based?
        // Using `spoilageThreshold` as `maxStorage` for now as generic cap.
        const maxStorage = PRODUCT_PARAMS.spoilageThreshold || 24;

        for (const res of Object.keys(tile.storage)) {
            const current = tile.storage[res]!;

            if (current > maxStorage) {
                const excess = current - maxStorage;
                let exported = false;

                // Export Check
                // Must have Hub AND be an Exportable Resource (Products, RawGoods)
                const isExportable = (res === ResourceType.Products || res === ResourceType.RawGoods);

                if (hasExportHub && isExportable) {
                    // SELL
                    const revenue = Math.floor(excess * EXPORT_RATE);
                    if (revenue > 0) {
                        city.money += revenue;
                        trackChange(ResourceType.Money, revenue, "Export Sales");
                        exported = true;
                    }
                }

                // If not exported, it is WASTED.
                if (!exported && excess > 0) {
                    // Log waste?
                    // trackChange(res, -excess, "Waste (Overflow)"); 
                    // This subtracts from netChanges. Good for stats.
                    // But we want a "Waste" counter specifically?
                    // trackChange uses 'source'.
                    trackChange(res, -excess, "Waste");
                }

                // Clamp to Max
                tile.storage[res] = maxStorage;
            }
        }
    }
};
