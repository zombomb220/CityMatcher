# Architecture Overview

## Domain Layers

### 1. **Configuration (`src/config`)**
- **Strict Schema (`schema.ts`)**: Defines the shape of `gameData.json`. Validated at runtime using Zod.
- **Config**: JSON-driven balance data.

### 2. **Logic (`src/logic`)**
- **Resolvers (`src/logic/resolvers/`)**: The core simulation engine.
    - Pure functions only.
    - Pipeline: `runSimulation` -> `resetFlows` -> `statusEffects` -> `produceResources` -> `resolveConsumption` -> `finalizeTurn` (Penalties/Stats).
- **Actions (`src/logic/actions.ts`)**: Handles user intent (Placement validation, Cost verification).
- **Grid (`src/logic/grid.ts`)**: Spatial logic (Merges, Adjacency).

### 3. **State (`src/store`)**
- **Zustand (`gameStore.ts`)**:
    - Holds canonical state (`City`, `Grid`, `History`).
    - Dispatches to `Actions` for logic execution.
    - No business logic allowed (e.g., "If x then y rules").

## Key Patterns
- **Turn Resolution Contract**: Strict order defined in `TURN_RESOLUTION.md`.
- **Pure Simulation**: `runSimulation` takes `(Grid, City)` and returns `(NewCity, Stats)`. It does not mutate arguments (deep clone internally).
- **Atomic Consumption**: Buildings consuming resources (Factory, Shop) either consume FULL requirements or disable. No partial operations.

---

# Turn Resolution Contract

1. **Initialization (`turnInit.ts`)**
   - **Deep Clone** state.
   - **Reset Flows**: Power, Workforce reset to 0. Population resets (Scalar Model).
   - **Preserve Stocks**: Money, Goods, Products carry over.
   - **Decay**: Apply decay to perishable stocks (Goods).

2. **Status Effects (`statusEffects.ts`)**
   - Apply active effects from *previous* turn's triggers.
   - Calculate multipliers and disabled building types.

3. **Production (`production.ts`)**
   - **Factories**: Produce Raw Goods.
   - **Residential**: Provide Workforce Capacity (Scalar Population).
   - **Power Plants w/o Inputs**: Produce Power.
   - **Add to Pools**: Resources become available for consumption *immediately*.

4. **Consumption (`consumption.ts`)**
   - **Priority Order**: Power -> Factories -> Shops -> Residential.
   - **Check**: Can afford Inputs (Power, Workforce, Goods, Money)?
   - **Success**: Deduct inputs.
       - **Secondary Production**: Shops produce Products/Money immediately upon consuming Goods.
   - **Failure**: Disable building.
       - **Rollback**: If a producer disables (e.g. Coal Plant out of workers), retract its output.

5. **Finalization (`penalties.ts`)**
   - **Population Consumption**: Population consumes Products (Sales logic).
   - **Stats**: Calculate Service Coverage, Unemployment.
   - **Triggers**: Evaluate Status Effect triggers for *Next Turn*.
