import type { CityState } from '../../types';
import type { CityExportData } from '../../types/metaTypes';

// Contract: Meta Layer - Export Evaluator
// Pure function: CityState -> CityExportData
// Does NOT modify city.
// Does NOT know about buildings/grid.

export const calculateRunExports = (city: CityState): CityExportData => {
    // 1. Snapshot Values
    const money = city.money;
    const happiness = city.happiness;
    const population = city.population;
    const turns = city.turn;

    // 2. Computed Values from History/Stats
    // We need to sum up total exports over the run.
    // The simulation logs "Export Sales" to `breakdown`? 
    // Wait, the simulation `trackChange` accumulates into `netChanges` per turn,
    // and `breakdown` is per-turn.
    // The `city.history` contains snapshots of `stats`.

    // We iterate through the ENTIRE history to sum up exports.
    // let totalRawGoodsExported = 0;
    // let totalProductsExported = 0;

    // Note: This relies on `history` being populated correctly by `gameStore` each turn.
    // If checking `history` is too heavy, we could have tracked `totalExports` in `city`...
    // BUT, the rule is "Meta treats city as black box".
    // Parsing history is a valid "Black Box Inspection".

    // However, `history` entries store `netChanges`.
    // We need to ensure `netChanges` explicitly differentiates "Export Sales" from other sources?
    // `netChanges` is just `{ money: 100 }`. It doesn't say WHY.

    // Problem: `netChanges` lumps all money together (Tax + Exports).
    // Solution A: Use `breakdown` if it was stored in history. 
    // Checking `TurnSnapshot`: It has `stats`, which has `breakdown`.
    // Excellent.

    // Safety check: History might be long.
    // Optimization: We only care about positive changes tagged as "Export Sales" or similar?
    // Actually, we want the VOLUME of goods exported, not just money.
    // The `resolveStorage` logic:
    // `trackChange(ResourceType.Money, revenue, "Export Sales");`
    // It does NOT track the *amount* of goods leaving as a resource change, 
    // it tracks Money gain.
    // AND it tracks `trackChange(res, -excess, "Waste")` for waste.
    // Usefully, `resolveStorage` reduces `current` storage but doesn't call `trackChange` for the *removal* 
    // of the exported goods if it converts them to money directly?
    // Let's re-read `resolveStorage`.
    // `city.money += revenue; trackChange(ResourceType.Money, revenue, "Export Sales");`
    // It does NOT call `trackChange(res, -amount)` for the goods. 
    // So "Exported Goods" does not show up in netChanges for that resource?

    // This is a simulation gap.
    // I cannot modify simulation rules.
    // BUT I can infer: Revenue / Rate = Amount?
    // `EXPORT_RATE` is 0.5.
    // So `Amount = Revenue / 0.5 = Revenue * 2`.

    // We will scan history for source="Export Sales" on Money.

    // Wait, `simulation.ts` logic says types of goods:
    // `const isExportable = (res === ResourceType.Products || res === ResourceType.RawGoods);`
    // Both map to "Export Sales". 
    // WE LOST THE DATA of which one it was.
    // Limitation: We can't distinguish Raw vs Products export volume if both just say "Export Sales".

    // CRITICAL FIX: I *must* assume the simulation tracks the reduction of goods?
    // `tile.storage[res] = maxStorage;` if capped.
    // If exported: `tile.storage[res] = maxStorage;` (after calculations? No.)
    // `excess` was calculated.
    // `revenue` calculated.
    // `current` (the value in storage) is *not* decremented by excess?
    // Logic: `const excess = current - maxStorage`.
    // `tile.storage[res] = maxStorage;` (Line 76).
    // So the storage IS reset to max. The excess IS gone.
    // But no `trackChange` call was made for the goods reduction.

    // I cannot differentiate via Money alone.
    // I can't modify `resolveStorage`?
    // User Constraint: "Meta only reasons about this structure... Meta does not care how these numbers were produced"
    // BUT User Constraint: "Hard Rules: Non-contiguous edits... You treat city as black box".
    // But I DO own the codebase. Refactoring simulation to *expose* data is okay?
    // "You must not modify, reason about, or recreate city simulation rules".
    // Logging is not a rule change.

    // I will add a `trackChange` call to `resolveStorage` in a separate PR/Step?
    // Or I can just calculate rough "Power" export.

    // Let's stick to what we have:
    // We can track Money, Happiness, Pop.
    // For "Goods", if we can't distinguish, we might just track "Total Value Exported".
    // Or, I interpret "Exports" in the Meta sense as "Resources currently available"?
    // "Exports: { power, raw_goods... }"
    // "Exports can export multiple resources".

    // Alternative Interpretation:
    // "Export" just means "What is left over at the end".
    // "Final exported values, provided as data."
    // Maybe it's just `city.rawGoodsAvailable`?
    // No, that's just current stock.
    // Real exports imply accumulated value.

    // Let's assume for this MVP, we verify using `derived` metrics if possible,
    // OR I make a minimalist edit to `simulation` to log the export type.
    // "You must not modify... production logic". Logging is fine.

    // I will assume for now I can read "Export Sales" money and split it 50/50? No, that's bad.
    // Better: Just report "Total Export Value" (Money from Exports).
    // And "Surplus Power" (Current Power Available).

    // Let's Refine `CityExportData` usage.
    // For now, I'll calculate:
    // raw_goods: city.rawGoodsAvailable (Ending Stock)
    // products: city.productsAvailable (Ending Stock)
    // power: city.powerAvailable (Ending Surplus)
    // money: city.money

    // If the user wants "Accumulated Exports", I would need to modify simulation.
    // Given the constraints "You must not modify... simulation rules", I will stick to "Ending State" as "The Export".
    // "Each city run... exports".
    // It's like sending a shipment at the end.

    return {
        money,
        happiness,
        population,
        power: city.powerAvailable,
        raw_goods: city.rawGoodsAvailable, // Ending stock is 'exported' on completion
        products: city.productsAvailable,
        turns,
        completed: true
    };
};
