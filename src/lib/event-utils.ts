import type { CateringEvent, EventReturnLog, ReturnEntry } from "@/lib/catering-data";
import {
  calculateEventNeeds,
  formatAmount,
  formatEventDate,
  type EventNeed,
} from "@/lib/catering-calculations";
import type { EventProductPlanEntry } from "@/lib/catering-types";
import { serviceTypeCopy } from "@/lib/catering-app-constants";
import { clampAmount } from "@/lib/form-utils";
import { formatEventNameDisplay, formatPersonName } from "@/lib/stock-utils";

export function getEventOperationalNeeds(
  event: CateringEvent,
  products: import("@/lib/catering-data").Product[],
  eventProductPlan?: Record<string, EventProductPlanEntry>,
  includeZeroDrafts = false,
): EventNeed[] {
  const baseNeeds = calculateEventNeeds(event, products);
  const plannedNeeds = baseNeeds
    .map((need): EventNeed | null => {
      const planEntry = eventProductPlan?.[need.product.id];
      const plannedTotal = planEntry?.total;

      if (planEntry?.removed) {
        return null;
      }

      if (plannedTotal === undefined) {
        return need;
      }

      return {
        ...need,
        missing: Math.max(plannedTotal - need.product.currentStock, 0),
        total: plannedTotal,
      };
    })
    .filter(
      (need): need is EventNeed =>
        need !== null && (includeZeroDrafts || need.total > 0),
    );
  const baseProductIds = new Set(baseNeeds.map((need) => need.product.id));
  const extraNeeds = Object.entries(eventProductPlan ?? {})
    .filter(
      ([productId, entry]) =>
        !baseProductIds.has(productId) &&
        !entry.removed &&
        (includeZeroDrafts || entry.total > 0),
    )
    .map(([productId, entry]): EventNeed | null => {
      const product = products.find((item) => item.id === productId);

      if (!product) {
        return null;
      }

      return {
        available: product.currentStock,
        base: 0,
        missing: Math.max(entry.total - product.currentStock, 0),
        preventive: 0,
        product,
        source: "Extra",
        total: entry.total,
      };
    })
    .filter((need): need is EventNeed => need !== null);

  return [...plannedNeeds, ...extraNeeds];
}

export function buildDefaultEventProductPlan(
  event: CateringEvent,
  products: import("@/lib/catering-data").Product[],
  savedProductPlan: Record<string, EventProductPlanEntry> = {},
): Record<string, EventProductPlanEntry> {
  const baseNeeds = calculateEventNeeds(event, products);
  const baseProductIds = new Set(baseNeeds.map((need) => need.product.id));
  const defaultPlan = baseNeeds.reduce<Record<string, EventProductPlanEntry>>(
    (plan, need) => {
      const savedEntry = savedProductPlan[need.product.id];

      plan[need.product.id] = savedEntry
        ? { ...savedEntry }
        : {
            removed: false,
            total: need.total,
          };

      return plan;
    },
    {},
  );

  Object.entries(savedProductPlan).forEach(([productId, entry]) => {
    if (!baseProductIds.has(productId)) {
      defaultPlan[productId] = { ...entry };
    }
  });

  return defaultPlan;
}

export function getStoredReturnEntry(
  eventId: string,
  productId: string,
  returnLog: EventReturnLog,
): ReturnEntry {
  return (
    returnLog[eventId]?.[productId] ?? {
      consumed: 0,
      returned: 0,
    }
  );
}

export function getDraftReturnEntry(
  productId: string,
  returnEntries: EventReturnLog[string],
): ReturnEntry {
  return (
    returnEntries[productId] ?? {
      consumed: 0,
      returned: 0,
    }
  );
}

export function getReturnMovementId(eventId: string, productId: string): string {
  return `return-${eventId}-${productId}`;
}

export function formatCalendarDate(value: string): string {
  return value.replaceAll("-", "");
}

export function addDaysToDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);

  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

export function exportEventToCalendar(event: CateringEvent) {
  const startDate = formatCalendarDate(event.date);
  const endDate = formatCalendarDate(addDaysToDate(event.date, 1));
  const description = [
    `Servicio: ${serviceTypeCopy[event.serviceType]}`,
    `Personas: ${event.people}`,
    event.manager ? `Encargado: ${formatPersonName(event.manager)}` : "",
    event.notes ? `Observaciones: ${event.notes}` : "",
  ].filter(Boolean);
  const calendarUrl = new URL("https://calendar.google.com/calendar/render");

  calendarUrl.searchParams.set("action", "TEMPLATE");
  calendarUrl.searchParams.set("text", formatEventNameDisplay(event.name));
  calendarUrl.searchParams.set("dates", `${startDate}/${endDate}`);
  calendarUrl.searchParams.set("details", description.join("\n"));

  window.open(calendarUrl.toString(), "_blank", "noopener,noreferrer");
}

type WhatsappNeedGroupId = "entry" | "main" | "other";

const whatsappNeedGroupConfigs: Array<{
  id: WhatsappNeedGroupId;
  title: string;
  totalLabel: string;
}> = [
  {
    id: "entry",
    title: "Parrillitas de entrada",
    totalLabel: "Total kg parrillitas entrada",
  },
  {
    id: "main",
    title: "Plato principal / asado completo",
    totalLabel: "Total kg plato principal",
  },
  {
    id: "other",
    title: "Otros productos de despensa",
    totalLabel: "Total kg otros",
  },
];

function getWhatsappNeedGroupId(
  event: CateringEvent,
  need: EventNeed,
): WhatsappNeedGroupId {
  if (need.source === "Parrillita previa") {
    return "entry";
  }

  if (need.source === "Catering asado") {
    return "main";
  }

  if (
    event.serviceType === "picada" &&
    (need.product.category === "Carnes" || need.product.category === "Embutidos")
  ) {
    return "entry";
  }

  return "other";
}

function formatWhatsappNeedGroup(group: {
  needs: EventNeed[];
  title: string;
  totalLabel: string;
}): string {
  const kgTotal = clampAmount(
    group.needs.reduce(
      (total, need) =>
        need.product.unit === "kg" ? total + need.total : total,
      0,
    ),
  );
  const totalsText = [
    kgTotal > 0 ? `_${group.totalLabel}: ${formatAmount(kgTotal, "kg")} aproximadamente_` : "",
  ].filter(Boolean);
  const needLines = group.needs.map(
    (need) =>
      `• *${formatAmount(need.total, need.product.unit)}* - ${need.product.name}`,
  );

  return [`*${group.title}*`, ...totalsText, ...needLines].join("\n");
}

export function getEventNeedsWhatsappUrl(event: CateringEvent, needs: EventNeed[]) {
  const icons = {
    box: String.fromCodePoint(0x1f4e6),
    calendar: String.fromCodePoint(0x1f4c5),
    clock: String.fromCodePoint(0x1f553),
    fire: String.fromCodePoint(0x1f4cb),
    location: String.fromCodePoint(0x1f4cd),
    people: String.fromCodePoint(0x1f465),
  };
  const locationUrl =
    event.locationLat !== undefined && event.locationLng !== undefined
      ? `https://maps.google.com/?q=${event.locationLat},${event.locationLng}`
      : event.location
        ? `https://maps.google.com/?q=${encodeURIComponent(event.location)}`
        : null;
  const locationText =
    event.location?.trim() ||
    (locationUrl ? "Ver ubicación en Maps" : "Sin ubicación cargada");
  const timeText = event.time?.trim() || "Sin hora cargada";
  const visibleNeeds = needs.filter((need) => need.total > 0);
  const groupedNeeds = whatsappNeedGroupConfigs
    .map((group) => ({
      ...group,
      needs: visibleNeeds.filter(
        (need) => getWhatsappNeedGroupId(event, need) === group.id,
      ),
    }))
    .filter((group) => group.needs.length > 0);
  const needsText =
    groupedNeeds.length > 0
      ? groupedNeeds.map(formatWhatsappNeedGroup).join("\n\n")
      : "Sin necesidades cargadas.";
  const message = [
    `${icons.fire} *Necesidades para ${formatEventNameDisplay(event.name)}*`,
    `${icons.calendar} *Fecha:* ${formatEventDate(event.date)}`,
    `${icons.clock} *Hora del evento:* ${timeText}`,
    `${icons.location} *Ubicación:* ${locationUrl ?? locationText}`,
    `${icons.people} *Personas:* ${event.people}`,
    "",
    `*Servicio:* ${serviceTypeCopy[event.serviceType]}`,
    event.manager ? `*Encargado:* ${formatPersonName(event.manager)}` : null,
    "",
    `${icons.box} *Lista para sacar y preparar:*`,
    needsText,
    "",
    "Aguardo confirmación de las cantidades exactas que se llevan al evento.",
  ]
    .filter((line) => line !== null)
    .join("\n");
  const whatsappUrl = `/api/share-message?text=${encodeURIComponent(message)}`;

  return whatsappUrl;
}
