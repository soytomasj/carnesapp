"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type {
  CateringEvent,
  EventReturnLog,
  EventStatus,
  Product,
} from "@/lib/catering-data";
import { mockProducts } from "@/lib/catering-data";
import {
  formatAmount,
  getDefaultKgPerPerson,
  roundAmount,
  type EventNeed,
} from "@/lib/catering-calculations";
import type {
  EventForm,
  EventProductPlanLog,
  PersistedCateringState,
  ReturnStockMovementContext,
  Section,
  StockFeedback,
  StockForm,
  StockMovement,
  SyncStatus,
} from "@/lib/catering-types";
import {
  isDashboardStockProduct,
  stockProviders,
} from "@/lib/catering-app-constants";
import {
  isCurrentPersistedState,
  isRecord,
  normalizeEventProductPlanLog,
  normalizeEvents,
  normalizeProducts,
  normalizeReturnLog,
  normalizeStockMovements,
  normalizeStringList,
} from "@/lib/catering-normalize";
import {
  clampAmount,
  formatDateForForm,
  isPastEventDate,
  normalizeEventDateInput,
  normalizeEventTimeInput,
  parseAmountInput,
} from "@/lib/form-utils";
import { formatPersonName } from "@/lib/stock-utils";
import {
  getDraftReturnEntry,
  getEventOperationalNeeds,
  getReturnMovementId,
  getStoredReturnEntry,
} from "@/lib/event-utils";

const CATERING_STATE_API_PATH = "/api/catering-state";
const LEGACY_LOCAL_STORAGE_PREFIX = "brasas-prime-catering-state";
const LOCAL_STORAGE_KEY = "koke-al-asador-catering-state-v1";
const LOCAL_STORAGE_RESET_KEY = "koke-al-asador-catering-reset-version";
const LOCAL_STORAGE_RESET_VERSION = "empty-stock-events-2026-05-20";

export function useCateringApp() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [events, setEvents] = useState<CateringEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventProductPlanLog, setEventProductPlanLog] =
    useState<EventProductPlanLog>({});
  const [returnLog, setReturnLog] = useState<EventReturnLog>({});
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [stockDepartureEventIds, setStockDepartureEventIds] = useState<string[]>(
    [],
  );
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [stockForm, setStockForm] = useState<StockForm>({
    productId: mockProducts[0]?.id ?? "",
    provider: stockProviders[0] ?? "",
    value: "",
  });
  const [stockFeedback, setStockFeedback] = useState<StockFeedback>(null);
  const [eventForm, setEventForm] = useState<EventForm>({
    name: "",
    date: "14/06/2026",
    time: "",
    location: "",
    locationLat: null,
    locationLng: null,
    manager: "",
    notes: "",
    people: "60",
    kgPerPerson: "",
    status: "pendiente",
    serviceType: "picada",
  });

  useEffect(() => {
    let isCancelled = false;

    const timeoutId = window.setTimeout(async () => {
      try {
        if (
          window.localStorage.getItem(LOCAL_STORAGE_RESET_KEY) !==
          LOCAL_STORAGE_RESET_VERSION
        ) {
          Object.keys(window.localStorage).forEach((key) => {
            if (
              key.startsWith(LEGACY_LOCAL_STORAGE_PREFIX) ||
              key.startsWith("koke-al-asador-catering-state")
            ) {
              window.localStorage.removeItem(key);
            }
          });
          window.localStorage.setItem(
            LOCAL_STORAGE_RESET_KEY,
            LOCAL_STORAGE_RESET_VERSION,
          );
        }

        let didReachRemote = false;
        let parsedState: PersistedCateringState | null = null;

        try {
          const remoteResponse = await fetch(CATERING_STATE_API_PATH, {
            cache: "no-store",
          });

          if (remoteResponse.ok) {
            didReachRemote = true;
            const remotePayload = (await remoteResponse.json()) as unknown;

            if (
              isRecord(remotePayload) &&
              isRecord(remotePayload.state)
            ) {
              const remoteState = remotePayload.state as PersistedCateringState;

              if (isCurrentPersistedState(remoteState, LOCAL_STORAGE_RESET_VERSION)) {
                parsedState = remoteState;
              }
            }
          }
        } catch {
          didReachRemote = false;
        }

        if (!parsedState) {
          const storedState = window.localStorage.getItem(LOCAL_STORAGE_KEY);

          if (storedState) {
            const localState = JSON.parse(storedState) as PersistedCateringState;

            if (isCurrentPersistedState(localState, LOCAL_STORAGE_RESET_VERSION)) {
              parsedState = localState;
            }
          }
        }

        if (!parsedState) {
          if (isCancelled) {
            return;
          }

          setProducts(mockProducts);
          setEvents([]);
          setEventProductPlanLog({});
          setReturnLog({});
          setStockMovements([]);
          setStockDepartureEventIds([]);
          setSelectedEventId("");
          setSyncStatus(didReachRemote ? "synced" : "local");
          setHasLoadedLocalState(true);
          return;
        }

        const restoredProducts = normalizeProducts(parsedState.products);
        const restoredEvents = normalizeEvents(parsedState.events) ?? [];
        const restoredEventProductPlanLog = normalizeEventProductPlanLog(
          parsedState.eventProductPlanLog,
        );
        const restoredReturnLog = normalizeReturnLog(parsedState.returnLog);
        const restoredStockMovements = normalizeStockMovements(
          parsedState.stockMovements,
        );
        const restoredStockDepartureEventIds = normalizeStringList(
          parsedState.stockDepartureEventIds,
        );
        const restoredSelectedEventId =
          typeof parsedState.selectedEventId === "string" &&
          restoredEvents.some((event) => event.id === parsedState.selectedEventId)
            ? parsedState.selectedEventId
            : restoredEvents[0]?.id ?? "";

        if (isCancelled) {
          return;
        }

        setProducts(restoredProducts);
        setEvents(restoredEvents);
        setEventProductPlanLog(restoredEventProductPlanLog);
        setReturnLog(restoredReturnLog);
        setStockMovements(restoredStockMovements);
        setStockDepartureEventIds(restoredStockDepartureEventIds);
        setSelectedEventId(restoredSelectedEventId);
        setSyncStatus(didReachRemote ? "synced" : "local");

      } catch {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
        setSyncStatus("error");
      } finally {
        if (!isCancelled) {
          setHasLoadedLocalState(true);
        }
      }
    }, 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalState) {
      return;
    }

    const activeEventIds = new Set(events.map((event) => event.id));
    const orphanEventMovements = stockMovements.filter(
      (movement) => movement.eventId && !activeEventIds.has(movement.eventId),
    );
    const orphanProductPlanIds = Object.keys(eventProductPlanLog).filter(
      (eventId) => !activeEventIds.has(eventId),
    );
    const orphanReturnIds = Object.keys(returnLog).filter(
      (eventId) => !activeEventIds.has(eventId),
    );
    const orphanDepartureIds = stockDepartureEventIds.filter(
      (eventId) => !activeEventIds.has(eventId),
    );

    if (
      orphanEventMovements.length === 0 &&
      orphanProductPlanIds.length === 0 &&
      orphanReturnIds.length === 0 &&
      orphanDepartureIds.length === 0
    ) {
      return;
    }

    if (orphanEventMovements.length > 0) {
      const stockAdjustmentByProduct = orphanEventMovements.reduce<
        Map<string, number>
      >((adjustments, movement) => {
        const currentAdjustment = adjustments.get(movement.productId) ?? 0;
        const nextAdjustment =
          movement.type === "salida"
            ? currentAdjustment + movement.amount
            : currentAdjustment - movement.amount;

        adjustments.set(movement.productId, nextAdjustment);
        return adjustments;
      }, new Map());

      setStockMovements((currentMovements) =>
        currentMovements.filter(
          (movement) =>
            !movement.eventId || activeEventIds.has(movement.eventId),
        ),
      );
      setProducts((currentProducts) =>
        currentProducts.map((product) => {
          const adjustment = stockAdjustmentByProduct.get(product.id) ?? 0;

          if (adjustment === 0) {
            return product;
          }

          return {
            ...product,
            currentStock: roundAmount(
              Math.max(0, product.currentStock + adjustment),
            ),
          };
        }),
      );
    }

    if (orphanProductPlanIds.length > 0) {
      setEventProductPlanLog((currentLog) =>
        Object.fromEntries(
          Object.entries(currentLog).filter(([eventId]) =>
            activeEventIds.has(eventId),
          ),
        ),
      );
    }

    if (orphanReturnIds.length > 0) {
      setReturnLog((currentLog) =>
        Object.fromEntries(
          Object.entries(currentLog).filter(([eventId]) =>
            activeEventIds.has(eventId),
          ),
        ),
      );
    }

    if (orphanDepartureIds.length > 0) {
      setStockDepartureEventIds((currentEventIds) =>
        currentEventIds.filter((eventId) => activeEventIds.has(eventId)),
      );
    }
  }, [
    eventProductPlanLog,
    events,
    hasLoadedLocalState,
    returnLog,
    stockDepartureEventIds,
    stockMovements,
  ]);

  useEffect(() => {
    if (!hasLoadedLocalState) {
      return;
    }

    const stockByProductId = stockMovements.reduce<Map<string, number>>(
      (stockMap, movement) => {
        const currentStock = stockMap.get(movement.productId) ?? 0;
        const signedAmount =
          movement.type === "entrada" ? movement.amount : -movement.amount;

        stockMap.set(
          movement.productId,
          roundAmount(currentStock + signedAmount),
        );
        return stockMap;
      },
      new Map(),
    );
    const needsSync = products.some((product) => {
      const movementStock = roundAmount(
        Math.max(0, stockByProductId.get(product.id) ?? 0),
      );

      return product.currentStock !== movementStock;
    });

    if (!needsSync) {
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.map((product) => ({
        ...product,
        currentStock: roundAmount(
          Math.max(0, stockByProductId.get(product.id) ?? 0),
        ),
      })),
    );
  }, [hasLoadedLocalState, products, stockMovements]);

  useEffect(() => {
    if (!hasLoadedLocalState) {
      return;
    }

    const stateToPersist: PersistedCateringState = {
      activeSection,
      dataResetVersion: LOCAL_STORAGE_RESET_VERSION,
      eventProductPlanLog,
      events,
      products: products.map((p) => ({ id: p.id, currentStock: p.currentStock })),
      returnLog,
      selectedEventId,
      stockDepartureEventIds,
      stockMovements,
    };

    try {
      window.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(stateToPersist),
      );
    } catch {
      setSyncStatus("error");
    }

    const syncTimeoutId = window.setTimeout(async () => {
      try {
        setSyncStatus("saving");

        const response = await fetch(CATERING_STATE_API_PATH, {
          body: JSON.stringify({ state: stateToPersist }),
          headers: { "Content-Type": "application/json" },
          method: "PUT",
        });

        if (response.ok) {
          setSyncStatus("synced");
          return;
        }

        setSyncStatus(response.status === 503 ? "local" : "error");
      } catch {
        setSyncStatus("error");
      }
    }, 500);

    return () => window.clearTimeout(syncTimeoutId);
  }, [
    activeSection,
    eventProductPlanLog,
    events,
    hasLoadedLocalState,
    products,
    returnLog,
    selectedEventId,
    stockDepartureEventIds,
    stockMovements,
  ]);

  useEffect(() => {
    if (!hasLoadedLocalState) {
      return;
    }

    const expiredEvents = events.filter(
      (event) => event.status !== "finalizado" && isPastEventDate(event.date),
    );

    if (expiredEvents.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      expiredEvents.forEach((event) => registerEventStockDeparture(event));
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          expiredEvents.some((expiredEvent) => expiredEvent.id === event.id)
            ? { ...event, status: "finalizado" }
            : event,
        ),
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    eventProductPlanLog,
    events,
    hasLoadedLocalState,
    products,
    stockDepartureEventIds,
  ]);


  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && activeSection !== "dashboard") {
        setActiveSection("dashboard");
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeSection]);

  const upcomingEvents = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return events
      .filter((event) => {
        const eventDate = new Date(`${event.date}T12:00:00`);
        return event.status !== "finalizado" && eventDate >= startOfToday;
      })
      .sort((first, second) => first.date.localeCompare(second.date));
  }, [events]);

  const selectedEvent =
    useMemo(
      () =>
        events.find((event) => event.id === selectedEventId) ??
        upcomingEvents[0] ??
        events[0],
      [events, selectedEventId, upcomingEvents],
    );
  const nextEvent = upcomingEvents[0] ?? selectedEvent;
  const nextNeeds = useMemo(
    () =>
      nextEvent
        ? getEventOperationalNeeds(
            nextEvent,
            products,
            eventProductPlanLog[nextEvent.id],
          )
        : [],
    [eventProductPlanLog, nextEvent, products],
  );
  const nextPreparationTotal = nextNeeds.reduce(
    (total, need) => need.product.unit === "kg" ? total + need.missing : total,
    0,
  );
  const stockTotal = products.reduce(
    (total, product) =>
      !isDashboardStockProduct(product)
        ? total
        : total + product.currentStock,
    0,
  );
  const visibleProducts = useMemo(
    () => products,
    [products],
  );
  const fridgeProducts = useMemo(
    () => visibleProducts.filter((p) => p.category === "Carnes" || p.category === "Embutidos"),
    [visibleProducts],
  );
  const despensaProducts = useMemo(
    () => visibleProducts.filter((p) => p.category === "Despensa"),
    [visibleProducts],
  );
  const inventoryProducts = useMemo(
    () => visibleProducts.filter((p) => p.category === "Inventario"),
    [visibleProducts],
  );
  const selectedProduct = products.find(
    (product) => product.id === stockForm.productId,
  );

  function updateProductStock(productId: string, nextStock: number) {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId
          ? { ...product, currentStock: roundAmount(Math.max(0, nextStock)) }
          : product,
      ),
    );
  }

  function handleStockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rawValue = stockForm.value.trim();

    if (rawValue === "") {
      return;
    }

    const stockToAdd = parseAmountInput(rawValue);

    if (stockToAdd <= 0 || !stockForm.productId) {
      return;
    }

    adjustStock(
      stockForm.productId,
      stockToAdd,
      "Entrada de stock",
      stockForm.provider,
    );
    setStockFeedback({
      amount: stockToAdd,
      productName: selectedProduct?.name ?? "Producto",
      provider: stockForm.provider,
      unit: selectedProduct?.unit ?? "kg",
    });
    setStockForm((current) => ({ ...current, value: "" }));
  }

  function adjustStock(
    productId: string,
    delta: number,
    note = "Ajuste manual",
    provider?: string,
  ) {
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    const nextStock = roundAmount(Math.max(0, product.currentStock + delta));
    const actualDelta = roundAmount(nextStock - product.currentStock);

    if (actualDelta === 0) {
      return;
    }

    updateProductStock(productId, nextStock);
    setStockMovements((currentMovements) => [
      {
        id: `mov-${Date.now()}-${productId}`,
        productId,
        type: actualDelta > 0 ? "entrada" : "salida",
        amount: Math.abs(actualDelta),
        date: new Date().toISOString(),
        note,
        provider,
      },
      ...currentMovements,
    ]);
  }

  function setManualProductStock(productId: string, value: string) {
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    const nextStock = parseAmountInput(value);
    const delta = roundAmount(nextStock - product.currentStock);

    if (delta === 0) {
      return;
    }

    adjustStock(productId, delta, "Edición de stock manual");
  }

  function deleteStockMovement(movementId: string) {
    const movement = stockMovements.find((item) => item.id === movementId);

    if (!movement) {
      return;
    }

    const movementLabel = movement.type === "entrada" ? "entrada" : "salida";
    const product = products.find((item) => item.id === movement.productId);
    const movementUnit = product?.unit ?? "kg";
    const stockEffect =
      movement.type === "entrada"
        ? "Se descontará del stock actual."
        : "Se devolverá al stock actual.";
    const confirmed = window.confirm(
      `¿Eliminar esta ${movementLabel} de ${formatAmount(
        movement.amount,
        movementUnit,
      )}? ${stockEffect}`,
    );

    if (!confirmed) {
      return;
    }

    setStockMovements((currentMovements) =>
      currentMovements.filter((item) => item.id !== movementId),
    );
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === movement.productId
          ? {
              ...product,
              currentStock: roundAmount(
                Math.max(
                  0,
                  movement.type === "entrada"
                    ? product.currentStock - movement.amount
                    : product.currentStock + movement.amount,
                ),
              ),
            }
          : product,
      ),
    );
  }

  function registerEventStockDeparture(event: CateringEvent) {
    if (stockDepartureEventIds.includes(event.id)) {
      return;
    }

    const needsByProduct = new Map(
      getEventOperationalNeeds(
        event,
        products,
        eventProductPlanLog[event.id],
      ).map((need) => [need.product.id, need.total]),
    );
    const departures = products.map((product) => {
        const neededStock = needsByProduct.get(product.id) ?? 0;
        const deductedStock = roundAmount(
          Math.min(product.currentStock, neededStock),
        );

        return {
          amount: roundAmount(neededStock),
          deductedStock,
          productId: product.id,
        };
      })
      .filter((departure) => departure.amount > 0);

    setStockDepartureEventIds((currentEventIds) =>
      currentEventIds.includes(event.id)
        ? currentEventIds
        : [...currentEventIds, event.id],
    );

    if (departures.length === 0) {
      return;
    }

    const departureByProduct = new Map(
      departures.map((departure) => [
        departure.productId,
        departure.deductedStock,
      ]),
    );
    const movementDate = new Date().toISOString();
    const movementTimestamp = Date.now();

    setProducts((currentProducts) =>
      currentProducts.map((product) => {
        const deductedStock = departureByProduct.get(product.id) ?? 0;

        if (deductedStock <= 0) {
          return product;
        }

        return {
          ...product,
          currentStock: roundAmount(
            Math.max(0, product.currentStock - deductedStock),
          ),
        };
      }),
    );
    setStockMovements((currentMovements) => [
      ...departures.map((departure) => ({
        id: `mov-${movementTimestamp}-${event.id}-${departure.productId}`,
        productId: departure.productId,
        type: "salida" as const,
        amount: departure.amount,
        date: movementDate,
        eventDate: event.date,
        eventId: event.id,
        eventName: event.name,
        eventStatus: "finalizado" as const,
        note: `Evento: ${event.name}`,
        serviceType: event.serviceType,
      })),
      ...currentMovements,
    ]);
  }

  function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const people = Number(eventForm.people);
    const normalizedDate = normalizeEventDateInput(eventForm.date);
    const normalizedTime = normalizeEventTimeInput(eventForm.time);
    const kgPerPerson = parseAmountInput(eventForm.kgPerPerson);
    const defaultKgPerPerson = getDefaultKgPerPerson(eventForm.serviceType);

    if (!eventForm.name.trim() || !normalizedDate || people < 1) {
      return;
    }

    const newEvent: CateringEvent = {
      id: `evt-${Date.now()}`,
      manager: formatPersonName(eventForm.manager),
      name: eventForm.name.trim(),
      date: normalizedDate,
      ...(normalizedTime ? { time: normalizedTime } : {}),
      ...(eventForm.location.trim() ? { location: eventForm.location.trim() } : {}),
      ...(eventForm.locationLat !== null ? { locationLat: eventForm.locationLat } : {}),
      ...(eventForm.locationLng !== null ? { locationLng: eventForm.locationLng } : {}),
      notes: eventForm.notes.trim(),
      people: Math.round(people),
      status: eventForm.status,
      serviceType: eventForm.serviceType,
      ...(kgPerPerson > 0 && kgPerPerson !== defaultKgPerPerson
        ? { kgPerPerson }
        : {}),
    };

    setEvents((currentEvents) =>
      [...currentEvents, newEvent].sort((first, second) =>
        first.date.localeCompare(second.date),
      ),
    );
    if (newEvent.status === "finalizado") {
      registerEventStockDeparture(newEvent);
    }

    setSelectedEventId(newEvent.id);
    setActiveSection("eventos");
    setEventForm({
      name: "",
      date: formatDateForForm(normalizedDate),
      time: "",
      location: "",
      locationLat: null,
      locationLng: null,
      manager: "",
      notes: "",
      people: "60",
      kgPerPerson: "",
      status: "pendiente",
      serviceType: eventForm.serviceType,
    });
  }

  function updateEventStatus(eventId: string, status: EventStatus) {
    const eventToUpdate = events.find((event) => event.id === eventId);

    if (
      eventToUpdate &&
      eventToUpdate.status !== "finalizado" &&
      status === "finalizado"
    ) {
      registerEventStockDeparture(eventToUpdate);
    }

    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === eventId ? { ...event, status } : event,
      ),
    );
  }

  function updateEvent(eventId: string, form: EventForm) {
    const people = Number(form.people);
    const normalizedDate = normalizeEventDateInput(form.date);
    const normalizedTime = normalizeEventTimeInput(form.time);
    const kgPerPerson = parseAmountInput(form.kgPerPerson);
    const defaultKgPerPerson = getDefaultKgPerPerson(form.serviceType);

    if (!form.name.trim() || !normalizedDate || people < 1) {
      return;
    }

    const previousEvent = events.find((event) => event.id === eventId);
    const updatedEvent = previousEvent
      ? {
          ...previousEvent,
          manager: formatPersonName(form.manager),
          name: form.name.trim(),
          date: normalizedDate,
          ...(normalizedTime ? { time: normalizedTime } : { time: undefined }),
          ...(form.location.trim()
            ? { location: form.location.trim() }
            : { location: undefined }),
          ...(form.locationLat !== null && form.location.trim()
            ? { locationLat: form.locationLat }
            : { locationLat: undefined }),
          ...(form.locationLng !== null && form.location.trim()
            ? { locationLng: form.locationLng }
            : { locationLng: undefined }),
          notes: form.notes.trim(),
          people: Math.round(people),
          status: form.status,
          serviceType: form.serviceType,
          ...(kgPerPerson > 0 && kgPerPerson !== defaultKgPerPerson
            ? { kgPerPerson }
            : { kgPerPerson: undefined }),
        }
      : null;

    if (
      previousEvent &&
      updatedEvent &&
      previousEvent.status !== "finalizado" &&
      updatedEvent.status === "finalizado"
    ) {
      registerEventStockDeparture(updatedEvent);
    }

    setEvents((currentEvents) =>
      currentEvents
        .map((event) =>
          event.id === eventId
            ? {
                ...event,
                manager: formatPersonName(form.manager),
                name: form.name.trim(),
                date: normalizedDate,
                ...(normalizedTime
                  ? { time: normalizedTime }
                  : { time: undefined }),
                ...(form.location.trim()
                  ? { location: form.location.trim() }
                  : { location: undefined }),
                ...(form.locationLat !== null && form.location.trim()
                  ? { locationLat: form.locationLat }
                  : { locationLat: undefined }),
                ...(form.locationLng !== null && form.location.trim()
                  ? { locationLng: form.locationLng }
                  : { locationLng: undefined }),
                notes: form.notes.trim(),
                people: Math.round(people),
                status: form.status,
                serviceType: form.serviceType,
                ...(kgPerPerson > 0 && kgPerPerson !== defaultKgPerPerson
                  ? { kgPerPerson }
                  : { kgPerPerson: undefined }),
              }
            : event,
        )
        .sort((first, second) => first.date.localeCompare(second.date)),
    );
  }

  function updateEventKgPerPerson(eventId: string, value: number | undefined) {
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === eventId
          ? { ...event, kgPerPerson: value }
          : event,
      ),
    );
  }

  function updateEventKgPerPersonBySource(
    eventId: string,
    source: string,
    value: number | undefined,
  ) {
    setEvents((currentEvents) =>
      currentEvents.map((event) => {
        if (event.id !== eventId) return event;
        const next = { ...event.kgPerPersonBySource };
        if (value != null) {
          next[source] = value;
        } else {
          delete next[source];
        }
        return { ...event, kgPerPersonBySource: next };
      }),
    );
  }

  function deleteEvent(eventId: string) {
    const remainingEvents = events.filter((event) => event.id !== eventId);
    const eventMovements = stockMovements.filter(
      (movement) => movement.eventId === eventId,
    );
    const stockAdjustmentByProduct = eventMovements.reduce<Map<string, number>>(
      (adjustments, movement) => {
        const currentAdjustment = adjustments.get(movement.productId) ?? 0;
        const nextAdjustment =
          movement.type === "salida"
            ? currentAdjustment + movement.amount
            : currentAdjustment - movement.amount;

        adjustments.set(movement.productId, nextAdjustment);
        return adjustments;
      },
      new Map(),
    );

    setEvents(remainingEvents);
    setEventProductPlanLog((currentLog) => {
      const nextLog = { ...currentLog };
      delete nextLog[eventId];
      return nextLog;
    });
    setReturnLog((currentLog) => {
      const nextLog = { ...currentLog };
      delete nextLog[eventId];
      return nextLog;
    });
    setStockDepartureEventIds((currentEventIds) =>
      currentEventIds.filter((currentEventId) => currentEventId !== eventId),
    );
    setStockMovements((currentMovements) =>
      currentMovements.filter((movement) => movement.eventId !== eventId),
    );

    if (stockAdjustmentByProduct.size > 0) {
      setProducts((currentProducts) =>
        currentProducts.map((product) => {
          const adjustment = stockAdjustmentByProduct.get(product.id) ?? 0;

          if (adjustment === 0) {
            return product;
          }

          return {
            ...product,
            currentStock: roundAmount(
              Math.max(0, product.currentStock + adjustment),
            ),
          };
        }),
      );
    }

    if (selectedEvent?.id === eventId || selectedEventId === eventId) {
      setSelectedEventId(remainingEvents[0]?.id ?? "");
    }
  }

  function updateReturnEntry(
    event: CateringEvent,
    need: EventNeed,
    field: "consumed" | "returned",
    value: string,
  ) {
    const numericValue =
      field === "returned"
        ? Math.min(parseAmountInput(value), need.total)
        : parseAmountInput(value);
    const eventId = event.id;
    const previousReturned = getStoredReturnEntry(
      eventId,
      need.product.id,
      returnLog,
    ).returned;

    setReturnLog((currentLog) => {
      const eventLog = currentLog[eventId] ?? {};
      const previous = getStoredReturnEntry(eventId, need.product.id, currentLog);

      return {
        ...currentLog,
        [eventId]: {
          ...eventLog,
          [need.product.id]: {
            ...previous,
            [field]: numericValue,
          },
        },
      };
    });

    if (field === "returned") {
      registerEventReturnedStock({
        event,
        nextReturned: numericValue,
        previousReturned,
        productId: need.product.id,
      });
    }
  }

  function updateEventProductPlan(
    event: CateringEvent,
    need: EventNeed,
    value: string,
  ) {
    const numericValue = parseAmountInput(value);
    const eventId = event.id;
    const previousReturned = getStoredReturnEntry(
      eventId,
      need.product.id,
      returnLog,
    ).returned;
    const nextReturned = Math.min(previousReturned, numericValue);

    setEventProductPlanLog((currentLog) => ({
      ...currentLog,
      [eventId]: {
        ...(currentLog[eventId] ?? {}),
        [need.product.id]: {
          total: numericValue,
        },
      },
    }));

    setReturnLog((currentLog) => {
      const eventLog = currentLog[eventId] ?? {};
      const previous = getStoredReturnEntry(eventId, need.product.id, currentLog);
      const nextConsumed = Math.max(0, numericValue - nextReturned);

      return {
        ...currentLog,
        [eventId]: {
          ...eventLog,
          [need.product.id]: {
            consumed: clampAmount(nextConsumed),
            returned: clampAmount(nextReturned),
          },
        },
      };
    });

    if (nextReturned !== previousReturned) {
      registerEventReturnedStock({
        event,
        nextReturned,
        previousReturned,
        productId: need.product.id,
      });
    }
  }

  function addProductToEvent(eventId: string, productId: string) {
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    setEventProductPlanLog((currentLog) => {
      const eventLog = currentLog[eventId] ?? {};

      if (eventLog[productId]) {
        return currentLog;
      }

      return {
        ...currentLog,
        [eventId]: {
          ...eventLog,
          [productId]: {
            removed: false,
            total: 0.5,
          },
        },
      };
    });
  }

  function saveEventOperationalDraft(
    event: CateringEvent,
    productPlan: EventProductPlanLog[string],
    returnEntries: EventReturnLog[string],
    needs: EventNeed[],
  ) {
    const needsByProductId = new Map(
      needs.map((need) => [need.product.id, need]),
    );
    const productIdsToSync = new Set([
      ...needs.map((need) => need.product.id),
      ...Object.keys(productPlan),
      ...Object.keys(returnEntries),
      ...Object.keys(returnLog[event.id] ?? {}),
    ]);

    setEventProductPlanLog((currentLog) => ({
      ...currentLog,
      [event.id]: productPlan,
    }));
    setReturnLog((currentLog) => {
      const eventLog = currentLog[event.id] ?? {};
      const nextEventLog = Array.from(productIdsToSync).reduce<
        EventReturnLog[string]
      >((entries, productId) => {
        const plannedTotal =
          needsByProductId.get(productId)?.total ??
          productPlan[productId]?.total ??
          0;
        const returned = Math.min(
          getDraftReturnEntry(productId, returnEntries).returned,
          plannedTotal,
        );

        entries[productId] = {
          consumed: clampAmount(Math.max(plannedTotal - returned, 0)),
          returned: clampAmount(returned),
        };

        return entries;
      }, { ...eventLog });

      return {
        ...currentLog,
        [event.id]: nextEventLog,
      };
    });

    productIdsToSync.forEach((productId) => {
      const plannedTotal =
        needsByProductId.get(productId)?.total ??
        productPlan[productId]?.total ??
        0;
      const previousReturned = getStoredReturnEntry(
        event.id,
        productId,
        returnLog,
      ).returned;
      const nextReturned = Math.min(
        getDraftReturnEntry(productId, returnEntries).returned,
        plannedTotal,
      );

      if (nextReturned !== previousReturned) {
        registerEventReturnedStock({
          event,
          nextReturned,
          previousReturned,
          productId,
        });
      }
    });
  }

  function registerEventReturnedStock({
    event,
    nextReturned,
    previousReturned,
    productId,
  }: ReturnStockMovementContext) {
    const delta = clampAmount(nextReturned - previousReturned);

    if (delta !== 0) {
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === productId
            ? {
                ...product,
                currentStock: clampAmount(
                  Math.max(0, product.currentStock + delta),
                ),
              }
            : product,
        ),
      );
    }

    const movementId = getReturnMovementId(event.id, productId);

    setStockMovements((currentMovements) => {
      const movementDate = new Date().toISOString();
      const existingMovement = currentMovements.find(
        (movement) => movement.id === movementId,
      );

      if (nextReturned <= 0) {
        return currentMovements.filter((movement) => movement.id !== movementId);
      }

      if (existingMovement) {
        return currentMovements.map((movement) =>
          movement.id === movementId
            ? {
                ...movement,
                amount: nextReturned,
                date: movementDate,
                eventDate: event.date,
                eventName: event.name,
                eventStatus: event.status,
                note: `Retorno evento: ${event.name}`,
                serviceType: event.serviceType,
              }
            : movement,
        );
      }

      return [
        {
          id: movementId,
          amount: nextReturned,
          date: movementDate,
          eventDate: event.date,
          eventId: event.id,
          eventName: event.name,
          eventStatus: event.status,
          note: `Retorno evento: ${event.name}`,
          productId,
          serviceType: event.serviceType,
          type: "entrada" as const,
        },
        ...currentMovements,
      ];
    });
  }


  return {
    activeSection,
    addProductToEvent,
    deleteEvent,
    deleteStockMovement,
    despensaProducts,
    eventForm,
    eventProductPlanLog,
    events,
    fridgeProducts,
    handleCreateEvent,
    handleStockSubmit,
    inventoryProducts,
    nextEvent,
    nextPreparationTotal,
    returnLog,
    saveEventOperationalDraft,
    selectedEvent,
    selectedEventId,
    setActiveSection,
    setEventForm,
    setManualProductStock,
    setSelectedEventId,
    setStockFeedback,
    setStockForm,
    stockFeedback,
    stockForm,
    stockMovements,
    stockTotal,
    syncStatus,
    updateEvent,
    updateEventKgPerPerson,
    updateEventKgPerPersonBySource,
    updateEventProductPlan,
    updateEventStatus,
    updateReturnEntry,
    upcomingEvents,
    visibleProducts,
  };
}
