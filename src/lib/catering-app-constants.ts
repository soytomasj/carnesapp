import {
  CalendarDays,
  ChefHat,
  ClipboardList,
  Flame,
  Gauge,
  PackageCheck,
  PackagePlus,
  Refrigerator,
  ShoppingCart,
  Utensils,
} from "lucide-react";
import {
  type EventServiceType,
  type EventStatus,
  type Product,
  recipeConfigs,
} from "@/lib/catering-data";
import type { EventAgendaFilter, Section, StockProductGroup } from "@/lib/catering-types";

export const stockProviders = [
  "Frigomerc",
  "Concepcion",
  "Neuland",
  "CA Import",
  "FC Ruvicha",
  "UPISA",
  "Z-Carnes",
  "D & M",
  "Aguilar Trading",
  "Producar",
  "Frigochaco",
  "Chorti",
  "TransparD",
  "Oviedo Carnes",
  "Fortis",
  "Frigo Nikkei",
  "Otro",
];

export function isDashboardStockProduct(product: Product): boolean {
  return product.category === "Carnes" || product.category === "Embutidos";
}

export const sections: Array<{
  id: Section;
  label: string;
  icon: typeof Gauge;
}> = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "frigorifico", label: "Frigorífico", icon: Refrigerator },
  { id: "despensa", label: "Despensa", icon: Utensils },
  { id: "inventario", label: "Inventario", icon: ClipboardList },
  { id: "eventos", label: "Eventos", icon: CalendarDays },
];

export const pantryProductGroups: StockProductGroup[] = [
  {
    description: "Comida, guarniciones y extras servidos en mesa.",
    icon: Utensils,
    id: "alimentos",
    label: "Alimentos y acompañamientos",
    productIds: [
      "pan-de-ajo",
      "mandioca",
      "sopa",
      "mbeju",
      "piña",
      "leche-condensada",
      "canela",
    ],
  },
  {
    description: "Preparación previa, salado y fuego.",
    icon: Flame,
    id: "preparacion",
    label: "Preparación y fuego",
    productIds: ["sal", "carbon"],
  },
];

export const inventarioProductGroups: StockProductGroup[] = [
  {
    description: "Parrillas, fogoneros y estructuras de asado.",
    icon: Flame,
    id: "parrillas",
    label: "Parrillas y fogones",
    productIds: [
      "parrillitas", "parrilla-giragrill", "parrilla-convencional",
      "fogonero", "asador-en-cruz", "espadines",
    ],
  },
  {
    description: "Herramientas para el manejo del asado y la parrilla.",
    icon: Utensils,
    id: "herramientas",
    label: "Herramientas de asado",
    productIds: [
      "palitas", "atizadores", "pinzas",
      "cuchillo-espeto", "tenedor-espeto",
      "tenedor-largo", "cuchillo-largo", "cuchillo-de-mesa",
      "cucharas", "cucharas-anchas", "tablas-de-picar",
    ],
  },
  {
    description: "Bandejas, pailas y contenedores.",
    icon: PackageCheck,
    id: "utensilios",
    label: "Utensilios y recipientes",
    productIds: [
      "bandejas-metalicas", "bandeja-espeto",
      "pailas", "caja-negra",
    ],
  },
  {
    description: "Mesas, toldos y mobiliario del servicio.",
    icon: ClipboardList,
    id: "mobiliario",
    label: "Mobiliario",
    productIds: ["mesas", "toldo"],
  },
  {
    description: "Tendido eléctrico, iluminación y adaptadores.",
    icon: PackagePlus,
    id: "electricidad",
    label: "Electricidad",
    productIds: ["alargue", "triple", "focos", "portafoco"],
  },
  {
    description: "Delantales, trapos y elementos de limpieza.",
    icon: ChefHat,
    id: "indumentaria",
    label: "Indumentaria y limpieza",
    productIds: ["delantales", "trapos", "bachas"],
  },
  {
    description: "Elementos que se consumen durante el servicio.",
    icon: ShoppingCart,
    id: "servicio",
    label: "Servicio y descartables",
    productIds: [
      "escarbadientes-cortos",
      "escarbadientes-largos",
      "servilletas",
      "stickers",
      "bandeja-isopor",
    ],
  },
];

export const eventStatusCopy: Record<EventStatus, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  preparado: "Preparado",
  finalizado: "Finalizado",
};

export const editableEventStatuses: EventStatus[] = [
  "confirmado",
  "finalizado",
  "pendiente",
];

export const eventStatusStyles: Record<EventStatus, string> = {
  pendiente: "border-amber-200 bg-amber-50 text-amber-800",
  confirmado: "border-emerald-200 bg-emerald-50 text-emerald-800",
  preparado: "border-sky-200 bg-sky-50 text-sky-800",
  finalizado: "border-zinc-200 bg-zinc-100 text-zinc-700",
};

export const serviceTypeCopy = recipeConfigs.reduce(
  (copy, recipe) => ({
    ...copy,
    [recipe.id]: recipe.name,
  }),
  {} as Record<EventServiceType, string>,
);

export const eventAgendaFilters: Array<{
  id: EventAgendaFilter;
  label: string;
}> = [
  { id: "todos", label: "Todos" },
  { id: "proximos", label: "Próximos" },
  { id: "personas-desc", label: "Más personas" },
  { id: "personas-asc", label: "Menos personas" },
  { id: "recientes", label: "Recién agregados" },
  { id: "finalizados", label: "Finalizados" },
];
