
import type { CityState, StatusEffectTrigger, SimulationStats } from '../../types';
import { ResourceType } from '../../types';
import { STATUS_EFFECTS, POPULATION_PARAMS, BUILDING_STATS } from '../../config/buildingStats';

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
            // Demand this turn
            targetValue = stats.powerConsumed;
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
    buildingAlerts: any[],
    unmetPowerDemand: number = 0,
    tiles: { r: number, c: number, tile: any }[] = [] // Optional for tests not passing it
): { city: CityState, stats: SimulationStats } => {

    // 1. Calculate Stats
    // Consumed = Capacity - Available (Leftover)
    const powerConsumed = city.powerCapacity - city.powerAvailable;
    const powerDemand = powerConsumed + unmetPowerDemand; // Total Demand = Consumed + Failed

    // --- Building Fixed Upkeep ---
    let totalFixedUpkeep = 0;
    for (const { tile } of tiles) {
        // Need stats.
        const stats = (BUILDING_STATS as any)[tile.type]?.[String(tile.tier)];
        if (stats?.fixedCost?.money) {
            totalFixedUpkeep += stats.fixedCost.money;
        }
    }

    if (totalFixedUpkeep > 0) {
        city.money -= totalFixedUpkeep;
        netChanges[ResourceType.Money] = (netChanges[ResourceType.Money] || 0) - totalFixedUpkeep;
        breakdown.push({ source: 'Building Upkeep', amount: -totalFixedUpkeep, resource: ResourceType.Money });
    }

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

    // --- Global Economy ---

    // 1. Population Maintenance
    const maintRate = POPULATION_PARAMS.maintenancePerPop || 0.08;
    if (city.population > 0 && maintRate > 0) {
        let maintenanceCost = Math.floor(city.population * maintRate);

        // Apply Meta Rewards (Upkeep Multiplier)
        if (city.upkeepMultiplier && city.upkeepMultiplier !== 1) {
            maintenanceCost = Math.floor(maintenanceCost * city.upkeepMultiplier);
        }

        if (maintenanceCost > 0) {
            city.money -= maintenanceCost;
            netChanges[ResourceType.Money] = (netChanges[ResourceType.Money] || 0) - maintenanceCost;
            breakdown.push({ source: 'Maintenance', amount: -maintenanceCost, resource: ResourceType.Money });
        }
    }

    // 2. Income Tax
    const taxRate = POPULATION_PARAMS.taxPerPop || 0.25;
    if (city.population > 0) {
        const tax = Math.floor(city.population * taxRate);
        if (tax > 0) {
            city.money += tax;
            netChanges[ResourceType.Money] = (netChanges[ResourceType.Money] || 0) + tax;
            breakdown.push({ source: 'Income Tax', amount: tax, resource: ResourceType.Money });
        }
    }

    // 2. Idle Power Costs
    // Reuse specific imports or just magic numbers if config not available in scope
    // Ideally import { POWER_PARAMS } from ...
    // Let's rely on city.powerAvailable being the "Leftover" (Idle) power.
    const idlePower = city.powerAvailable;
    const idleCostRate = 0.15; // Hardcoded fallback or import? 
    // Let's assume 0.15 matching legacy or add import.
    if (idlePower > 0) {
        const idleCost = Math.floor(idlePower * idleCostRate);
        if (idleCost > 0) {
            city.money -= idleCost;
            netChanges[ResourceType.Money] = (netChanges[ResourceType.Money] || 0) - idleCost;
            breakdown.push({ source: 'Grid Inefficiency', amount: -idleCost, resource: ResourceType.Money });
        }
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
