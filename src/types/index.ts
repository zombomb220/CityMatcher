export const BuildingType = {
    Residential: 'Residential',
    Factory: 'Factory',
    Shop: 'Shop',
    Power: 'Power',
    Warehouse: 'Warehouse',
} as const;
export type BuildingType = typeof BuildingType[keyof typeof BuildingType];

export const ResourceType = {
    Money: 'money',
    Population: 'population',
    Workforce: 'workforce',
    RawGoods: 'raw_goods',
    Products: 'products',
    Power: 'power',
    Happiness: 'happiness',
} as const;
export type ResourceType = typeof ResourceType[keyof typeof ResourceType];

export interface Tile {
    id: string;
    type: BuildingType;
    tier: number; // 1..3
    stars: number; // 0=Disabled, 1=Enabled, 2=Efficient, 3=Optimal
    disabled?: boolean;
    disabledReason?: string;
    missingReqs?: string;
    upkeepPaid?: boolean;
}

export interface Cell {
    r: number;
    c: number;
    tile: Tile | null;
}

export interface HistoryEntry {
    turn: number;
    money: number;
    population: number;
    happiness: number;
    products: number;
    serviceCoverage?: number;
    stabilityDebt?: number; // Made optional as it might be deprecated
    workforce?: number;
    powerSurplus?: number;
    rawGoods?: number;
    activeEffects?: string[];
}

export interface BlueprintState {
    unlockedIds: string[];
    activeSlots: string[];
    maxSlots: number;
    hasPlacedThisTurn: boolean;
    newUnlocks: string[];
}

export interface CityState {
    money: number;
    population: number;
    happiness: number; // 0..100
    workforceAvailable: number;
    rawGoodsAvailable: number;
    productsAvailable: number;
    powerAvailable: number;

    // Capacity Pools
    powerCapacity: number;
    jobsCapacity: number;

    unemployed: number;
    turn: number;
    stabilityDebt: number; // Fail timer
    serviceCoverage?: number; // Added to fix build error

    // Status Effects
    activeStatusEffects: string[];

    // Net changes
    lastTurnStats?: {
        powerNet: number;
        powerDemand: number;
        workforceNet: number;
        rawGoodsNet: number;
        productsNet: number;
        moneyNet: number;
        popNet: number;
    };
    history: HistoryEntry[];
    blueprintState: BlueprintState;
}

export type UnlockConditionType = 'resource' | 'stat' | 'turn' | 'building_count' | 'event';

export interface UnlockCondition {
    type: UnlockConditionType;
    target: string;
    value: number;
    comparison: '>=' | '<=' | '==' | '>' | '<';
    consecutiveTurns?: number;
}

export interface Blueprint {
    id: string;
    buildingType: BuildingType;
    tier: number;
    name: string;
    description: string;
    slotCost: number;
    buildCost?: number;
    unlockConditions: UnlockCondition[][];
}

export interface Resources {
    [key: string]: number;
}

export interface BuildingStats {
    baseRequirements: Resources;
    starRequirements: {
        2: Resources;
        3: Resources;
    };
    produces: {
        1: Resources;
        2: Resources;
        3: Resources;
    };
    priority: number;
    mergeStarReset?: boolean;
    fixedCost?: Resources;
    optionalUpkeep?: {
        cost: Resources;
        effects: {
            starBonus?: number;
            outputMultiplier?: number;
            instabilityReduction?: number;
        };
    };
}

export interface SimulationStats {
    powerProduced: number;
    powerConsumed: number;
    powerUtilization: number;
    powerStars: number;
    popTaxRevenue?: number;
    fixedCostsTotal?: number;
    upkeepCostsTotal?: number;
    netChanges: Record<string, number>;
    breakdown: { source: string; amount: number; resource: string }[];
    buildingAlerts: { id: string; type: 'disable' | 'star_loss'; message: string }[];
}

export interface SimulationResult {
    city: CityState;
    stats: SimulationStats;
}

export interface TurnSnapshot {
    turnNumber: number;
    action: string;
    city: CityState;
    grid: Cell[][];
    stats: SimulationStats;
    timestamp: number;
}

export type BuildingConfig = Record<BuildingType, Record<number, BuildingStats>>;

export type StatusEffectTriggerType = 'resource' | 'stat' | 'building_count' | 'turn';

export interface StatusEffectTrigger {
    type: StatusEffectTriggerType;
    target: string;
    comparison: '>=' | '<=' | '==' | '>' | '<';
    value: number | string;
    consecutiveTurns?: number;
}

export type StatusEffectActionType = 'productionMultiplier' | 'resourceDelta' | 'capacityModifier' | 'disableBuilding';

export interface StatusEffectAction {
    type: StatusEffectActionType;
    target: string;
    value?: number;
}

export interface StatusEffect {
    id: string;
    name: string;
    description?: string;
    trigger: StatusEffectTrigger[];
    effects: StatusEffectAction[];
    duration: 'while_triggered';
    stacking: boolean;
}

export interface GameData {
    maxTier: number;
    gridSize: number;
    minServiceCoverage: number;
    initialMoney: number;
    populationParams: {
        taxPerPop: number;
        happinessDecayPerPop: number;
        maintenancePerPop: number;
    };
    productParams: {
        decayRate: number;
        spoilageThreshold: number;
    };
    powerParams: {
        idleCostPerUnit: number;
    };
    blueprintSlotCosts: {
        base: number;
        multiplier: number;
    };
    spawnWeights: Record<string, number>;
    buildingStats: BuildingConfig;
    startingCity: CityState;
    startingBlueprints: string[];
    blueprints: Record<string, Blueprint>;
    statusEffects: StatusEffect[];
}
