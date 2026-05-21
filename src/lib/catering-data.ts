export type ProductUnit = "kg" | "un";

export type ProductCategory =
  | "Carnes"
  | "Embutidos"
  | "Despensa"
  | "Inventario";

export type EventStatus =
  | "pendiente"
  | "confirmado"
  | "preparado"
  | "finalizado";

export type EventServiceType = "picada" | "espeto";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  currentStock: number;
};

export type CateringEvent = {
  id: string;
  manager?: string;
  name: string;
  date: string;
  time?: string;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  notes?: string;
  people: number;
  status: EventStatus;
  serviceType: EventServiceType;
  kgPerPerson?: number;
};

export type ConsumptionRule = {
  productId: string;
  amountPerPerson: number;
};

export type UnitRatioRule = {
  productId: string;
  peoplePerUnit: number;
};

export type RecipeRule = {
  productId: string;
  share: number;
  kgPerPerson?: number;
  source?: string;
};

export type RecipeConfig = {
  id: EventServiceType;
  name: string;
  kgPerPerson: number;
  rules: RecipeRule[];
};

export type ReturnEntry = {
  consumed: number;
  returned: number;
};

export type EventReturnLog = Record<string, Record<string, ReturnEntry>>;

export const PREVENTIVE_RATE = 0.15;

export const mockProducts: Product[] = [
  // ── Carnes (kg) ──────────────────────────────────────────
  { id: "vacio",            name: "Vacío",               category: "Carnes",    unit: "kg", currentStock: 0 },
  { id: "cupin",            name: "Cupín",               category: "Carnes",    unit: "kg", currentStock: 0 },
  { id: "costilla",         name: "Costilla de vaca",    category: "Carnes",    unit: "kg", currentStock: 0 },
  { id: "tapa-cuadril",     name: "Tapa cuadril",        category: "Carnes",    unit: "kg", currentStock: 0 },
  { id: "colita-cuadril",   name: "Colita cuadril",      category: "Carnes",    unit: "kg", currentStock: 0 },
  { id: "bondiola",         name: "Bondiola",            category: "Carnes",    unit: "kg", currentStock: 0 },
  { id: "matambrito-cerdo", name: "Matambrito de cerdo", category: "Carnes",    unit: "kg", currentStock: 0 },
  { id: "costilla-cerdo",   name: "Costilla de cerdo",   category: "Carnes",    unit: "kg", currentStock: 0 },
  { id: "muslo-pollo",      name: "Muslo de pollo",      category: "Carnes",    unit: "kg", currentStock: 0 },
  { id: "corazon-pollo",    name: "Corazón de pollo",    category: "Carnes",    unit: "kg", currentStock: 0 },
  // ── Embutidos (kg) ───────────────────────────────────────
  { id: "choriqueso",       name: "Choriqueso",          category: "Embutidos", unit: "kg", currentStock: 0 },
  { id: "parrillero",       name: "Chorizo parrillero",  category: "Embutidos", unit: "kg", currentStock: 0 },
  { id: "toscano",          name: "Toscano",             category: "Embutidos", unit: "kg", currentStock: 0 },
  { id: "viena-picante",    name: "Viena picante",       category: "Embutidos", unit: "kg", currentStock: 0 },
  { id: "morcilla",         name: "Morcilla",            category: "Embutidos", unit: "kg", currentStock: 0 },
  // ── Despensa — consumibles del servicio ──────────────────
  { id: "mandioca",         name: "Mandioca",            category: "Despensa",  unit: "kg", currentStock: 0 },
  { id: "sopa",             name: "Sopa paraguaya",      category: "Despensa",  unit: "kg", currentStock: 0 },
  { id: "sal",                  name: "Sal",                  category: "Despensa", unit: "un", currentStock: 0 },
  { id: "pan-de-ajo",           name: "Pan de ajo",           category: "Despensa", unit: "un", currentStock: 0 },
  { id: "mbeju",                name: "Mbeju",                category: "Despensa", unit: "kg", currentStock: 0 },
  { id: "piña",                 name: "Piña",                 category: "Despensa", unit: "un", currentStock: 0 },
  { id: "leche-condensada",     name: "Leche condensada",     category: "Despensa", unit: "un", currentStock: 0 },
  { id: "canela",               name: "Canela",               category: "Despensa", unit: "un", currentStock: 0 },
  { id: "carbon",               name: "Carbón",               category: "Despensa", unit: "kg", currentStock: 0 },
  { id: "escarbadientes-cortos", name: "Escarbadientes cortos", category: "Inventario", unit: "un", currentStock: 0 },
  { id: "escarbadientes-largos", name: "Escarbadientes largos", category: "Inventario", unit: "un", currentStock: 0 },
  { id: "servilletas",          name: "Servilletas",           category: "Inventario", unit: "un", currentStock: 0 },
  { id: "stickers",             name: "Stickers",              category: "Inventario", unit: "un", currentStock: 0 },
  { id: "bandeja-isopor",       name: "Bandeja de isopor",     category: "Inventario", unit: "un", currentStock: 0 },
  // ── Inventario operativo ─────────────────────────────────
  { id: "parrillitas",          name: "Parrillitas",           category: "Inventario", unit: "un", currentStock: 0 },
  { id: "parrilla-giragrill",   name: "Parrilla giragrill",    category: "Inventario", unit: "un", currentStock: 0 },
  { id: "espadines",            name: "Espadines",             category: "Inventario", unit: "un", currentStock: 0 },
  { id: "parrilla-convencional",name: "Parrilla convencional", category: "Inventario", unit: "un", currentStock: 0 },
  { id: "fogonero",             name: "Fogonero",              category: "Inventario", unit: "un", currentStock: 0 },
  { id: "asador-en-cruz",       name: "Asador en cruz",        category: "Inventario", unit: "un", currentStock: 0 },
  { id: "palitas",              name: "Palitas",               category: "Inventario", unit: "un", currentStock: 0 },
  { id: "atizadores",           name: "Atizadores",            category: "Inventario", unit: "un", currentStock: 0 },
  { id: "toldo",                name: "Toldo",                 category: "Inventario", unit: "un", currentStock: 0 },
  { id: "mesas",                name: "Mesas",                 category: "Inventario", unit: "un", currentStock: 0 },
  { id: "alargue",              name: "Alargue",               category: "Inventario", unit: "un", currentStock: 0 },
  { id: "focos",                name: "Focos",                 category: "Inventario", unit: "un", currentStock: 0 },
  { id: "portafoco",            name: "Portafoco",             category: "Inventario", unit: "un", currentStock: 0 },
  { id: "triple",               name: "Triple",                category: "Inventario", unit: "un", currentStock: 0 },
  { id: "tablas-de-picar",      name: "Tablas de picar",       category: "Inventario", unit: "un", currentStock: 0 },
  { id: "bandejas-metalicas",   name: "Bandejas metálicas",    category: "Inventario", unit: "un", currentStock: 0 },
  { id: "bandeja-espeto",       name: "Bandeja de espeto",     category: "Inventario", unit: "un", currentStock: 0 },
  { id: "cuchillo-espeto",      name: "Cuchillo para espeto",  category: "Inventario", unit: "un", currentStock: 0 },
  { id: "tenedor-espeto",       name: "Tenedor para espeto",   category: "Inventario", unit: "un", currentStock: 0 },
  { id: "tenedor-largo",        name: "Tenedor largo",         category: "Inventario", unit: "un", currentStock: 0 },
  { id: "cuchillo-largo",       name: "Cuchillo largo",        category: "Inventario", unit: "un", currentStock: 0 },
  { id: "cuchillo-de-mesa",     name: "Cuchillo de mesa",      category: "Inventario", unit: "un", currentStock: 0 },
  { id: "cucharas",             name: "Cucharas",              category: "Inventario", unit: "un", currentStock: 0 },
  { id: "cucharas-anchas",      name: "Cucharas anchas",       category: "Inventario", unit: "un", currentStock: 0 },
  { id: "pailas",               name: "Pailas",                category: "Inventario", unit: "un", currentStock: 0 },
  { id: "caja-negra",           name: "Caja negra",            category: "Inventario", unit: "un", currentStock: 0 },
  { id: "trapos",               name: "Trapos",                category: "Inventario", unit: "un", currentStock: 0 },
  { id: "delantales",           name: "Delantales",            category: "Inventario", unit: "un", currentStock: 0 },
  { id: "bachas",               name: "Bachas",                category: "Inventario", unit: "un", currentStock: 0 },
  { id: "pinzas",               name: "Pinzas",                category: "Inventario", unit: "un", currentStock: 0 },
];

export const mockEvents: CateringEvent[] = [];

export const recipeConfigs: RecipeConfig[] = [
  {
    id: "picada",
    name: "Parrillita corrida",
    kgPerPerson: 0.4,
    rules: [
      { productId: "vacio", share: 40 },
      { productId: "cupin", share: 10 },
      { productId: "tapa-cuadril", share: 10 },
      { productId: "colita-cuadril", share: 5 },
      { productId: "matambrito-cerdo", share: 7.5 },
      { productId: "choriqueso", share: 7.5 },
      { productId: "parrillero", share: 7.5 },
      { productId: "toscano", share: 7.5 },
      { productId: "viena-picante", share: 2.5 },
      { productId: "morcilla", share: 2.5 },
    ],
  },
  {
    id: "espeto",
    name: "Catering asado",
    kgPerPerson: 0.7,
    rules: [
      {
        productId: "costilla",
        share: 35,
        kgPerPerson: 0.5,
        source: "Catering asado",
      },
      {
        productId: "vacio",
        share: 25,
        kgPerPerson: 0.5,
        source: "Catering asado",
      },
      {
        productId: "bondiola",
        share: 15,
        kgPerPerson: 0.5,
        source: "Catering asado",
      },
      {
        productId: "cupin",
        share: 15,
        kgPerPerson: 0.5,
        source: "Catering asado",
      },
      {
        productId: "tapa-cuadril",
        share: 4,
        kgPerPerson: 0.5,
        source: "Catering asado",
      },
      {
        productId: "colita-cuadril",
        share: 3,
        kgPerPerson: 0.5,
        source: "Catering asado",
      },
      {
        productId: "muslo-pollo",
        share: 3,
        kgPerPerson: 0.5,
        source: "Catering asado",
      },
      {
        productId: "matambrito-cerdo",
        share: 22.5,
        kgPerPerson: 0.2,
        source: "Parrillita previa",
      },
      {
        productId: "choriqueso",
        share: 22.5,
        kgPerPerson: 0.2,
        source: "Parrillita previa",
      },
      {
        productId: "parrillero",
        share: 22.5,
        kgPerPerson: 0.2,
        source: "Parrillita previa",
      },
      {
        productId: "toscano",
        share: 22.5,
        kgPerPerson: 0.2,
        source: "Parrillita previa",
      },
      {
        productId: "viena-picante",
        share: 5,
        kgPerPerson: 0.2,
        source: "Parrillita previa",
      },
      {
        productId: "morcilla",
        share: 5,
        kgPerPerson: 0.2,
        source: "Parrillita previa",
      },
    ],
  },
];

export const sideConsumptionRules: ConsumptionRule[] = [
  { productId: "mandioca", amountPerPerson: 0.25 },
  { productId: "sopa", amountPerPerson: 0.12 },
  { productId: "pan", amountPerPerson: 0.08 },
  { productId: "carbon", amountPerPerson: 0.25 },
];

export const unitRatioRules: UnitRatioRule[] = [
  { productId: "piña", peoplePerUnit: 8 },
  { productId: "parrillitas", peoplePerUnit: 10 },
];
