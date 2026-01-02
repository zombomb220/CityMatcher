import { BuildingType, ResourceType } from '../types';
import type { Cell, CityState, Tile, Resources, SimulationResult, StatusEffect, StatusEffectTrigger, SimulationStats } from '../types';
import { BUILDING_STATS, PRODUCT_PARAMS, POPULATION_PARAMS, STATUS_EFFECTS, POWER_PARAMS } from '../config/buildingStats';
// Removed unused checkUnlockConditions import

interface PlacedTile {
    r: number;
    c: number;
    tile: Tile;
}

interface PlacedTileWithHistory extends PlacedTile {
    prevStars: number;
}

// Helper to check triggers
const checkTrigger = (trigger: StatusEffectTrigger, city: CityState, buildingCounts: Record<string, number>): boolean => {
    let actualValue: number = 0;

    // Resolve dynamic Values
    let targetValue = trigger.value;
    if (typeof targetValue === 'string') {
        if (targetValue === 'powerDemand') {
            // Use demand from last turn stats (which reflects the just-completed simulation step)
            return city.powerCapacity < (city.lastTurnStats?.powerDemand || 0);
        }
        const parsed = parseFloat(targetValue);
        if (!isNaN(parsed)) targetValue = parsed;
    }

    // Resolve Target
    if (trigger.type === 'resource') {
        if (trigger.target === 'powerCapacity') actualValue = city.powerCapacity;
        else if (trigger.target === 'jobsCapacity') actualValue = city.jobsCapacity;
        else if (trigger.target === 'workforceAvailable') actualValue = city.workforceAvailable;
        else actualValue = (city as any)[trigger.target] || 0;
    } else if (trigger.type === 'stat') {
        if (trigger.target === 'unemployed') actualValue = city.unemployed;
        else if (trigger.target === 'serviceCoverage') actualValue = city.serviceCoverage ?? 100;
        else actualValue = (city as any)[trigger.target] || 0;
    } else if (trigger.type === 'building_count') {
        actualValue = buildingCounts[trigger.target] || 0;
    } else if (trigger.type === 'turn') {
        actualValue = city.turn;
    }

    const tVal = typeof targetValue === 'number' ? targetValue : 0;

    switch (trigger.comparison) {
        case '>=': return actualValue >= tVal;
        case '<=': return actualValue <= tVal;
        case '>': return actualValue > tVal;
        case '<': return actualValue < tVal;
        case '==': return actualValue === tVal;
        default: return false;
    }
};

const applyStatusEffects = (activeEffects: StatusEffect[], startCity: CityState, productionMultipliers: Record<string, number>, trackChange?: (res: string, amt: number, src: string) => void) => {
    const disabledTypes = new Set<string>();

    for (const effect of activeEffects) {
        for (const action of effect.effects) {
            if (action.type === 'productionMultiplier') {
                const target = action.target;
                const val = action.value || 1;
                if (target === 'all') {
                    for (const type of Object.values(BuildingType)) {
                        productionMultipliers[type] = (productionMultipliers[type] || 1) * val;
                    }
                } else {
                    productionMultipliers[target] = (productionMultipliers[target] || 1) * val;
                }
            } else if (action.type === 'resourceDelta') {
                const target = action.target;
                const val = action.value || 0;
                if (target === 'happiness') {
                    startCity.happiness = Math.max(0, Math.min(100, startCity.happiness + val));
                    if (trackChange) trackChange(ResourceType.Happiness, val, effect.name);
                }
                else if (target === 'money') {
                    startCity.money += val;
                    if (trackChange) trackChange(ResourceType.Money, val, effect.name);
                }
            } else if (action.type === 'disableBuilding') {
                disabledTypes.add(action.target);
            }
        }
    }

    return disabledTypes;
};

export const runSimulation = (grid: Cell[][], currentCity: CityState): SimulationResult => {
    // DEBUG
    console.log(`[Sim] Run Start. Grid: ${grid.length}x${grid[0].length}`);
    // --- INIT ---
    const newCity: CityState = JSON.parse(JSON.stringify(currentCity));
    const breakdown: { source: string; amount: number; resource: string }[] = [];
    // Initialize with 0s so UI doesn't show empty ()
    const netChanges: Record<string, number> = {
        [ResourceType.Money]: 0,
        [ResourceType.Population]: 0,
        [ResourceType.Happiness]: 0,
        [ResourceType.Power]: 0,
        [ResourceType.Workforce]: 0,
        [ResourceType.RawGoods]: 0,
        [ResourceType.Products]: 0
    };
    const buildingAlerts: { id: string; type: 'disable' | 'star_loss'; message: string }[] = [];

    const trackChange = (res: string, amount: number, source: string) => {
        if (amount === 0) return;
        // DEBUG LOG
        console.log(`[Sim] Track ${res}: ${amount} from ${source}`);

        if (res === ResourceType.Money) newCity.money += amount;
        else if (res === ResourceType.Population) newCity.population += amount;
        else if (res === ResourceType.Happiness) newCity.happiness = Math.max(0, Math.min(100, newCity.happiness + amount));
        else if (res === ResourceType.RawGoods) newCity.rawGoodsAvailable += amount;
        else if (res === ResourceType.Products) newCity.productsAvailable += amount;

        breakdown.push({ source, amount, resource: res });
        netChanges[res] = (netChanges[res] || 0) + amount;
    };

    const allTiles: PlacedTileWithHistory[] = [];
    const buildingCounts: Record<string, number> = {};

    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            const t = grid[r][c].tile;
            if (t) {
                const prevStars = t.stars;
                t.disabled = false;
                t.disabledReason = undefined;
                t.missingReqs = undefined;
                t.stars = 1;
                t.upkeepPaid = false;

                allTiles.push({ r, c, tile: t, prevStars });
                buildingCounts[t.type] = (buildingCounts[t.type] || 0) + 1;
            }
        }
    }

    // --- PHASE 4 (PRE-CALC): STATUS EFFECT CHECK ---
    const activeEffectIds = new Set(newCity.activeStatusEffects || []);
    const activeEffects = STATUS_EFFECTS.filter(e => activeEffectIds.has(e.id));

    const productionMultipliers: Record<string, number> = {};
    // Note: We pass a temporary tracker here or just rely on the main one if we move this call?
    // Actually, `breakdown` is defined inside `runSimulation`. So we can pass `trackChange`.
    // But `trackChange` is defined at line 104, BEFORE this call? NO.
    // `trackChange` is defined at line 104. `applyStatusEffects` call is at line 144. So we can pass it!
    const disabledTypes = applyStatusEffects(activeEffects, newCity, productionMultipliers, trackChange);

    // --- STEP 0: RESET CAPACITIES ---
    newCity.powerCapacity = 0;
    newCity.jobsCapacity = 0;
    // Fix: Reset population based pools to 0 to avoid double counting
    newCity.workforceAvailable = 0;
    newCity.population = 0;
    newCity.powerAvailable = 0;
    newCity.productsAvailable = 0;
    // console.log("DEBUG: Start Simulation");


    let carriedRawGoods = newCity.rawGoodsAvailable;
    const decay = Math.floor(carriedRawGoods * PRODUCT_PARAMS.decayRate);
    if (decay > 0) {
        carriedRawGoods -= decay;
        trackChange(ResourceType.RawGoods, -decay, 'Storage Decay');
    }
    newCity.rawGoodsAvailable -= decay;
    newCity.productsAvailable = 0;

    // --- STEP 1: GENERATE CAPACITIES ---
    let potentialPower = 0;
    let potentialPop = 0;

    const sortedTiles = [...allTiles].sort((a, b) => {
        const sA = BUILDING_STATS[a.tile.type][a.tile.tier];
        const sB = BUILDING_STATS[b.tile.type][b.tile.tier];
        // Ascending Priority (0 is Critical/First)
        return sA.priority - sB.priority || (a.r * grid.length + a.c) - (b.r * grid.length + b.c);
    });

    // Helper: Get base stats
    const getStats = (t: Tile) => BUILDING_STATS[t.type][t.tier];

    // Predict Capacities (Power & Workforce from Res)
    for (const t of sortedTiles) {
        if (disabledTypes.has(t.tile.type)) {
            t.tile.disabled = true;
            t.tile.disabledReason = "Status Effect";
            t.tile.stars = 0;
            continue;
        }

        const stats = getStats(t.tile);

        // Apply Fixed Costs (Maintenance)
        if (stats.fixedCost) {
            for (const [res, amt] of Object.entries(stats.fixedCost)) {
                trackChange(res, -amt, `${t.tile.type} Fixed Cost`);
            }
        }

        // Base Production (Star 1)
        const prod = stats.produces[1] || {};

        if (prod[ResourceType.Power] > 0) {
            const pAmt = prod[ResourceType.Power]!;
            potentialPower += pAmt;
            trackChange(ResourceType.Power, pAmt, t.tile.type);
        }
        if (prod[ResourceType.Population] > 0) {
            const amount = prod[ResourceType.Population]!;
            potentialPop += amount;
            // TRACKING: Population Generates Workforce
            trackChange(ResourceType.Workforce, amount, "Population");
        }
    }

    newCity.powerCapacity = potentialPower;
    newCity.workforceAvailable += potentialPop;
    newCity.population += potentialPop;

    // --- STEP 2: WORKFORCE ALLOCATION (Reservation) ---

    let workforceSupply = newCity.workforceAvailable;
    let workforceDemand = 0;

    const activeTiles: PlacedTileWithHistory[] = []; // Survivors

    for (const t of sortedTiles) {
        if (t.tile.disabled) continue; // Already disabled by Status Effect

        const stats = getStats(t.tile);
        const reqs = stats.baseRequirements || {};
        const wReq = reqs[ResourceType.Workforce] || 0;

        // DEBUG
        // if (wReq > 0) console.log(`[Sim] Tile ${t.tile.type} wReq: ${wReq}`);
        // else console.log(`[Sim] Tile ${t.tile.type} NO wReq found. Keys: ${Object.keys(reqs)}`);


        if (wReq > 0) {
            workforceDemand += wReq;
            if (workforceSupply >= wReq) {
                workforceSupply -= wReq;
                activeTiles.push(t);
                // TRACKING: Building Consumes Workfroce
                trackChange(ResourceType.Workforce, -wReq, t.tile.type);
            } else {
                // Insufficient Supply
                t.tile.disabled = true;
                t.tile.stars = 0;
                t.tile.disabledReason = ResourceType.Workforce;
                t.tile.disabledReason = ResourceType.Workforce;
                buildingAlerts.push({ id: t.tile.id, type: 'disable', message: "No Workers" });
                // Fix: If Power Plant disabled, remove its capacity from pool for Star Allocation
                if (t.tile.type === BuildingType.Power) {
                    const s = getStats(t.tile);
                    newCity.powerCapacity -= (s.produces[1]?.[ResourceType.Power] || 0);
                }
            }
        } else {
            // No workforce needed, survives reservation (unless other checks fail later)
            activeTiles.push(t);
        }
    }

    newCity.workforceAvailable = workforceSupply;
    newCity.jobsCapacity = workforceDemand;

    // --- STEP 2.5: STAR ALLOCATION (Soft Shedding) ---
    // Calculate Base Demand for Star Surplus
    let basePowerDemand = 0;
    for (const t of activeTiles) {
        if (t.tile.type === BuildingType.Power) continue;
        const stats = getStats(t.tile);
        basePowerDemand += (stats.baseRequirements?.[ResourceType.Power] || 0);
    }

    let powerSurplusForStars = Math.max(0, newCity.powerCapacity - basePowerDemand);
    let workforceSurplusForStars = workforceSupply;
    let rawGoodsSurplusForStars = newCity.rawGoodsAvailable;

    for (const t of activeTiles) {
        if (t.tile.type === BuildingType.Power) continue;

        const stats = getStats(t.tile);
        if (!stats.starRequirements) continue;

        // Try Star 2
        const reqs2 = stats.starRequirements[2];
        if (reqs2) {
            const cost2: Resources = {};
            let canAfford = true;

            for (const [res, amt] of Object.entries(reqs2)) {
                const base = stats.baseRequirements?.[res] || 0;
                const debit = Math.max(0, amt - base);
                if (debit > 0) {
                    if (res === ResourceType.Power) {
                        if (powerSurplusForStars < debit) canAfford = false;
                    } else if (res === ResourceType.Workforce) {
                        if (workforceSurplusForStars < debit) canAfford = false;
                    } else if (res === ResourceType.RawGoods) {
                        if (rawGoodsSurplusForStars < debit) canAfford = false;
                    } else if (res === ResourceType.Money) {
                        if (newCity.money < debit) canAfford = false;
                    } else if (res === ResourceType.Happiness) {
                        if (newCity.happiness < amt) canAfford = false;
                    } else if (res === ResourceType.Products) {
                        if (newCity.productsAvailable < debit) canAfford = false;
                    }
                }
                cost2[res] = debit;
            }

            if (canAfford) {
                t.tile.stars = 2;
                if (cost2[ResourceType.Power]) powerSurplusForStars -= cost2[ResourceType.Power]!;
                if (cost2[ResourceType.Workforce]) workforceSurplusForStars -= cost2[ResourceType.Workforce]!;

                // Try Star 3
                const reqs3 = stats.starRequirements[3];
                if (reqs3) {
                    const cost3: Resources = {};
                    let canAfford3 = true;
                    for (const [res, amt] of Object.entries(reqs3)) {
                        const prev = reqs2[res] || 0;
                        const debit = Math.max(0, amt - prev);
                        if (debit > 0) {
                            if (res === ResourceType.Power) { if (powerSurplusForStars < debit) canAfford3 = false; }
                            else if (res === ResourceType.Workforce) { if (workforceSurplusForStars < debit) canAfford3 = false; }
                            else if (res === ResourceType.RawGoods) { if (rawGoodsSurplusForStars < debit) canAfford3 = false; }
                            else if (res === ResourceType.Money) { if (newCity.money < debit) canAfford3 = false; }
                            else if (res === ResourceType.Happiness) { if (newCity.happiness < amt) canAfford3 = false; }
                            else if (res === ResourceType.Products) { if (newCity.productsAvailable < debit) canAfford3 = false; }
                        }
                        cost3[res] = debit;
                    }

                    if (canAfford3) {
                        t.tile.stars = 3;
                        if (cost3[ResourceType.Power]) powerSurplusForStars -= cost3[ResourceType.Power]!;
                        if (cost3[ResourceType.Workforce]) workforceSurplusForStars -= cost3[ResourceType.Workforce]!;
                    }
                }
            } else {
                t.tile.missingReqs = "Star 2 Req";
            }
        }
    }

    // --- STEP 3: RESOURCE PHASES ---

    // A. Power Consumers
    let actualPowerCapacity = 0;
    const survivors = activeTiles.filter(t => !t.tile.disabled);

    for (const t of survivors) {
        if (t.tile.type === BuildingType.Power) {
            const stats = getStats(t.tile);
            actualPowerCapacity += (stats.produces[1]?.[ResourceType.Power] || 0);
        }
    }
    newCity.powerCapacity = actualPowerCapacity;
    let powerSurplus = actualPowerCapacity;
    let powerDemand = 0;

    const runPowerConsumption = () => {
        for (const t of survivors) {
            if (t.tile.type === BuildingType.Power) continue;

            // NOTE: Consumption logic uses STAR requirements now, or Base?
            // "Consume: power".
            // Since we applied Stars in Step 2.5, we consume based on Current Stars.
            // Stats.baseRequirements are Base.
            // Star 2 might have Higher Reqs.
            // `starRequirements` usually definition.
            // Does getStats(t.tile) return MERGED stats? NO.
            // We need to resolve consumption based on Star Level.
            // Logic: Base + Incremental.
            // OR just `starRequirements[stars]` if present.
            // Let's assume starRequirements is TOTAL.

            const stats = getStats(t.tile);
            const starReqs = (t.tile.stars > 1 && stats.starRequirements?.[t.tile.stars as 2 | 3]) || {};
            const reqs = { ...stats.baseRequirements, ...starReqs };

            const pReq = reqs[ResourceType.Power] || 0;
            if (pReq > 0) {
                powerDemand += pReq;
                if (powerSurplus >= pReq) {
                    powerSurplus -= pReq;
                    trackChange(ResourceType.Power, -pReq, t.tile.type);
                } else {
                    t.tile.disabled = true;
                    t.tile.stars = 0;
                    t.tile.disabledReason = ResourceType.Power;
                    buildingAlerts.push({ id: t.tile.id, type: 'disable', message: "No Power" });
                }
            }
        }
    };
    runPowerConsumption();
    newCity.powerAvailable = powerSurplus;

    // B. Factories (Produce Raw Goods)
    const activeSurvivors = survivors.filter(t => !t.tile.disabled);

    for (const t of activeSurvivors) {
        if (t.tile.type === BuildingType.Factory) {
            const stats = getStats(t.tile);
            // Produce based on Stars
            const starKey = t.tile.stars as 1 | 2 | 3;
            const prod = stats.produces[starKey] || stats.produces[1] || {};
            const mult = productionMultipliers[BuildingType.Factory] || 1;

            for (const [res, amt] of Object.entries(prod)) {
                if (res === ResourceType.Money) continue;
                trackChange(res, Math.floor(amt * mult), `${t.tile.type}`);
            }
        }
    }

    // C. Shops (Consume Raw -> Produce Products)
    let rawGoodsStock = newCity.rawGoodsAvailable;

    for (const t of activeSurvivors) {
        if (t.tile.type === BuildingType.Shop) {
            const stats = getStats(t.tile);
            // MERGE Reqs: Base + Star
            const starReqs = (t.tile.stars > 1 && stats.starRequirements?.[t.tile.stars as 2 | 3]) || {};
            const reqs = { ...stats.baseRequirements, ...starReqs };

            const rawReq = reqs[ResourceType.RawGoods] || 0;

            if (rawReq > 0) {
                if (rawGoodsStock >= rawReq) {
                    rawGoodsStock -= rawReq;
                    trackChange(ResourceType.RawGoods, -rawReq, t.tile.type);
                    const starKey = t.tile.stars as 1 | 2 | 3;
                    const prod = stats.produces[starKey] || stats.produces[1] || {};
                    const mult = productionMultipliers[BuildingType.Shop] || 1;
                    for (const [res, amt] of Object.entries(prod)) {
                        trackChange(res, Math.floor(amt * mult), `${t.tile.type}`);
                    }
                } else {
                    t.tile.disabled = true;
                    t.tile.stars = 0;
                    t.tile.disabledReason = ResourceType.RawGoods;
                    buildingAlerts.push({ id: t.tile.id, type: 'disable', message: "No Stock" });
                }
            }
        }
    }
    newCity.rawGoodsAvailable = rawGoodsStock;

    // D. Money (Taxes & Sales)
    // D. Money (Taxes & Sales)
    const tx = Math.floor(newCity.population * (POPULATION_PARAMS.taxPerPop || 0.25));
    if (tx > 0) trackChange(ResourceType.Money, tx, "Taxes");

    const products = newCity.productsAvailable;
    const demand = newCity.population;
    const consumed = Math.min(products, demand);

    if (consumed > 0) {
        trackChange(ResourceType.Money, consumed * 2, "Sales");
        trackChange(ResourceType.Products, -consumed, "Consumption");
    }

    // Power Idle Cost
    const idlePower = Math.max(0, newCity.powerAvailable);
    const idleCost = Math.floor(idlePower * (POWER_PARAMS.idleCostPerUnit || 0));
    if (idleCost > 0) {
        trackChange(ResourceType.Money, -idleCost, 'Power Idle Cost');
    }

    // E. Population (Residential Produces Pop)
    let finalPop = 0;

    for (const t of activeSurvivors) {
        if (t.tile.type === BuildingType.Residential) {
            const stats = getStats(t.tile);
            const starKey = t.tile.stars as 1 | 2 | 3;
            const prod = stats.produces[starKey] || stats.produces[1] || {};
            const mult = productionMultipliers[BuildingType.Residential] || 1;
            const pop = Math.floor((prod[ResourceType.Population] || 0) * mult);
            finalPop += pop;
            trackChange(ResourceType.Population, pop, "Growth");
        }
    }
    newCity.population = finalPop;

    // --- STEP 4: STATUS EFFECTS (EVALUATION) ---
    const nextActiveEffects: string[] = [];

    newCity.unemployed = Math.max(0, newCity.workforceAvailable);

    const powerUtilization = newCity.powerCapacity > 0 ? (newCity.powerCapacity - newCity.powerAvailable) / newCity.powerCapacity : 0;

    newCity.lastTurnStats = {
        powerNet: newCity.powerAvailable,
        powerDemand: powerDemand,
        workforceNet: newCity.workforceAvailable,
        rawGoodsNet: netChanges[ResourceType.RawGoods] || 0,
        productsNet: netChanges[ResourceType.Products] || 0,
        moneyNet: netChanges[ResourceType.Money] || 0,
        popNet: netChanges[ResourceType.Population] || 0,
    };

    // Coverage
    const coverageJobs = newCity.population > 0 ? (newCity.population - newCity.unemployed) / newCity.population : 1;
    const coverageProd = newCity.population > 0 ? (consumed / newCity.population) : 1;
    newCity.serviceCoverage = Math.floor(((coverageJobs + coverageProd) / 2) * 100);

    for (const effect of STATUS_EFFECTS) {
        const match = effect.trigger.every((t: StatusEffectTrigger) => checkTrigger(t, newCity, buildingCounts));
        if (match) {
            nextActiveEffects.push(effect.id);
        }
    }

    newCity.activeStatusEffects = nextActiveEffects;

    // --- FINISH ---
    const stats: SimulationStats = {
        powerProduced: newCity.powerCapacity,
        powerConsumed: newCity.powerCapacity - newCity.powerAvailable,
        powerUtilization: powerUtilization,
        powerStars: 0,
        netChanges: netChanges,
        breakdown: breakdown,
        buildingAlerts: buildingAlerts
    };

    return { city: newCity, stats };
};
