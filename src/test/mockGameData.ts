
import type { BuildingConfig, CityState, StatusEffect } from '../types';

export const MAX_TIER = 3;
export const GRID_SIZE = 7;
export const MIN_SERVICE_COVERAGE = 60;
export const INITIAL_MONEY = 30;

export const POPULATION_PARAMS = {
    "taxPerPop": 0.25,
    "happinessDecayPerPop": 0.04,
    "maintenancePerPop": 0.08,
    "productConsumptionRate": 1.0
};

export const PRODUCT_PARAMS = {
    "decayRate": 0.05,
    "spoilageThreshold": 24
};

export const POWER_PARAMS = {
    "idleCostPerUnit": 0.15
};

export const BLUEPRINT_SLOT_COSTS = {
    "base": 15,
    "multiplier": 1.6
};

export const SPAWN_WEIGHTS = {
    "Residential": 0.35,
    "Factory": 0.25,
    "Shop": 0.2,
    "Power": 0.2
};

export const STATUS_EFFECTS = [
    {
        "id": "brownout",
        "name": "Brownout",
        "description": "Insufficient power is reducing city efficiency.",
        "trigger": [
            {
                "type": "resource",
                "target": "powerCapacity",
                "comparison": "<",
                "value": "powerDemand"
            }
        ],
        "effects": [
            {
                "type": "productionMultiplier",
                "target": "all",
                "value": 0.75
            }
        ],
        "duration": "while_triggered",
        "stacking": false
    },
    {
        "id": "economic_boom",
        "name": "Economic Boom",
        "trigger": [
            {
                "type": "resource",
                "target": "money",
                "comparison": ">=",
                "value": 100
            },
            {
                "type": "resource",
                "target": "happiness",
                "comparison": ">=",
                "value": 80
            }
        ],
        "effects": [
            {
                "type": "productionMultiplier",
                "target": "Shop",
                "value": 1.25
            }
        ],
        "duration": "while_triggered",
        "stacking": false
    },
    {
        "id": "unemployment_crisis",
        "name": "Unemployment Crisis",
        "description": "High unemployment is causing unrest.",
        "trigger": [
            {
                "type": "stat",
                "target": "unemployed",
                "comparison": ">=",
                "value": 3
            }
        ],
        "effects": [
            {
                "type": "resourceDelta",
                "target": "happiness",
                "value": -2
            }
        ],
        "duration": "while_triggered",
        "stacking": true
    },
    {
        "id": "service_collapse",
        "name": "Service Collapse",
        "description": "Essential services are failing.",
        "trigger": [
            {
                "type": "stat",
                "target": "serviceCoverage",
                "comparison": "<",
                "value": 60
            }
        ],
        "effects": [
            {
                "type": "resourceDelta",
                "target": "happiness",
                "value": -5
            }
        ],
        "duration": "while_triggered",
        "stacking": false
    },
    {
        "id": "poor_services",
        "name": "Poor Services",
        "description": "Services are struggling to meet demand.",
        "trigger": [
            {
                "type": "stat",
                "target": "serviceCoverage",
                "comparison": ">=",
                "value": 60
            },
            {
                "type": "stat",
                "target": "serviceCoverage",
                "comparison": "<",
                "value": 80
            }
        ],
        "effects": [
            {
                "type": "resourceDelta",
                "target": "happiness",
                "value": -2
            }
        ],
        "duration": "while_triggered",
        "stacking": false
    },
    {
        "id": "strained_services",
        "name": "Strained Services",
        "description": "Services are slightly overwhelmed.",
        "trigger": [
            {
                "type": "stat",
                "target": "serviceCoverage",
                "comparison": ">=",
                "value": 80
            },
            {
                "type": "stat",
                "target": "serviceCoverage",
                "comparison": "<",
                "value": 100
            }
        ],
        "effects": [
            {
                "type": "resourceDelta",
                "target": "happiness",
                "value": -1
            }
        ],
        "duration": "while_triggered",
        "stacking": false
    },
    {
        "id": "excellent_services",
        "name": "Excellent Services",
        "description": "Citizens are happy with the abundance of services.",
        "trigger": [
            {
                "type": "stat",
                "target": "serviceCoverage",
                "comparison": ">=",
                "value": 100
            }
        ],
        "effects": [
            {
                "type": "resourceDelta",
                "target": "happiness",
                "value": 1
            }
        ],
        "duration": "while_triggered",
        "stacking": false
    }
] as unknown as StatusEffect[];

export const STARTING_CITY: CityState = {
    money: 30,
    population: 0,
    happiness: 50,
    workforceAvailable: 0,
    rawGoodsAvailable: 0,
    productsAvailable: 0,
    powerAvailable: 0,
    unemployed: 0,
    turn: 1,
    serviceCoverage: 100,
    powerCapacity: 0,
    jobsCapacity: 0,
    stabilityDebt: 0,
    activeStatusEffects: [],
    history: [],
    blueprintState: {
        unlockedIds: [
            "residential_t1",
            "factory_t1",
            "power_t1",
            "shop_t1",
            "residential_t2",
            "power_t2"
        ],
        activeSlots: [
            "residential_t1",
            "factory_t1",
            "power_t1"
        ],
        maxSlots: 6,
        hasPlacedThisTurn: false,
        newUnlocks: [
            "shop_t1",
            "residential_t2",
            "power_t2"
        ]
    }
};

export const BUILDING_STATS: BuildingConfig = {
    "Residential": {
        "1": {
            "baseRequirements": {
                "power": 0
            },
            "starRequirements": {
                "2": {
                    "power": 2,
                    "happiness": 40
                },
                "3": {
                    "power": 3,
                    "products": 2,
                    "happiness": 60
                }
            },
            "produces": {
                "1": {
                    "population": 1
                },
                "2": {
                    "population": 2
                },
                "3": {
                    "population": 4,
                    "happiness": 1
                }
            },
            "priority": 3,
            "mergeStarReset": true
        },
        "2": {
            "baseRequirements": {
                "power": 2,
                "products": 2
            },
            "starRequirements": {
                "2": {
                    "power": 4,
                    "products": 2
                },
                "3": {
                    "power": 6,
                    "products": 4,
                    "happiness": 60
                }
            },
            "produces": {
                "1": {
                    "population": 4
                },
                "2": {
                    "population": 8
                },
                "3": {
                    "population": 14
                }
            },
            "priority": 3,
            "mergeStarReset": true
        },
        "3": {
            "baseRequirements": {
                "power": 5,
                "products": 4
            },
            "starRequirements": {
                "2": {
                    "power": 10,
                    "products": 6
                },
                "3": {
                    "power": 16,
                    "products": 12,
                    "happiness": 75
                }
            },
            "produces": {
                "1": {
                    "population": 12
                },
                "2": {
                    "population": 26
                },
                "3": {
                    "population": 50
                }
            },
            "priority": 3,
            "mergeStarReset": true
        }
    },
    "Factory": {
        "1": {
            "baseRequirements": {
                "power": 1,
                "workforce": 1
            },
            "starRequirements": {
                "2": {
                    "power": 12
                },
                "3": {
                    "power": 7,
                    "raw_goods": 2
                }
            },
            "produces": {
                "1": {
                    "raw_goods": 1
                },
                "2": {
                    "raw_goods": 3
                },
                "3": {
                    "raw_goods": 5
                }
            },
            "priority": 2,
            "mergeStarReset": true
        },
        "2": {
            "baseRequirements": {
                "power": 2,
                "workforce": 1
            },
            "starRequirements": {
                "2": {
                    "power": 30
                },
                "3": {
                    "power": 14,
                    "raw_goods": 5
                }
            },
            "produces": {
                "1": {
                    "raw_goods": 5
                },
                "2": {
                    "raw_goods": 8
                },
                "3": {
                    "raw_goods": 12
                }
            },
            "priority": 2,
            "mergeStarReset": true
        },
        "3": {
            "baseRequirements": {
                "power": 12,
                "workforce": 8
            },
            "starRequirements": {
                "2": {
                    "power": 20
                },
                "3": {
                    "power": 30,
                    "raw_goods": 10
                }
            },
            "produces": {
                "1": {
                    "raw_goods": 15
                },
                "2": {
                    "raw_goods": 25
                },
                "3": {
                    "raw_goods": 40
                }
            },
            "priority": 2,
            "mergeStarReset": true
        }
    },
    "Shop": {
        "1": {
            "baseRequirements": {
                "power": 1,
                "workforce": 1,
                "raw_goods": 1
            },
            "starRequirements": {
                "2": {
                    "power": 2,
                    "raw_goods": 2
                },
                "3": {
                    "power": 4,
                    "raw_goods": 4
                }
            },
            "produces": {
                "1": {
                    "products": 2,
                    "money": 1
                },
                "2": {
                    "products": 4,
                    "money": 2
                },
                "3": {
                    "products": 7,
                    "money": 4
                }
            },
            "priority": 4,
            "mergeStarReset": true
        },
        "2": {
            "baseRequirements": {
                "power": 3,
                "workforce": 3,
                "raw_goods": 3
            },
            "starRequirements": {
                "2": {
                    "power": 6,
                    "raw_goods": 6
                },
                "3": {
                    "power": 10,
                    "raw_goods": 10
                }
            },
            "produces": {
                "1": {
                    "products": 6,
                    "money": 3
                },
                "2": {
                    "products": 10,
                    "money": 6
                },
                "3": {
                    "products": 16,
                    "money": 10
                }
            },
            "priority": 4,
            "mergeStarReset": true
        },
        "3": {
            "baseRequirements": {
                "power": 8,
                "workforce": 6,
                "raw_goods": 8
            },
            "starRequirements": {
                "2": {
                    "power": 15,
                    "raw_goods": 14
                },
                "3": {
                    "power": 24,
                    "raw_goods": 22
                }
            },
            "produces": {
                "1": {
                    "products": 14,
                    "money": 8
                },
                "2": {
                    "products": 25,
                    "money": 16
                },
                "3": {
                    "products": 40,
                    "money": 32
                }
            },
            "priority": 4,
            "mergeStarReset": true
        }
    },
    "Warehouse": {
        "1": {
            "baseRequirements": {
                "power": 1
            },
            "starRequirements": {
                "2": {
                    "power": 2
                },
                "3": {
                    "power": 3
                }
            },
            "produces": {},
            "priority": 10
        }
    },
    "Power": {
        "1": {
            "baseRequirements": {
                "money": 1
            },
            "produces": {
                "1": {
                    "power": 3
                },
                "2": {
                    "power": 3
                },
                "3": {
                    "power": 3
                }
            },
            "priority": 0
        },
        "2": {
            "baseRequirements": {
                "money": 4,
                "workforce": 3
            },
            "produces": {
                "1": {
                    "power": 9
                },
                "2": {
                    "power": 9
                },
                "3": {
                    "power": 9
                }
            },
            "priority": 0,
            "fixedCost": {
                "money": 1
            }
        },
        "3": {
            "baseRequirements": {
                "money": 10,
                "workforce": 5
            },
            "produces": {
                "1": {
                    "power": 28
                },
                "2": {
                    "power": 28
                },
                "3": {
                    "power": 28
                }
            },
            "priority": 0,
            "fixedCost": {
                "money": 6
            }
        }
    }
} as unknown as BuildingConfig;
