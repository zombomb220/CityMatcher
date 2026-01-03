
import type { CityState, StatusEffectTrigger, SimulationStats } from '../../types';
import { ResourceType } from '../../types';
import { STATUS_EFFECTS, POPULATION_PARAMS } from '../../config/buildingStats';

// Contract: Finalize Turn.
// 1. Calculate Coverage/Unemployment.
// 2. Evaluate Status Triggers (for NEXT turn).
// 3. Generate Stats Snapshot.

// Re-using checkTrigger logic - duplicated for now to avoid circular imports or extract to helper
const checkTrigger = (trigger: StatusEffectTrigger, city: CityState, buildingCounts: Record<string, number>, stats: SimulationStats): boolean => {
    let actualValue: number = 0;

    // Resolve dynamic Values
    let targetValue = trigger.value;
    if (typeof targetValue === 'string') {
        if (targetValue === 'powerDemand') {
            // Demand this turn = Consumed
            actualValue = stats.powerConsumed;
            // Logic check: "Power Capacity < Power Demand".
            // If trigger.target is powerCapacity.
            // We need to match target properly.
        }
        // ...
    }

    // Resolve Target
    if (trigger.type === 'resource') {
        if (trigger.target === 'powerCapacity') actualValue = city.powerCapacity;
        else actualValue = (city as any)[trigger.target] || 0; // Validated schema helps, but runtime strictness
    } else if (trigger.type === 'stat') {
        if (trigger.target === 'unemployed') actualValue = city.unemployed;
        else if (trigger.target === 'serviceCoverage') actualValue = city.serviceCoverage || 0;
    } else if (trigger.type === 'building_count') {
        actualValue = buildingCounts[trigger.target] || 0;
    } else if (trigger.type === 'turn') {
        actualValue = city.turn;
    }

    const tVal = typeof targetValue === 'number' ? targetValue : 0; // Simple coerce

    switch (trigger.comparison) {
        case '>=': return actualValue >= tVal;
        case '<=': return actualValue <= tVal;
        case '>': return actualValue > tVal;
        case '<': return actualValue < tVal;
        case '==': return actualValue === tVal;
        default: return false;
    }
};

export const finalizeTurn = (
    city: CityState,
    buildingCounts: Record<string, number>,
    netChanges: Record<string, number>,
    breakdown: any[],
    buildingAlerts: any[]
): { city: CityState, stats: SimulationStats } => {

    // 1. Calculate Stats
    const powerDemand = city.powerCapacity - city.powerAvailable; // Consumed

    // Coverage Logic
    // Jobs Coverage + Product Coverage
    // Product Coverage??
    // Old logic: `coverageProd = consumed / population`.
    // We didn't track "Products Consumed by Population" in this refactor yet?
    // MISSING LOGIC: Population Consumption logic (Eats Products?).
    // Design Contract: "Products ... Stock Persistent". 
    // "No automatic happiness purchase".
    // "Population -> Money (tax)".
    // Did we remove "Population EATS Products"?
    // "Shops → Products".
    // "Consumption Phase ... Resolve consumption".
    // If Population consumes Products, it should have been a "Consumer" in the list?
    // But Pop is not a Tile.
    // ADDITION: Population consumes Products at end of consumption?
    // "Population consumption of Products" was part of happiness logic.
    // Let's standardise: 
    // Population consumes Products -> Happiness/Money?
    // If omitted, Service Coverage drops.

    // Let's implement Population Consumption here (simple step).
    const productsNeeded = city.population * POPULATION_PARAMS.productConsumptionRate;
    const productsConsumed = Math.min(city.productsAvailable, productsNeeded);
    if (productsConsumed > 0) {
        city.productsAvailable -= productsConsumed;
        city.money += productsConsumed * 2; // Sales Tax? (Old Logic)
        netChanges[ResourceType.Products] = (netChanges[ResourceType.Products] || 0) - productsConsumed;
        netChanges[ResourceType.Money] = (netChanges[ResourceType.Money] || 0) + (productsConsumed * 2);

        // Log for UI Breakdown
        breakdown.push({ source: 'Population', amount: -productsConsumed, resource: ResourceType.Products });
        breakdown.push({ source: 'Sales Tax', amount: productsConsumed * 2, resource: ResourceType.Money });
    }

    const jobCoverage = city.population > 0 ? (city.population - city.unemployed) / city.population : 1;
    const productCoverage = city.population > 0 ? (productsConsumed / city.population) : 1;
    city.serviceCoverage = Math.floor(((jobCoverage + productCoverage) / 2) * 100);

    const stats: SimulationStats = {
        powerProduced: city.powerCapacity,
        powerConsumed: powerDemand,
        powerUtilization: city.powerCapacity > 0 ? powerDemand / city.powerCapacity : 0,
        powerStars: 0,
        netChanges,
        breakdown,
        buildingAlerts
    };

    city.lastTurnStats = {
        powerNet: city.powerAvailable,
        powerDemand: powerDemand,
        workforceNet: city.workforceAvailable,
        rawGoodsNet: netChanges[ResourceType.RawGoods] || 0,
        productsNet: netChanges[ResourceType.Products] || 0,
        moneyNet: netChanges[ResourceType.Money] || 0,
        popNet: netChanges[ResourceType.Population] || 0,
    };

    // 2. Evaluate Status Triggers (Set for NEXT turn)
    const nextActiveEffects: string[] = [];
    for (const effect of STATUS_EFFECTS) {
        const match = effect.trigger.every(t => checkTrigger(t, city, buildingCounts, stats));
        if (match) {
            nextActiveEffects.push(effect.id);
        }
    }
    city.activeStatusEffects = nextActiveEffects;

    return { city, stats };
};
