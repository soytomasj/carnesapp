import type { Gauge } from "lucide-react";
import type {
  CateringEvent,
  EventServiceType,
  EventStatus,
  ProductUnit,
} from "@/lib/catering-data";

export type Section =
  | "dashboard"
  | "frigorifico"
  | "despensa"
  | "inventario"
  | "eventos";

export type EventForm = {
  name: string;
  date: string;
  time: string;
  location: string;
  locationLat: number | null;
  locationLng: number | null;
  manager: string;
  notes: string;
  people: string;
  kgPerPerson: string;
  status: EventStatus;
  serviceType: EventServiceType;
};

export type StockForm = {
  productId: string;
  provider: string;
  value: string;
};

export type EventAgendaFilter =
  | "todos"
  | "proximos"
  | "personas-desc"
  | "personas-asc"
  | "recientes"
  | "finalizados";

export type StockMovement = {
  id: string;
  productId: string;
  type: "entrada" | "salida";
  amount: number;
  date: string;
  note: string;
  provider?: string;
  eventDate?: string;
  eventId?: string;
  eventName?: string;
  eventStatus?: EventStatus;
  serviceType?: EventServiceType;
};

export type StockFeedback = {
  amount: number;
  productName: string;
  provider?: string;
  unit: ProductUnit;
} | null;

export type StockReservationEntry = {
  amount: number;
  eventDate: string;
  eventId: string;
  eventName: string;
  eventStatus: EventStatus;
  productId: string;
  serviceType: EventServiceType;
};

export type StockProductGroup = {
  description: string;
  icon: typeof Gauge;
  id: string;
  label: string;
  productIds: string[];
};

export type EventProductPlanEntry = {
  removed?: boolean;
  total: number;
};

export type EventProductPlanLog = Record<
  string,
  Record<string, EventProductPlanEntry>
>;

export type ReturnStockMovementContext = {
  event: CateringEvent;
  nextReturned: number;
  previousReturned: number;
  productId: string;
};

export type PersistedCateringState = {
  activeSection?: Section;
  dataResetVersion?: unknown;
  eventProductPlanLog?: unknown;
  events?: unknown;
  products?: unknown;
  returnLog?: unknown;
  selectedEventId?: unknown;
  stockDepartureEventIds?: unknown;
  stockMovements?: unknown;
};

export type SyncStatus = "loading" | "local" | "saving" | "synced" | "error";
