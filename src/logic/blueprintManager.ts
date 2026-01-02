import { BuildingType } from '../types';
import type { CityState, UnlockCondition } from '../types';
import { BLUEPRINTS } from '../config/blueprints';

export function checkUnlockConditions(state: CityState, buildingCounts: Record<BuildingType, number>): string[] {
    const newlyUnlocked: string[] = [];
    const unlockedSet = new Set(state.blueprintState.unlockedIds);

    // Check Slot Limit: If slots are full, cannot unlock anything new.
    // "Cannot unlock a blueprint if slots are full."
    // We assume Unlocked Blueprints = Active Blueprints (1:1 mapping for now based on requirements)
    if (unlockedSet.size >= state.blueprintState.maxSlots) {
        return [];
    }


    for (const [id, bp] of Object.entries(BLUEPRINTS)) {
        if (unlockedSet.has(id)) continue;

        if (evaluateConditions(bp.unlockConditions, state, buildingCounts)) {
            newlyUnlocked.push(id);
        }
    }

    return newlyUnlocked;
}

function evaluateConditions(conditions: UnlockCondition[][], state: CityState, buildingCounts: Record<BuildingType, number>): boolean {
    if (conditions.length === 0) return false;
    // Usually starting blueprints have empty conditions, but they are pre-unlocked.
    // Remaining ones with empty conditions are effectively "Not Unlockable" unless explicitly given.
    // However, for safety, let's say empty conditions = false (locked) unless in starting set.
    // But wait, my config used empty for starting ones. 
    // Starting ones are inserted into initial state. So here check should assume unlocked ones are skipped.
    // If I have a blueprint that unlocks via event (not state check), it might have special condition.

    // OR Logic: If ANY group returns true, condition is met.
    for (const group of conditions) {
        if (evaluateGroup(group, state, buildingCounts)) return true;
    }
    return false;
}

function evaluateGroup(group: UnlockCondition[], state: CityState, buildingCounts: Record<BuildingType, number>): boolean {
    // AND Logic: ALL conditions in group must be true.
    for (const cond of group) {
        const valueToCheck = getValueForTarget(cond.target, state, cond.type, buildingCounts);
        if (!compare(valueToCheck, cond.value, cond.comparison)) {
            return false;
        }
    }
    return true;
}

function getValueForTarget(target: string, state: CityState, type: string, buildingCounts: Record<BuildingType, number>): number {
    switch (type) {
        case 'resource':
            // Map resources to state properties or calculated values
            // state properties: money, population, happiness, jobsAvailable, goodsAvailable, powerAvailable
            // But beware: 'jobs' usually means 'jobsAvailable' or total jobs? 
            // 'Goods >= 3' usually means available goods surplus.
            switch (target) {
                case 'money': return state.money;
                case 'population': return state.population;
                case 'happiness': return state.happiness;
                case 'workforce': return state.workforceAvailable;
                case 'raw_goods': return state.rawGoodsAvailable;
                case 'products': return state.productsAvailable;
                case 'power': return state.powerAvailable;
                default: return 0;
            }
        case 'stat':
            if (target === 'unemployed') return state.unemployed;
            if (target === 'total_blueprints') return state.blueprintState.unlockedIds.length;
            return 0;
        case 'turn':
            return state.turn;
        case 'building_count':
            return buildingCounts[target as BuildingType] || 0;
        default:
            return 0;
    }
}

function compare(a: number, b: number, op: string): boolean {
    switch (op) {
        case '>=': return a >= b;
        case '<=': return a <= b;
        case '==': return a === b;
        case '>': return a > b;
        case '<': return a < b;
        default: return false;
    }
}

export function checkSlotUnlock(state: CityState): boolean {
    // Unlock +1 slot if 2 Tier-2 Blueprints are unlocked
    // Current max is 3. If we meet condition, return true to increment.
    // Only 1 extra slot possible for now? "Unlock +1 slot after unlocking any 2 Tier-2 Blueprints".

    if (state.blueprintState.maxSlots >= 4) return false; // Already unlocked

    const t2UnlockedCount = state.blueprintState.unlockedIds.filter(id => {
        const bp = BLUEPRINTS[id];
        return bp && bp.tier === 2;
    }).length;

    return t2UnlockedCount >= 2;
}
