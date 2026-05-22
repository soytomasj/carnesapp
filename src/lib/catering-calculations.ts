import {
  PREVENTIVE_RATE,
  type CateringEvent,
  type EventServiceType,
  type EventReturnLog,
  type Product,
  type ProductUnit,
  type ReturnEntry,
  recipeConfigs,
  sideConsumptionRules,
  unitRatioRules,
} from "@/lib/catering-data";

export type EventNeed = {
  product: Product;
  base: number;
  preventive: number;
  total: number;
  available: number;
  missing: number;
  share?: number;
  source?: string;
};

export type UnitTotals = Partial<
  Record<
    ProductUnit,
    {
      carried: number;
      consumed: number;
      returned: number;
      expectedReturn: number;
    }
  >
>;

export function calculateEventNeeds(
  event: Pick<CateringEvent, "people" | "kgPerPerson" | "kgPerPersonBySource"> & {
    serviceType?: EventServiceType;
  },
  products: Product[],
): EventNeed[] {
  const recipe =
    recipeConfigs.find((item) => item.id === event.serviceType) ??
    recipeConfigs[0];
  const effectiveKgPerPerson = event.kgPerPerson ?? recipe.kgPerPerson;
  const recipeShareTotals = recipe.rules.reduce<Record<string, number>>(
    (totals, rule) => {
      const key = getRecipeRuleGroupKey(rule.source, rule.kgPerPerson);
      totals[key] = (totals[key] ?? 0) + rule.share;
      return totals;
    },
    {},
  );
  const recipeNeeds = recipe.rules
    .map((rule) => {
      const product = products.find((item) => item.id === rule.productId);

      if (!product) {
        return null;
      }

      const defaultGroupKg = rule.kgPerPerson ?? recipe.kgPerPerson;
      let groupKgPerPerson: number;
      if (rule.source && event.kgPerPersonBySource?.[rule.source] != null) {
        groupKgPerPerson = event.kgPerPersonBySource[rule.source]!;
      } else if (event.kgPerPerson != null) {
        groupKgPerPerson = defaultGroupKg * (effectiveKgPerPerson / recipe.kgPerPerson);
      } else {
        groupKgPerPerson = defaultGroupKg;
      }
      const groupShareTotal =
        recipeShareTotals[getRecipeRuleGroupKey(rule.source, rule.kgPerPerson)] ??
        100;
      const rawBase =
        event.people * groupKgPerPerson * (rule.share / groupShareTotal);
      return buildNeed(product, rawBase, rule.share, rule.source);
    })
    .filter((need): need is EventNeed => need !== null);

  const sideNeeds = sideConsumptionRules
    .map((rule) => {
      const product = products.find((item) => item.id === rule.productId);

      if (!product) {
        return null;
      }

      const base = event.people * rule.amountPerPerson;
      return buildNeed(product, base);
    })
    .filter((need): need is EventNeed => need !== null);

  const unitRatioNeeds = unitRatioRules
    .map((rule) => {
      const product = products.find((item) => item.id === rule.productId);
      if (!product) return null;
      const base = Math.ceil(event.people / rule.peoplePerUnit);
      return {
        product,
        base,
        preventive: 0,
        total: base,
        available: product.currentStock,
        missing: Math.max(base - product.currentStock, 0),
      } satisfies EventNeed;
    })
    .filter((need): need is EventNeed => need !== null);

  return [...recipeNeeds, ...sideNeeds, ...unitRatioNeeds];
}

export function createDefaultReturnEntry(need: EventNeed): ReturnEntry {
  return {
    consumed: roundAmount(need.base),
    returned: roundAmount(Math.max(need.total - need.base, 0)),
  };
}

export function getReturnEntry(
  eventId: string,
  productId: string,
  need: EventNeed,
  returnLog: EventReturnLog,
): ReturnEntry {
  return returnLog[eventId]?.[productId] ?? createDefaultReturnEntry(need);
}

export function summarizeReturns(
  eventId: string,
  needs: EventNeed[],
  returnLog: EventReturnLog,
): UnitTotals {
  return needs.reduce<UnitTotals>((totals, need) => {
    const entry = getReturnEntry(eventId, need.product.id, need, returnLog);
    const unit = need.product.unit;
    const current = totals[unit] ?? {
      carried: 0,
      consumed: 0,
      returned: 0,
      expectedReturn: 0,
    };

    totals[unit] = {
      carried: current.carried + need.total,
      consumed: current.consumed + entry.consumed,
      returned: current.returned + entry.returned,
      expectedReturn:
        current.expectedReturn + Math.max(need.total - entry.consumed, 0),
    };

    return totals;
  }, {});
}

export function formatAmount(value: number, unit: ProductUnit): string {
  const decimals = getDisplayDecimals(value);
  const unitLabel = getUnitLabel(value, unit);

  return `${value.toLocaleString("es-PY", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })} ${unitLabel}`;
}

export function formatUnitTotals(
  totals: UnitTotals,
  key: "carried" | "consumed" | "returned" | "expectedReturn",
): string {
  const units: ProductUnit[] = ["kg"];

  return units
    .filter((unit) => totals[unit])
    .map((unit) => formatAmount(totals[unit]?.[key] ?? 0, unit))
    .join(" · ");
}

export function roundAmount(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildNeed(
  product: Product,
  rawBase: number,
  share?: number,
  source?: string,
): EventNeed {
  const base = roundOperationalAmount(rawBase);
  const total = roundOperationalAmount(base * (1 + PREVENTIVE_RATE));
  const preventive = roundAmount(Math.max(total - base, 0));

  return {
    product,
    base,
    preventive,
    total,
    available: product.currentStock,
    missing: Math.max(total - product.currentStock, 0),
    share,
    source,
  };
}

function getRecipeRuleGroupKey(source?: string, kgPerPerson?: number): string {
  return `${source ?? "base"}-${kgPerPerson ?? "recipe"}`;
}

function roundOperationalAmount(value: number): number {
  return roundAmount(Math.ceil(value * 10) / 10);
}

function getUnitLabel(_value: number, unit: ProductUnit): string {
  return unit;
}

function getDisplayDecimals(value: number): number {
  if (Number.isInteger(value)) {
    return 0;
  }

  const valueInGrams = Math.round(value * 1000);

  if (valueInGrams % 100 === 0) {
    return 1;
  }

  if (valueInGrams % 10 === 0) {
    return 2;
  }

  return 3;
}

export function getDefaultKgPerPerson(serviceType?: EventServiceType): number {
  const recipe =
    recipeConfigs.find((item) => item.id === serviceType) ?? recipeConfigs[0];
  return recipe.kgPerPerson;
}

export type RecipeGroup = {
  source: string;
  kgPerPerson: number;
};

export function getRecipeGroups(serviceType?: EventServiceType): RecipeGroup[] {
  const recipe =
    recipeConfigs.find((item) => item.id === serviceType) ?? recipeConfigs[0];
  const seen = new Map<string, number>();
  for (const rule of recipe.rules) {
    const src = rule.source ?? "";
    if (!seen.has(src)) {
      seen.set(src, rule.kgPerPerson ?? recipe.kgPerPerson);
    }
  }
  return Array.from(seen.entries()).map(([source, kgPerPerson]) => ({
    source,
    kgPerPerson,
  }));
}

export function formatEventDate(date: string): string {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}
