
export interface CityExportData {
    money: number;
    raw_goods: number;
    products: number;
    power: number;
    happiness: number;
    population: number;
    turns: number;
    completed: boolean;
}

export type RewardType = 'unlock_node' | 'budget_bonus' | 'modifier';

export interface MetaReward {
    type: RewardType;
    value: string | number; // Node ID, or Amount
    description: string;
}

export interface ExportThreshold {
    resource: 'money' | 'raw_goods' | 'products' | 'power' | 'happiness' | 'population' | 'turns';
    value: number;
    reward: MetaReward;
    id: string; // Unique ID for tracking unlocks
}

export interface CityConfig {
    id: string;
    name: string;
    description: string;
    thresholds: ExportThreshold[];
    baseBudget: number; // Starting money override
    initialModifiers?: string[];
    coordinates: { x: number; y: number }; // Percentage 0-100
    connections?: string[]; // IDs of connected cities
    debug_initial_progress?: Partial<CityProgress>; // For testing/debugging
}

export interface CityProgress {
    cityId: string;
    bestExports: CityExportData;
    unlockedThresholdIds: string[];
    runCount: number;
    completed: boolean;
}
