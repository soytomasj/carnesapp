export type ProductUnit = "kg";

export type ProductCategory =
  | "Carnes"
  | "Embutidos"
  | "Guarniciones"
  | "Panificados"
  | "Fuego";

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
  notes?: string;
  people: number;
  status: EventStatus;
  serviceType: EventServiceType;
};

export type ConsumptionRule = {
  productId: string;
  amountPerPerson: number;
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
  {
    id: "vacio",
    name: "Vacío",
    category: "Carnes",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "cupin",
    name: "Cupín",
    category: "Carnes",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "costilla",
    name: "Costilla",
    category: "Carnes",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "bondiola",
    name: "Bondiola",
    category: "Carnes",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "tapa-cuadril",
    name: "Tapa cuadril",
    category: "Carnes",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "colita-cuadril",
    name: "Colita cuadril",
    category: "Carnes",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "muslo-pollo",
    name: "Muslo de pollo",
    category: "Carnes",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "corazon-pollo",
    name: "Corazón de pollo",
    category: "Carnes",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "matambrito-cerdo",
    name: "Matambrito de cerdo",
    category: "Carnes",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "choriqueso",
    name: "Choriqueso",
    category: "Embutidos",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "parrillero",
    name: "Chorizo parrillero",
    category: "Embutidos",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "toscano",
    name: "Toscano",
    category: "Embutidos",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "viena-picante",
    name: "Viena picante",
    category: "Embutidos",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "morcilla",
    name: "Morcilla",
    category: "Embutidos",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "mandioca",
    name: "Mandioca",
    category: "Guarniciones",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "sopa",
    name: "Sopa paraguaya",
    category: "Guarniciones",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "pan",
    name: "Pan",
    category: "Panificados",
    unit: "kg",
    currentStock: 0,
  },
  {
    id: "carbon",
    name: "Carbón",
    category: "Fuego",
    unit: "kg",
    currentStock: 0,
  },
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
