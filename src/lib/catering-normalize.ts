import { useEffect } from "react";
import {
  type CateringEvent,
  type EventReturnLog,
  type EventServiceType,
  type EventStatus,
  type Product,
  mockProducts,
} from "@/lib/catering-data";
import { clampAmount, normalizeEventDateInput } from "@/lib/form-utils";
import { roundAmount } from "@/lib/catering-calculations";
import type {
  EventProductPlanLog,
  PersistedCateringState,
  StockMovement,
} from "@/lib/catering-types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isCurrentPersistedState(
  value: PersistedCateringState | null,
  resetVersion: string,
): value is PersistedCateringState {
  return value?.dataResetVersion === resetVersion;
}

export function isEventStatus(value: unknown): value is EventStatus {
  return (
    value === "pendiente" ||
    value === "confirmado" ||
    value === "preparado" ||
    value === "finalizado"
  );
}

export function isEventServiceType(value: unknown): value is EventServiceType {
  return value === "picada" || value === "espeto";
}

export function normalizeProducts(value: unknown): Product[] {
  const savedProducts = Array.isArray(value) ? value : [];
  const stockByProductId = new Map<string, number>();

  savedProducts.forEach((item) => {
    if (!isRecord(item) || typeof item.id !== "string") {
      return;
    }

    const currentStock = Number(item.currentStock);

    if (Number.isFinite(currentStock)) {
      stockByProductId.set(item.id, roundAmount(Math.max(0, currentStock)));
    }
  });

  return mockProducts.map((product) => ({
    ...product,
    currentStock: stockByProductId.get(product.id) ?? product.currentStock,
  }));
}

export function normalizeEvents(value: unknown): CateringEvent[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.date === "string" &&
        Number.isFinite(Number(item.people)) &&
        isEventStatus(item.status) &&
        isEventServiceType(item.serviceType),
    )
    .map((item) => ({
      id: item.id as string,
      manager: typeof item.manager === "string" ? item.manager : "",
      name: item.name as string,
      date: normalizeEventDateInput(item.date as string) ?? (item.date as string),
      ...(typeof item.time === "string" && item.time ? { time: item.time } : {}),
      ...(typeof item.location === "string" && item.location ? { location: item.location } : {}),
      ...(typeof item.locationLat === "number" && isFinite(item.locationLat) ? { locationLat: item.locationLat } : {}),
      ...(typeof item.locationLng === "number" && isFinite(item.locationLng) ? { locationLng: item.locationLng } : {}),
      notes: typeof item.notes === "string" ? item.notes : "",
      people: Math.max(1, Math.round(Number(item.people))),
      status: item.status as EventStatus,
      serviceType: item.serviceType as EventServiceType,
      ...(typeof item.kgPerPerson === "number" && item.kgPerPerson > 0
        ? { kgPerPerson: item.kgPerPerson }
        : {}),
    }))
    .sort((first, second) => first.date.localeCompare(second.date));
}

export function normalizeReturnLog(value: unknown): EventReturnLog {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<EventReturnLog>(
    (normalizedLog, [eventId, productEntries]) => {
      if (!isRecord(productEntries)) {
        return normalizedLog;
      }

      const normalizedEntries = Object.entries(productEntries).reduce<
        EventReturnLog[string]
      >((entries, [productId, entry]) => {
        if (!isRecord(entry)) {
          return entries;
        }

        const consumed = Number(entry.consumed);
        const returned = Number(entry.returned);

        if (!Number.isFinite(consumed) || !Number.isFinite(returned)) {
          return entries;
        }

        entries[productId] = {
          consumed: roundAmount(Math.max(0, consumed)),
          returned: roundAmount(Math.max(0, returned)),
        };

        return entries;
      }, {});

      normalizedLog[eventId] = normalizedEntries;
      return normalizedLog;
    },
    {},
  );
}

export function normalizeEventProductPlanLog(value: unknown): EventProductPlanLog {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<EventProductPlanLog>(
    (normalizedLog, [eventId, productEntries]) => {
      if (!isRecord(productEntries)) {
        return normalizedLog;
      }

      const normalizedEntries = Object.entries(productEntries).reduce<
        EventProductPlanLog[string]
      >((entries, [productId, entry]) => {
        if (!isRecord(entry)) {
          return entries;
        }

        const total = Number(entry.total);

        if (!Number.isFinite(total)) {
          return entries;
        }

        entries[productId] = {
          removed: entry.removed === true,
          total: clampAmount(total),
        };

        return entries;
      }, {});

      normalizedLog[eventId] = normalizedEntries;
      return normalizedLog;
    },
    {},
  );
}

export function normalizeStockMovements(value: unknown): StockMovement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.productId === "string" &&
        (item.type === "entrada" || item.type === "salida") &&
        typeof item.date === "string" &&
        Number.isFinite(Number(item.amount)),
    )
    .map((item) => ({
      id: item.id as string,
      productId: item.productId as string,
      type: item.type as StockMovement["type"],
      amount: clampAmount(Number(item.amount)),
      date: item.date as string,
      eventDate: typeof item.eventDate === "string" ? item.eventDate : undefined,
      eventId: typeof item.eventId === "string" ? item.eventId : undefined,
      eventName: typeof item.eventName === "string" ? item.eventName : undefined,
      eventStatus: isEventStatus(item.eventStatus)
        ? item.eventStatus
        : undefined,
      note: typeof item.note === "string" ? item.note : "Movimiento manual",
      provider: typeof item.provider === "string" ? item.provider : undefined,
      serviceType: isEventServiceType(item.serviceType)
        ? item.serviceType
        : undefined,
    }))
    .sort((first, second) => second.date.localeCompare(first.date));
}

export function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) {
      return;
    }

    const originalBodyOverflow = document.body.style.overflow;
    const originalDocumentOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalDocumentOverflow;
    };
  }, [isLocked]);
}
