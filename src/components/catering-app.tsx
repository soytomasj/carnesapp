"use client";

import Image from "next/image";
import { Fragment, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  ChefHat,
  ClipboardList,
  ExternalLink,
  Flame,
  Gauge,
  Link2,
  MapPin,
  Menu,
  Minus,
  PackageCheck,
  PackagePlus,
  Pencil,
  Plus,
  Refrigerator,
  Save,
  Scale,
  SearchCheck,
  ShoppingCart,
  Trash2,
  Truck,
  Utensils,
  Users,
  X,
} from "lucide-react";
import {
  type CateringEvent,
  type EventReturnLog,
  type EventServiceType,
  type EventStatus,
  type Product,
  type ProductUnit,
  type ReturnEntry,
  mockProducts,
  recipeConfigs,
} from "@/lib/catering-data";
import {
  calculateEventNeeds,
  formatAmount,
  formatEventDate,
  getDefaultKgPerPerson,
  roundAmount,
  type EventNeed,
} from "@/lib/catering-calculations";
import dynamic from "next/dynamic";
import type { LocationResult } from "./location-picker";
import type {
  EventAgendaFilter,
  EventForm,
  EventProductPlanEntry,
  EventProductPlanLog,
  PersistedCateringState,
  ReturnStockMovementContext,
  Section,
  StockFeedback,
  StockForm,
  StockMovement,
  StockProductGroup,
  StockReservationEntry,
  SyncStatus,
} from "@/lib/catering-types";
import {
  editableEventStatuses,
  eventAgendaFilters,
  eventStatusCopy,
  eventStatusStyles,
  inventarioProductGroups,
  isDashboardStockProduct,
  pantryProductGroups,
  sections,
  serviceTypeCopy,
  stockProviders,
} from "@/lib/catering-app-constants";
import {
  isCurrentPersistedState,
  isEventServiceType,
  isEventStatus,
  isRecord,
  normalizeEventProductPlanLog,
  normalizeEvents,
  normalizeProducts,
  normalizeReturnLog,
  normalizeStockMovements,
  normalizeStringList,
  useBodyScrollLock,
} from "@/lib/catering-normalize";
import {
  areJsonEqual,
  clampAmount,
  formatAmountInputValue,
  formatDateForForm,
  formatShare,
  formatStockMovementDate,
  getCalendarDays,
  getCalendarMonthDate,
  isPastEventDate,
  normalizeAmountDraft,
  normalizeEventDateInput,
  normalizeEventTimeInput,
  normalizeOperationalAmountDraft,
  parseAmountInput,
} from "@/lib/form-utils";
import {
  formatEventNameDisplay,
  formatPersonName,
  formatStockMovementNote,
  getMovementEventInfo,
  getProductVisual,
  getStockBadge,
  groupStockProducts,
} from "@/lib/stock-utils";
import {
  buildDefaultEventProductPlan,
  exportEventToCalendar,
  getDraftReturnEntry,
  getEventNeedsWhatsappUrl,
  getEventOperationalNeeds,
  getReturnMovementId,
  getStoredReturnEntry,
} from "@/lib/event-utils";
import {
  DateField,
  EmptyState,
  EventStatusBadge,
  Field,
  HeaderBlock,
  Panel,
  SectionTitle,
  StatCard,
  TimeField,
} from "@/components/ui/primitives";
import { MobileNav, Sidebar } from "@/components/nav";
import { DashboardSection } from "@/components/dashboard-section";

const LocationPicker = dynamic(() => import("./location-picker"), { ssr: false });

const CATERING_STATE_API_PATH = "/api/catering-state";
const LEGACY_LOCAL_STORAGE_PREFIX = "brasas-prime-catering-state";
const LOCAL_STORAGE_KEY = "koke-al-asador-catering-state-v1";
const LOCAL_STORAGE_RESET_KEY = "koke-al-asador-catering-reset-version";
const LOCAL_STORAGE_RESET_VERSION = "empty-stock-events-2026-05-20";

export default function CateringApp() {
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

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-zinc-950">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,245,247,0.78)_38%,rgba(229,231,235,0.72)_100%)]" />
      <div className="relative mx-auto flex w-full max-w-[1500px] flex-col md:block">
        <Sidebar
          activeSection={activeSection}
          onChange={setActiveSection}
          syncStatus={syncStatus}
        />
        <MobileNav
          activeSection={activeSection}
          onChange={setActiveSection}
          syncStatus={syncStatus}
        />

        <div
          key={activeSection}
          className="app-section-enter relative z-0 min-w-0 px-4 py-4 pb-safe-nav sm:px-6 md:ml-[280px] md:px-8 md:py-8 md:pb-8"
        >
          {activeSection === "dashboard" && (
            <DashboardSection
              eventsCount={upcomingEvents.length}
              nextEvent={nextEvent}
              nextPreparationTotal={nextPreparationTotal}
              stockTotal={stockTotal}
            />
          )}

          {activeSection === "frigorifico" && (
            <FridgeSection
              eventProductPlanLog={eventProductPlanLog}
              events={events}
              eyebrow="Frigorífico"
              onDeleteStockMovement={deleteStockMovement}
              onSetManualProductStock={setManualProductStock}
              onStockFeedbackDone={() => setStockFeedback(null)}
              onStockFormChange={setStockForm}
              onStockSubmit={handleStockSubmit}
              products={fridgeProducts}
              returnLog={returnLog}
              selectedProduct={fridgeProducts.find(
                (product) => product.id === selectedProduct?.id,
              )}
              showProvider
              stockFeedback={stockFeedback}
              stockMovements={stockMovements}
              stockForm={stockForm}
              stockIcon={Refrigerator}
              stockTitle="Stock del frigorífico"
              subtitle="Carnes y embutidos, todo en kg."
              title="Stock actual del frigorífico"
            />
          )}

          {activeSection === "despensa" && (
            <FridgeSection
              eventProductPlanLog={eventProductPlanLog}
              events={events}
              eyebrow="Despensa"
              onDeleteStockMovement={deleteStockMovement}
              onSetManualProductStock={setManualProductStock}
              onStockFeedbackDone={() => setStockFeedback(null)}
              onStockFormChange={setStockForm}
              onStockSubmit={handleStockSubmit}
              productGroups={pantryProductGroups}
              products={despensaProducts}
              returnLog={returnLog}
              selectedProduct={despensaProducts.find(
                (product) => product.id === selectedProduct?.id,
              )}
              stockFeedback={stockFeedback}
              stockMovements={stockMovements}
              stockForm={stockForm}
              stockIcon={Utensils}
              stockTitle="Stock de despensa"
              subtitle="Alimentos, descartables y preparación del servicio en un solo control."
              title="Despensa"
            />
          )}

          {activeSection === "inventario" && (
            <FridgeSection
              eventProductPlanLog={eventProductPlanLog}
              events={events}
              eyebrow="Inventario"
              onDeleteStockMovement={deleteStockMovement}
              onSetManualProductStock={setManualProductStock}
              onStockFeedbackDone={() => setStockFeedback(null)}
              onStockFormChange={setStockForm}
              onStockSubmit={handleStockSubmit}
              productGroups={inventarioProductGroups}
              products={inventoryProducts}
              returnLog={returnLog}
              selectedProduct={inventoryProducts.find(
                (product) => product.id === selectedProduct?.id,
              )}
              stockFeedback={stockFeedback}
              stockMovements={stockMovements}
              stockForm={stockForm}
              stockIcon={ClipboardList}
              stockTitle="Inventario operativo"
              subtitle="Parrillas, utensilios, herramientas y equipos: qué hay, qué está reservado y qué falta."
              title="Inventario de equipos"
            />
          )}

          {activeSection === "eventos" && (
            <EventsSection
              eventProductPlanLog={eventProductPlanLog}
              eventForm={eventForm}
              events={events}
              onAddProductToEvent={addProductToEvent}
              onCreateEvent={handleCreateEvent}
              onDeleteEvent={deleteEvent}
              onEventFormChange={setEventForm}
              onSelectEvent={setSelectedEventId}
              onSaveEventOperationalDraft={saveEventOperationalDraft}
              onUpdateEventProductPlan={updateEventProductPlan}
              onUpdateReturnEntry={updateReturnEntry}
              onStatusChange={updateEventStatus}
              onUpdateEvent={updateEvent}
              onUpdateEventKgPerPerson={updateEventKgPerPerson}
              products={visibleProducts}
              returnLog={returnLog}
              selectedEvent={selectedEvent}
              selectedEventId={selectedEvent?.id ?? ""}
            />
          )}
        </div>
      </div>
    </main>
  );
}


function FridgeSection({
  eyebrow,
  eventProductPlanLog,
  events,
  onDeleteStockMovement,
  onSetManualProductStock,
  onStockFeedbackDone,
  onStockFormChange,
  onStockSubmit,
  productGroups,
  products,
  returnLog,
  selectedProduct,
  stockFeedback,
  stockMovements,
  stockForm,
  showProvider = false,
  stockIcon,
  stockTitle,
  subtitle,
  title,
}: {
  eyebrow: string;
  eventProductPlanLog: EventProductPlanLog;
  events: CateringEvent[];
  onDeleteStockMovement: (movementId: string) => void;
  onSetManualProductStock: (productId: string, value: string) => void;
  onStockFeedbackDone: () => void;
  onStockFormChange: (form: StockForm) => void;
  onStockSubmit: (event: FormEvent<HTMLFormElement>) => void;
  productGroups?: StockProductGroup[];
  products: Product[];
  returnLog: EventReturnLog;
  selectedProduct?: Product;
  stockFeedback: StockFeedback;
  stockMovements: StockMovement[];
  stockForm: StockForm;
  showProvider?: boolean;
  stockIcon: typeof Gauge;
  stockTitle: string;
  subtitle: string;
  title: string;
}) {
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [isChoosingProduct, setIsChoosingProduct] = useState(false);
  const [isChoosingProvider, setIsChoosingProvider] = useState(false);
  const productPickerRef = useRef<HTMLDivElement>(null);
  const providerPickerRef = useRef<HTMLDivElement>(null);
  const detailProduct = products.find((product) => product.id === detailProductId);
  const selectedProductVisual = selectedProduct
    ? getProductVisual(selectedProduct)
    : null;
  const stockFormStep = selectedProduct?.unit === "un" ? 1 : 0.5;
  const groupedProducts = useMemo(
    () => groupStockProducts(products, productGroups),
    [productGroups, products],
  );

  useBodyScrollLock(Boolean(detailProduct));

  useEffect(() => {
    if (!stockFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(onStockFeedbackDone, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [onStockFeedbackDone, stockFeedback]);

  useEffect(() => {
    if (
      products.length > 0 &&
      !products.some((product) => product.id === stockForm.productId)
    ) {
      onStockFormChange({
        ...stockForm,
        productId: products[0].id,
        value: "",
      });
    }
  }, [onStockFormChange, products, stockForm]);

  useEffect(() => {
    if (!detailProductId) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setDetailProductId(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);

    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [detailProductId]);

  useEffect(() => {
    if (!isChoosingProduct) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        productPickerRef.current &&
        !productPickerRef.current.contains(event.target as Node)
      ) {
        setIsChoosingProduct(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsChoosingProduct(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isChoosingProduct]);

  useEffect(() => {
    if (!isChoosingProvider) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        providerPickerRef.current &&
        !providerPickerRef.current.contains(event.target as Node)
      ) {
        setIsChoosingProvider(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsChoosingProvider(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isChoosingProvider]);

  function updateStockFormQuantity(delta: number) {
    const baseValue = parseAmountInput(stockForm.value);
    const nextValue = roundAmount(Math.max(0, baseValue + delta));

    onStockFormChange({
      ...stockForm,
      value: nextValue > 0 ? nextValue.toString().replace(".", ",") : "",
    });
  }

  const reservedEntriesByProduct = useMemo(() => {
    return events
      .filter((event) => event.status !== "finalizado")
      .flatMap((event) =>
        getEventOperationalNeeds(
          event,
          products,
          eventProductPlanLog[event.id],
        )
          .map((need) => {
            const returned = getStoredReturnEntry(
              event.id,
              need.product.id,
              returnLog,
            ).returned;
            const reservedAmount = clampAmount(
              Math.max(need.total - returned, 0),
            );

            if (reservedAmount <= 0) {
              return null;
            }

            return {
              amount: reservedAmount,
              eventDate: event.date,
              eventId: event.id,
              eventName: event.name,
              eventStatus: event.status,
              productId: need.product.id,
              serviceType: event.serviceType,
            };
          })
          .filter(
            (entry): entry is StockReservationEntry => entry !== null,
          ),
      )
      .reduce<Record<string, StockReservationEntry[]>>((reservedEntries, entry) => {
        reservedEntries[entry.productId] = [
          ...(reservedEntries[entry.productId] ?? []),
          entry,
        ].sort((first, second) =>
          first.eventDate.localeCompare(second.eventDate),
        );

        return reservedEntries;
      }, {});
  }, [eventProductPlanLog, events, products, returnLog]);
  const reservedStockByProduct = useMemo(() => {
    return Object.entries(reservedEntriesByProduct).reduce<Record<string, number>>(
      (reservedStock, [productId, entries]) => {
        reservedStock[productId] = roundAmount(
          entries.reduce((total, entry) => total + entry.amount, 0),
        );

        return reservedStock;
      },
      {},
    );
  }, [reservedEntriesByProduct]);

  return (
    <div className="space-y-6">
      <HeaderBlock
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
      />

      <Panel className="relative z-20">
        <div className="mb-4 flex items-center gap-3 border-b border-zinc-100 pb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-zinc-100 text-zinc-800">
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-zinc-950">Agregar stock</h2>
        </div>
        <form
          onSubmit={onStockSubmit}
          className="grid items-end gap-3 lg:grid-cols-[minmax(240px,1.05fr)_minmax(180px,0.65fr)_44px_44px_minmax(220px,0.9fr)_max-content]"
        >
          <div ref={productPickerRef} className="relative h-[72px] space-y-2">
            <span className="text-xs font-semibold uppercase text-zinc-500">
              Producto
            </span>
            <button
              type="button"
              onClick={() =>
                setIsChoosingProduct((currentValue) => !currentValue)
              }
              className="flex h-11 w-full items-center justify-between gap-3 rounded-[8px] border border-zinc-200 bg-white px-3 text-left text-sm font-semibold text-zinc-950 outline-none transition hover:border-zinc-400 focus:border-zinc-500"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-zinc-100 text-[#8f2f2b]">
                  {selectedProduct && selectedProductVisual ? (
                    selectedProductVisual.type === "image" ? (
                      <Image
                        src={selectedProductVisual.src}
                        alt={selectedProductVisual.alt}
                        width={22}
                        height={22}
                        className="h-5.5 w-5.5 object-contain"
                      />
                    ) : (
                      <selectedProductVisual.Icon
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    )
                  ) : (
                    <PackagePlus className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span className="truncate">
                  {selectedProduct ? selectedProduct.name : "Seleccionar producto"}
                </span>
              </span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 text-zinc-400 transition ${
                  isChoosingProduct ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              />
            </button>
            {isChoosingProduct && (
              <div className="app-popover absolute left-0 top-[calc(100%+0.375rem)] z-50 max-h-[240px] w-full overflow-y-auto rounded-[8px] border border-zinc-200 bg-white shadow-[0_18px_44px_rgba(39,39,42,0.14)]">
                {products.map((product) => {
                  const visual = getProductVisual(product);
                  const isSelected = product.id === stockForm.productId;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        onStockFormChange({
                          ...stockForm,
                          productId: product.id,
                          value: "",
                        });
                        setIsChoosingProduct(false);
                      }}
                      className={`flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-2.5 text-left text-sm font-semibold transition last:border-b-0 ${
                        isSelected
                          ? "bg-zinc-50 text-zinc-950"
                          : "text-zinc-800 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-zinc-100 text-[#8f2f2b]">
                        {visual.type === "image" ? (
                          <Image
                            src={visual.src}
                            alt={visual.alt}
                            width={22}
                            height={22}
                            className="h-5.5 w-5.5 object-contain"
                          />
                        ) : (
                          <visual.Icon className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{product.name}</span>
                      {isSelected && (
                        <Check
                          className="h-4 w-4 text-zinc-500"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <label className="h-[72px] space-y-2">
            <span className="text-xs font-semibold uppercase text-zinc-500">
              Cantidad a sumar {selectedProduct ? `(${selectedProduct.unit})` : ""}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={stockForm.value}
              onChange={(event) =>
                onStockFormChange({
                  ...stockForm,
                  value: normalizeAmountDraft(event.target.value),
                })
              }
              placeholder="0"
              className="h-11 w-full rounded-[8px] border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500"
            />
          </label>

          <button
            type="button"
            onClick={() => updateStockFormQuantity(stockFormStep)}
            className="mb-1.5 flex h-11 items-center justify-center rounded-[8px] border border-zinc-200 bg-white px-3 text-zinc-700 transition hover:border-zinc-400"
            aria-label={`Sumar ${formatAmount(stockFormStep, selectedProduct?.unit ?? "kg")} a la cantidad`}
            title="Sumar"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => updateStockFormQuantity(-stockFormStep)}
            className="mb-1.5 flex h-11 items-center justify-center rounded-[8px] border border-zinc-200 bg-white px-3 text-zinc-700 transition hover:border-zinc-400"
            aria-label={`Restar ${formatAmount(stockFormStep, selectedProduct?.unit ?? "kg")} a la cantidad`}
            title="Restar"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>

          {showProvider && (
          <div ref={providerPickerRef} className="relative h-[72px] space-y-2">
            <span className="text-xs font-semibold uppercase text-zinc-500">
              Proveedor
            </span>
            <button
              type="button"
              onClick={() =>
                setIsChoosingProvider((currentValue) => !currentValue)
              }
              className="flex h-11 w-full items-center justify-between gap-3 rounded-[8px] border border-zinc-200 bg-white px-3 text-left text-sm font-semibold text-zinc-950 outline-none transition hover:border-zinc-400 focus:border-zinc-500"
            >
              <span className="min-w-0 truncate">
                {stockForm.provider || "Seleccionar proveedor"}
              </span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 text-zinc-400 transition ${
                  isChoosingProvider ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              />
            </button>
            {isChoosingProvider && (
              <div className="app-popover absolute left-0 top-[calc(100%+0.375rem)] z-50 max-h-[240px] w-full overflow-y-auto rounded-[8px] border border-zinc-200 bg-white shadow-[0_18px_44px_rgba(39,39,42,0.14)]">
                {stockProviders.map((provider) => {
                  const isSelected = provider === stockForm.provider;

                  return (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => {
                        onStockFormChange({
                          ...stockForm,
                          provider,
                        });
                        setIsChoosingProvider(false);
                      }}
                      className={`flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-2.5 text-left text-sm font-semibold transition last:border-b-0 ${
                        isSelected
                          ? "bg-zinc-50 text-zinc-950"
                          : "text-zinc-800 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{provider}</span>
                      {isSelected && (
                        <Check
                          className="h-4 w-4 text-zinc-500"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          )}

          <button
            type="submit"
            className={`mb-1.5 inline-flex h-11 min-w-[168px] items-center justify-center gap-2 whitespace-nowrap rounded-[8px] px-4 text-sm font-semibold shadow-[0_14px_26px_rgba(39,39,42,0.18)] transition ${
              stockFeedback
                ? "bg-emerald-700 text-white hover:bg-emerald-700"
                : "bg-zinc-950 text-white hover:bg-zinc-800"
            }`}
          >
            {stockFeedback ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {stockFeedback ? "Agregado" : "Sumar al stock"}
          </button>
        </form>
        {stockFeedback && (
          <div className="app-feedback-toast absolute right-6 top-6 z-30 rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 shadow-[0_14px_34px_rgba(16,185,129,0.18)]">
            {formatAmount(stockFeedback.amount, stockFeedback.unit)} de{" "}
            {stockFeedback.productName} agregado
            {stockFeedback.provider ? ` · Proveedor: ${stockFeedback.provider}` : ""}
          </div>
        )}
      </Panel>

      <Panel className="relative z-0">
        <SectionTitle
          icon={stockIcon}
          title={stockTitle}
          subtitle={`${products.length} productos activos`}
        />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase text-zinc-500">
                <th className="border-b border-zinc-200 pb-3">Producto</th>
                <th className="w-28 border-b border-zinc-200 pb-3 pr-6 text-center">
                  Categoría
                </th>
                <th className="w-24 border-b border-zinc-200 pb-3 text-center">
                  Stock
                </th>
                <th className="w-24 border-b border-zinc-200 pb-3 text-center">
                  Reservado
                </th>
                <th className="w-24 border-b border-zinc-200 pb-3 text-center">
                  Disponible
                </th>
                <th className="w-24 border-b border-zinc-200 pb-3 text-center">
                  Falta
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const hasMultipleGroups = groupedProducts.length > 1;
                return groupedProducts.map((group) => {
                const GroupIcon = group.icon;

                return (
                  <Fragment key={group.id}>
                    {hasMultipleGroups && (
                      <tr>
                        <td colSpan={6} className="bg-zinc-50 px-3 py-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                              <GroupIcon
                                className="h-4 w-4 text-zinc-500"
                                aria-hidden="true"
                              />
                              <p className="text-xs font-bold uppercase text-zinc-700">
                                {group.label}
                              </p>
                            </div>
                            <p className="text-xs font-medium text-zinc-500">
                              {group.description}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {group.products.map((product) => (
                      <StockTableRow
                        key={product.id}
                        categoryLabel={
                          hasMultipleGroups ? group.label : product.category
                        }
                        onOpen={() => setDetailProductId(product.id)}
                        product={product}
                        reservedStock={reservedStockByProduct[product.id] ?? 0}
                      />
                    ))}
                  </Fragment>
                );
              });
              })()}
            </tbody>
          </table>
        </div>
      </Panel>

      {detailProduct && (
        <StockDetailModal
          events={events}
          movements={stockMovements.filter(
            (movement) => movement.productId === detailProduct.id,
          )}
          onDeleteStockMovement={onDeleteStockMovement}
          onClose={() => setDetailProductId(null)}
          onSetManualProductStock={onSetManualProductStock}
          product={detailProduct}
          reservedEntries={reservedEntriesByProduct[detailProduct.id] ?? []}
          reservedStock={reservedStockByProduct[detailProduct.id] ?? 0}
        />
      )}
    </div>
  );
}

function EventsSection({
  eventProductPlanLog,
  eventForm,
  events,
  onAddProductToEvent,
  onCreateEvent,
  onDeleteEvent,
  onEventFormChange,
  onSaveEventOperationalDraft,
  onSelectEvent,
  onStatusChange,
  onUpdateEventProductPlan,
  onUpdateReturnEntry,
  onUpdateEvent,
  onUpdateEventKgPerPerson,
  products,
  returnLog,
  selectedEvent,
  selectedEventId,
}: {
  eventProductPlanLog: EventProductPlanLog;
  eventForm: EventForm;
  events: CateringEvent[];
  onAddProductToEvent: (eventId: string, productId: string) => void;
  onCreateEvent: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteEvent: (eventId: string) => void;
  onEventFormChange: (form: EventForm) => void;
  onSaveEventOperationalDraft: (
    event: CateringEvent,
    productPlan: EventProductPlanLog[string],
    returnEntries: EventReturnLog[string],
    needs: EventNeed[],
  ) => void;
  onSelectEvent: (eventId: string) => void;
  onStatusChange: (eventId: string, status: EventStatus) => void;
  onUpdateEventProductPlan: (
    event: CateringEvent,
    need: EventNeed,
    value: string,
  ) => void;
  onUpdateReturnEntry: (
    event: CateringEvent,
    need: EventNeed,
    field: "consumed" | "returned",
    value: string,
  ) => void;
  onUpdateEvent: (eventId: string, form: EventForm) => void;
  onUpdateEventKgPerPerson: (eventId: string, value: number | undefined) => void;
  products: Product[];
  returnLog: EventReturnLog;
  selectedEvent?: CateringEvent;
  selectedEventId: string;
}) {
  const [detailEventId, setDetailEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [agendaFilter, setAgendaFilter] =
    useState<EventAgendaFilter>("todos");
  const [isAgendaFilterOpen, setIsAgendaFilterOpen] = useState(false);
  const [draftProductPlan, setDraftProductPlan] = useState<EventProductPlanLog[string]>({});
  const [draftReturnLog, setDraftReturnLog] = useState<EventReturnLog[string]>({});
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [isEditingKgPerPerson, setIsEditingKgPerPerson] = useState(false);
  const [kgPerPersonDraft, setKgPerPersonDraft] = useState("");
  const [editEventForm, setEditEventForm] = useState<EventForm>({
    name: selectedEvent?.name ?? "",
    date: selectedEvent?.date ?? "",
    time: selectedEvent?.time ?? "",
    location: selectedEvent?.location ?? "",
    locationLat: selectedEvent?.locationLat ?? null,
    locationLng: selectedEvent?.locationLng ?? null,
    manager: selectedEvent?.manager ?? "",
    notes: selectedEvent?.notes ?? "",
    people: selectedEvent?.people.toString() ?? "1",
    kgPerPerson:
      selectedEvent?.kgPerPerson != null
        ? formatAmountInputValue(selectedEvent.kgPerPerson)
        : "",
    status: selectedEvent?.status ?? "pendiente",
    serviceType: selectedEvent?.serviceType ?? "picada",
  });
  const orderedEvents = [...events].sort((first, second) =>
    first.date.localeCompare(second.date),
  );
  const displayedEvents = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const getCreatedAt = (event: CateringEvent) => {
      const timestamp = Number(event.id.replace(/^evt-/, ""));
      return Number.isFinite(timestamp) ? timestamp : 0;
    };

    if (agendaFilter === "proximos") {
      return events
        .filter((event) => {
          const eventDate = new Date(`${event.date}T12:00:00`);

          return event.status !== "finalizado" && eventDate >= startOfToday;
        })
        .sort((first, second) => first.date.localeCompare(second.date));
    }

    if (agendaFilter === "personas-desc") {
      return [...events].sort(
        (first, second) =>
          second.people - first.people ||
          first.date.localeCompare(second.date),
      );
    }

    if (agendaFilter === "personas-asc") {
      return [...events].sort(
        (first, second) =>
          first.people - second.people ||
          first.date.localeCompare(second.date),
      );
    }

    if (agendaFilter === "recientes") {
      return [...events].sort(
        (first, second) => getCreatedAt(second) - getCreatedAt(first),
      );
    }

    if (agendaFilter === "finalizados") {
      return events
        .filter((event) => event.status === "finalizado")
        .sort((first, second) => second.date.localeCompare(first.date));
    }

    return orderedEvents;
  }, [agendaFilter, events, orderedEvents]);
  const editingEvent = events.find((event) => event.id === editingEventId);
  const detailEvent =
    events.find((event) => event.id === detailEventId) ?? undefined;
  const detailNeeds = detailEvent
    ? getEventOperationalNeeds(
        detailEvent,
        products,
        draftProductPlan,
        true,
      )
    : [];
  const detailWhatsappUrl = detailEvent
    ? getEventNeedsWhatsappUrl(detailEvent, detailNeeds)
    : "#";
  const selectedProductIds = new Set(
    detailNeeds.map((need) => need.product.id),
  );
  const addableProducts = products.filter(
    (product) => !selectedProductIds.has(product.id),
  );
  const detailEstimatedConsumptionTotal = detailEvent
    ? clampAmount(
        detailNeeds.reduce(
          (total, need) =>
            need.product.unit === "kg" ? total + need.base : total,
          0,
        ),
      )
    : 0;
  const detailSentTotal = clampAmount(
    detailNeeds.reduce(
      (total, need) =>
        need.product.unit === "kg" ? total + need.total : total,
      0,
    ),
  );
  const detailReturnedTotal = detailEvent
    ? clampAmount(
        detailNeeds.reduce(
          (total, need) =>
            need.product.unit === "kg"
              ? total +
                getDraftReturnEntry(need.product.id, draftReturnLog).returned
              : total,
          0,
        ),
      )
    : 0;
  const detailConsumedTotal = clampAmount(
    Math.max(detailSentTotal - detailReturnedTotal, 0),
  );
  const savedProductPlan = detailEvent
    ? buildDefaultEventProductPlan(
        detailEvent,
        products,
        eventProductPlanLog[detailEvent.id],
      )
    : {};
  const savedReturnEntries = detailEvent ? returnLog[detailEvent.id] ?? {} : {};
  const hasUnsavedDraft =
    !areJsonEqual(draftProductPlan, savedProductPlan) ||
    !areJsonEqual(draftReturnLog, savedReturnEntries);
  const agendaFilterRef = useRef<HTMLDivElement>(null);
  const activeAgendaFilterLabel =
    eventAgendaFilters.find((filter) => filter.id === agendaFilter)?.label ??
    "Todos";
  const pendingEventsCount = events.filter(
    (event) => event.status !== "finalizado",
  ).length;
  const finishedEventsCount = events.filter(
    (event) => event.status === "finalizado",
  ).length;

  useBodyScrollLock(Boolean(detailEventId || editingEventId || isCreatingEvent));

  useEffect(() => {
    if (!isAgendaFilterOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        agendaFilterRef.current &&
        !agendaFilterRef.current.contains(event.target as Node)
      ) {
        setIsAgendaFilterOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAgendaFilterOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAgendaFilterOpen]);

  useEffect(() => {
    if (!isCreatingEvent) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsCreatingEvent(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);

    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isCreatingEvent]);

  useEffect(() => {
    if (!editingEventId) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setEditingEventId(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);

    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [editingEventId]);

  useEffect(() => {
    if (!detailEventId) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setDetailEventId(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);

    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [detailEventId]);

  useEffect(() => {
    if (!detailEventId) {
      setDraftProductPlan({});
      setDraftReturnLog({});
      setHasSavedDraft(false);
      return;
    }

    const event = events.find((item) => item.id === detailEventId);

    setDraftProductPlan(
      event
        ? buildDefaultEventProductPlan(
            event,
            products,
            eventProductPlanLog[detailEventId],
          )
        : {},
    );
    setDraftReturnLog(returnLog[detailEventId] ?? {});
    setHasSavedDraft(false);
  }, [detailEventId]);

  useEffect(() => {
    if (!detailEventId) {
      setIsAddingProduct(false);
    }
  }, [detailEventId]);

  function startEditingEvent(event: CateringEvent) {
    onSelectEvent(event.id);
    setEditEventForm({
      name: event.name,
      date: formatDateForForm(event.date),
      time: event.time ?? "",
      location: event.location ?? "",
      locationLat: event.locationLat ?? null,
      locationLng: event.locationLng ?? null,
      manager: event.manager ?? "",
      notes: event.notes ?? "",
      people: event.people.toString(),
      kgPerPerson:
        event.kgPerPerson != null
          ? formatAmountInputValue(event.kgPerPerson)
          : "",
      status: event.status,
      serviceType: event.serviceType,
    });
    setEditingEventId(event.id);
  }

  function handleEditEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingEventId) {
      return;
    }

    onUpdateEvent(editingEventId, editEventForm);
    setEditingEventId(null);
  }

  function handleCreateEventSubmit(event: FormEvent<HTMLFormElement>) {
    onCreateEvent(event);
    setIsCreatingEvent(false);
  }

  function handleDeleteEvent(eventId: string): boolean {
    const eventToDelete = events.find((event) => event.id === eventId);
    const eventName = eventToDelete?.name ?? "este evento";
    const confirmed = window.confirm(
      `¿Eliminar "${eventName}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return false;
    }

    if (eventId === editingEventId) {
      setEditingEventId(null);
    }

    onDeleteEvent(eventId);
    return true;
  }

  function handleFinalizeEvent(event: CateringEvent) {
    if (event.status === "finalizado") {
      return;
    }

    const confirmed = window.confirm(
      `¿Marcar "${event.name}" como finalizado? Se registrarán las salidas de stock del evento.`,
    );

    if (!confirmed) {
      return;
    }

    onStatusChange(event.id, "finalizado");
  }

  function updateDraftProductPlan(need: EventNeed, value: string) {
    const total = parseAmountInput(value);

    setDraftProductPlan((currentPlan) => ({
      ...currentPlan,
      [need.product.id]: {
        removed: false,
        total,
      },
    }));
    setDraftReturnLog((currentLog) => {
      const previous = getDraftReturnEntry(need.product.id, currentLog);
      const returned = Math.min(previous.returned, total);

      return {
        ...currentLog,
        [need.product.id]: {
          consumed: clampAmount(Math.max(total - returned, 0)),
          returned: clampAmount(returned),
        },
      };
    });
    setHasSavedDraft(false);
  }

  function updateDraftReturnEntry(need: EventNeed, value: string) {
    const returned = Math.min(parseAmountInput(value), need.total);

    setDraftReturnLog((currentLog) => ({
      ...currentLog,
      [need.product.id]: {
        consumed: clampAmount(Math.max(need.total - returned, 0)),
        returned,
      },
    }));
    setHasSavedDraft(false);
  }

  function addDraftProduct(productId: string) {
    setDraftProductPlan((currentPlan) => {
      if (currentPlan[productId]?.total > 0) {
        return currentPlan;
      }

      return {
        ...currentPlan,
        [productId]: {
          removed: false,
          total: 0.5,
        },
      };
    });
    setIsAddingProduct(false);
    setHasSavedDraft(false);
  }

  function removeDraftProduct(productId: string) {
    const product = products.find((item) => item.id === productId);
    const confirmed = window.confirm(
      `¿Quitar ${product?.name ?? "este producto"} del evento?`,
    );

    if (!confirmed) {
      return;
    }

    setDraftProductPlan((currentPlan) => {
      const nextPlan = { ...currentPlan };
      nextPlan[productId] = {
        removed: true,
        total: 0,
      };
      return nextPlan;
    });
    setDraftReturnLog((currentLog) => {
      const nextLog = { ...currentLog };
      delete nextLog[productId];
      return nextLog;
    });
    setHasSavedDraft(false);
  }

  function saveDetailDraft() {
    if (!detailEvent) {
      return;
    }

    const needsByProductId = new Map(
      detailNeeds.map((need) => [need.product.id, need]),
    );
    const productPlanToSave = Object.fromEntries(
      Object.entries(draftProductPlan).map(([productId, entry]) => [
        productId,
        {
          ...entry,
          removed: entry.removed === true || entry.total <= 0,
        },
      ]),
    ) as EventProductPlanLog[string];
    const productIdsToSave = new Set([
      ...detailNeeds.map((need) => need.product.id),
      ...Object.keys(productPlanToSave),
      ...Object.keys(draftReturnLog),
      ...Object.keys(savedReturnEntries),
    ]);
    const returnEntriesToSave = Array.from(productIdsToSave).reduce<
      EventReturnLog[string]
    >((entries, productId) => {
      const plannedTotal =
        needsByProductId.get(productId)?.total ??
        productPlanToSave[productId]?.total ??
        0;
      const returned = Math.min(
        getDraftReturnEntry(productId, draftReturnLog).returned,
        plannedTotal,
      );

      entries[productId] = {
        consumed: clampAmount(Math.max(plannedTotal - returned, 0)),
        returned: clampAmount(returned),
      };

      return entries;
    }, {});

    onSaveEventOperationalDraft(
      detailEvent,
      productPlanToSave,
      returnEntriesToSave,
      detailNeeds,
    );
    setDraftProductPlan(productPlanToSave);
    setDraftReturnLog(returnEntriesToSave);
    setHasSavedDraft(true);
  }

  return (
    <div className="space-y-6">
      <HeaderBlock
        eyebrow="Eventos"
        title="Agenda de servicios"
        subtitle="Vista rápida de eventos próximos, preparados y finalizados. Abrí cada evento para operar cantidades y retornos."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={CalendarDays}
          label="Eventos cargados"
          value={orderedEvents.length.toString()}
          detail="Total en agenda"
          tone="bg-zinc-100 text-zinc-700"
        />
        <StatCard
          icon={ClipboardList}
          label="Activos"
          value={pendingEventsCount.toString()}
          detail="Pendientes y preparados"
          tone="bg-[#edf7f1] text-[#2f6b4f]"
        />
        <StatCard
          icon={PackageCheck}
          label="Finalizados"
          value={finishedEventsCount.toString()}
          detail="Servicios completados"
          tone="bg-zinc-100 text-zinc-500"
        />
      </section>

      <section>
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle
              icon={CalendarDays}
              title="Agenda de eventos"
              subtitle={`${displayedEvents.length} de ${orderedEvents.length} servicios`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <div ref={agendaFilterRef} className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setIsAgendaFilterOpen((currentValue) => !currentValue)
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950"
                  aria-label="Filtrar eventos"
                  title="Filtrar eventos"
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                  <span>{activeAgendaFilterLabel}</span>
                </button>
                {isAgendaFilterOpen && (
                  <div className="app-popover absolute right-0 top-[calc(100%+0.375rem)] z-30 w-56 overflow-hidden rounded-[8px] border border-zinc-200 bg-white shadow-[0_18px_44px_rgba(39,39,42,0.14)]">
                    {eventAgendaFilters.map((filter) => {
                      const isSelected = agendaFilter === filter.id;

                      return (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => {
                            setAgendaFilter(filter.id);
                            setIsAgendaFilterOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-2.5 text-left text-sm font-semibold transition last:border-b-0 ${
                            isSelected
                              ? "bg-zinc-50 text-zinc-950"
                              : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
                          }`}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {filter.label}
                          </span>
                          {isSelected && (
                            <Check
                              className="h-4 w-4 text-zinc-500"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingEvent(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#8f2f2b] px-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(143,47,43,0.16)] transition hover:bg-[#7d2926]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Crear evento
              </button>
            </div>
          </div>
          <div
            className={`mt-5 ${
              displayedEvents.length > 0
                ? "grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                : ""
            }`}
          >
            {displayedEvents.map((event) => {
              const isActive = event.id === selectedEventId;

              return (
                <article
                  key={event.id}
                  className={`app-card-enter flex min-h-[168px] flex-col rounded-[8px] border p-4 text-left transition ${
                    isActive
                      ? "border-zinc-800 bg-white text-zinc-950 shadow-[0_8px_24px_rgba(39,39,42,0.13)]"
                      : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400 hover:shadow-[0_4px_12px_rgba(39,39,42,0.06)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (event.id !== selectedEventId) {
                        onSelectEvent(event.id);
                      }
                      setDetailEventId(event.id);
                      setIsEditingKgPerPerson(false);
                    }}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold uppercase">
                          {formatEventNameDisplay(event.name)}
                        </p>
                        <p
                          className={`mt-2 text-xs ${
                            isActive ? "text-[#8f2f2b]" : "text-zinc-500"
                          }`}
                        >
                          {formatEventDate(event.date)}
                        </p>
                        <p
                          className={`mt-1 text-xs font-semibold ${
                            isActive ? "text-zinc-700" : "text-zinc-500"
                          }`}
                        >
                          {serviceTypeCopy[event.serviceType]}
                        </p>
                        {event.manager && (
                          <p className="mt-2 text-xs font-semibold text-zinc-600">
                            Encargado: {formatPersonName(event.manager)}
                          </p>
                        )}
                        {event.notes && (
                          <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-500">
                            {event.notes}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-xs font-semibold ${
                          isActive
                            ? "bg-[#8f2f2b] text-white"
                            : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{event.people}</span>
                      </span>
                    </div>
                  </button>
                <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                  <EventStatusBadge status={event.status} />
                  <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => exportEventToCalendar(event)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] border transition ${
                          isActive
                            ? "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-white"
                        }`}
                        aria-label={`Exportar ${event.name} a calendario`}
                        title="Exportar a calendario"
                      >
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          startEditingEvent(event);
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] border transition ${
                          isActive
                            ? "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-white"
                        }`}
                        aria-label={`Editar ${event.name}`}
                        title="Editar evento"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(event.id)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] border transition ${
                          isActive
                            ? "border-red-100 bg-white text-red-700 hover:border-red-200 hover:bg-red-50"
                            : "border-red-100 bg-red-50 text-red-700 hover:border-red-200 hover:bg-red-100"
                        }`}
                        aria-label={`Eliminar ${event.name}`}
                        title="Eliminar evento"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            {displayedEvents.length === 0 && (
              <div className="flex min-h-[160px] w-full items-center justify-center rounded-[8px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
                <EmptyState
                  text={
                    orderedEvents.length === 0
                      ? "No hay eventos cargados. Creá uno para calcular stock."
                      : "No hay eventos para este filtro."
                  }
                />
              </div>
            )}
          </div>
        </Panel>
      </section>

      {detailEvent && (
        <div className="app-slide-panel fixed inset-y-0 left-0 right-0 z-50 bg-[#f4f5f7] md:left-[280px]">
          <div className="flex h-full w-full flex-col overflow-hidden border-l border-zinc-200 bg-[#f4f5f7]">
            <div className="border-b border-zinc-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <EventStatusBadge status={detailEvent.status} />
                    <span className="rounded-[8px] bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                      {serviceTypeCopy[detailEvent.serviceType]}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold leading-tight text-zinc-950">
                    {formatEventNameDisplay(detailEvent.name)}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-zinc-500">
                    {formatEventDate(detailEvent.date)} · {detailEvent.people} personas
                    {detailEvent.manager
                      ? ` · Encargado: ${formatPersonName(detailEvent.manager)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportEventToCalendar(detailEvent)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
                  >
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    Calendario
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditingEvent(detailEvent)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Editar datos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFinalizeEvent(detailEvent)}
                    disabled={detailEvent.status === "finalizado"}
                    className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] px-3 text-xs font-semibold transition ${
                      detailEvent.status === "finalizado"
                        ? "cursor-default border border-zinc-200 bg-zinc-100 text-zinc-500"
                        : "bg-zinc-950 text-white hover:bg-zinc-800"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {detailEvent.status === "finalizado"
                      ? "Finalizado"
                      : "Marcar como finalizado"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailEventId(null)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
                    aria-label="Cerrar evento"
                    title="Cerrar"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <EventMetricCard
                  label="Consumo estimado"
                  value={formatAmount(detailEstimatedConsumptionTotal, "kg")}
                  icon={Scale}
                  tone="bg-[#edf7f1] text-[#2f6b4f]"
                  detail="Base sin preventivo"
                />
                <EventMetricCard
                  label="Total enviado"
                  value={formatAmount(detailSentTotal, "kg")}
                  icon={Truck}
                  tone="bg-[#eef3fb] text-[#2c4e8a]"
                  detail="Incluye buffer preventivo"
                />
                <EventMetricCard
                  label="Total consumido"
                  value={formatAmount(detailConsumedTotal, "kg")}
                  icon={Flame}
                  tone="bg-[#fef3ee] text-[#a35612]"
                  detail="Enviado menos retornado"
                />
                <EventMetricCard
                  label="Total retornado"
                  value={formatAmount(detailReturnedTotal, "kg")}
                  icon={PackageCheck}
                  tone="bg-zinc-100 text-zinc-600"
                  detail="Stock recuperado"
                />
                <div className="relative flex flex-col rounded-[8px] border border-zinc-200 bg-white p-4 shadow-[0_8px_24px_rgba(39,39,42,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.02em] text-zinc-500">
                        Kg / persona
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isEditingKgPerPerson) {
                            setKgPerPersonDraft(
                              formatAmountInputValue(
                                detailEvent.kgPerPerson ??
                                  getDefaultKgPerPerson(detailEvent.serviceType),
                              ),
                            );
                          }
                          setIsEditingKgPerPerson((v) => !v);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent text-zinc-400 transition hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-700"
                        aria-label="Editar kg por persona"
                        title="Editar kg/persona"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex h-9 items-center">
                    {isEditingKgPerPerson ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const parsed = parseAmountInput(kgPerPersonDraft);
                          if (parsed > 0) {
                            const defaultKg = getDefaultKgPerPerson(detailEvent.serviceType);
                            const newKg = parsed === defaultKg ? undefined : parsed;
                            onUpdateEventKgPerPerson(detailEvent.id, newKg);
                            const updatedEvent = { ...detailEvent, kgPerPerson: newKg };
                            const newBaseNeeds = calculateEventNeeds(updatedEvent, products);
                            const newBaseProductIds = new Set(newBaseNeeds.map((n) => n.product.id));
                            setDraftProductPlan((currentPlan) => {
                              const newPlan: typeof currentPlan = {};
                              for (const need of newBaseNeeds) {
                                newPlan[need.product.id] = {
                                  removed: currentPlan[need.product.id]?.removed ?? false,
                                  total: need.total,
                                };
                              }
                              for (const [productId, entry] of Object.entries(currentPlan)) {
                                if (!newBaseProductIds.has(productId)) {
                                  newPlan[productId] = entry;
                                }
                              }
                              return newPlan;
                            });
                          }
                          setIsEditingKgPerPerson(false);
                        }}
                        className="flex w-full items-center gap-2"
                      >
                        <input
                          type="text"
                          inputMode="decimal"
                          autoFocus
                          value={kgPerPersonDraft}
                          onChange={(event) =>
                            setKgPerPersonDraft(
                              normalizeAmountDraft(event.target.value),
                            )
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setIsEditingKgPerPerson(false);
                            }
                          }}
                          className="h-9 min-w-0 flex-1 rounded-[8px] border border-zinc-200 bg-white px-3 text-lg font-bold text-zinc-950 outline-none transition focus:border-zinc-500"
                        />
                        <button
                          type="submit"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-zinc-950 text-white transition hover:bg-zinc-800"
                          aria-label="Guardar"
                          title="Guardar"
                        >
                          <Save className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </form>
                    ) : (
                      <p className="text-2xl font-bold text-zinc-950">
                        {formatAmount(
                          detailEvent.kgPerPerson ??
                            getDefaultKgPerPerson(detailEvent.serviceType),
                          "kg",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto pt-3">
                    <p className="text-[11px] font-medium text-zinc-400">
                      {detailEvent.kgPerPerson != null ? "PERSONALIZADO" : "Valor estándar de receta"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <EventMetricCard
                  label="Observaciones"
                  value={
                    detailEvent.notes
                      ? detailEvent.notes
                      : "Sin observaciones cargadas."
                  }
                  compact
                />
              </div>

              <div className="mt-4">
                <div className="rounded-[8px] border border-zinc-200 bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <SectionTitle
                      icon={PackagePlus}
                      title="Productos del evento"
                      subtitle="Editá cantidades, extras y retornos"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <a
                        href={detailWhatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950"
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                        WhatsApp
                      </a>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setIsAddingProduct((currentValue) => !currentValue)
                          }
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          Agregar producto
                        </button>
                        {isAddingProduct && (
                          <div className="app-popover absolute right-0 top-[calc(100%+0.5rem)] z-20 w-[280px] overflow-hidden rounded-[8px] border border-zinc-200 bg-white shadow-[0_18px_44px_rgba(39,39,42,0.14)]">
                            {addableProducts.length > 0 ? (
                              addableProducts.map((product) => {
                                const visual = getProductVisual(product);

                                return (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => {
                                      addDraftProduct(product.id);
                                    }}
                                    className="flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-2.5 text-left text-sm font-semibold text-zinc-800 transition last:border-b-0 hover:bg-zinc-50"
                                  >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-zinc-100 text-[#8f2f2b]">
                                      {visual.type === "image" ? (
                                        <Image
                                          src={visual.src}
                                          alt={visual.alt}
                                          width={22}
                                          height={22}
                                          className="h-5.5 w-5.5 object-contain"
                                        />
                                      ) : (
                                        <visual.Icon
                                          className="h-4 w-4"
                                          aria-hidden="true"
                                        />
                                      )}
                                    </span>
                                    <span>{product.name}</span>
                                  </button>
                                );
                              })
                            ) : (
                              <p className="px-3 py-3 text-sm font-medium text-zinc-500">
                                Todos los productos ya están en el evento.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={saveDetailDraft}
                        className={`inline-flex h-10 items-center justify-center gap-2 rounded-[8px] px-3.5 text-sm font-semibold transition ${
                          !hasUnsavedDraft && hasSavedDraft
                            ? "border border-zinc-200 bg-zinc-100 text-zinc-500"
                            : "bg-zinc-950 text-white hover:bg-zinc-800"
                        }`}
                      >
                        <Save className="h-4 w-4" aria-hidden="true" />
                        {!hasUnsavedDraft && hasSavedDraft ? "Guardado" : "Guardar"}
                      </button>
                    </div>
                  </div>

                  <EventProductTable
                    eventProductPlan={draftProductPlan}
                    needs={detailNeeds}
                    onRemoveProduct={removeDraftProduct}
                    onUpdatePlan={updateDraftProductPlan}
                    onUpdateReturn={updateDraftReturnEntry}
                    returnLog={draftReturnLog}
                    serviceLabel={serviceTypeCopy[detailEvent.serviceType]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreatingEvent && (
        <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 px-4 py-6 backdrop-blur-sm md:left-[280px]" onClick={() => setIsCreatingEvent(false)}>
          <div className="app-modal-panel max-h-full w-full max-w-[520px] overflow-y-auto rounded-[8px] border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(39,39,42,0.22)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <SectionTitle icon={Plus} title="Crear evento" subtitle="Nuevo servicio" />
              <button
                type="button"
                onClick={() => setIsCreatingEvent(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
                aria-label="Cerrar creación"
                title="Cerrar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateEventSubmit} className="mt-5 space-y-4">
              <Field label="Nombre del evento">
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(event) =>
                    onEventFormChange({ ...eventForm, name: event.target.value })
                  }
                  placeholder="Cena para 60 personas"
                  className="field-control"
                  required
                />
              </Field>
              <Field label="Encargado">
                <input
                  type="text"
                  value={eventForm.manager}
                  onChange={(event) =>
                    onEventFormChange({
                      ...eventForm,
                      manager: event.target.value,
                    })
                  }
                  placeholder="Nombre del responsable"
                  className="field-control"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Fecha">
                  <DateField
                    value={eventForm.date}
                    onChange={(value) =>
                      onEventFormChange({
                        ...eventForm,
                        date: value,
                      })
                    }
                  />
                </Field>
                <Field label="Hora">
                  <TimeField
                    value={eventForm.time}
                    onChange={(value) =>
                      onEventFormChange({ ...eventForm, time: value })
                    }
                  />
                </Field>
                <Field label="Personas">
                  <input
                    type="number"
                    min="1"
                    value={eventForm.people}
                    onChange={(event) =>
                      onEventFormChange({
                        ...eventForm,
                        people: event.target.value,
                      })
                    }
                    className="field-control"
                    required
                  />
                </Field>
              </div>
              <Field label="Ubicación">
                <div className="flex flex-col gap-2">
                  {/* Empty state: two clear options */}
                  {!eventForm.location.trim() && !showLinkInput && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setShowLinkInput(true); }}
                        className="flex items-center justify-center gap-2 rounded-[12px] border border-zinc-200 bg-white py-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                      >
                        <Link2 className="h-3.5 w-3.5 text-zinc-400" />
                        Pegar link de Maps
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setShowLocationPicker(true); }}
                        className="flex items-center justify-center gap-2 rounded-[12px] border border-zinc-200 bg-white py-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                      >
                        <MapPin className="h-3.5 w-3.5 text-[#8f2f2b]" />
                        Marcar en mapa
                      </button>
                    </div>
                  )}

                  {/* Link paste input */}
                  {(!eventForm.location.trim() && showLinkInput) && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={eventForm.location}
                        onChange={(event) =>
                          onEventFormChange({
                            ...eventForm,
                            location: event.target.value,
                            locationLat: null,
                            locationLng: null,
                          })
                        }
                        placeholder="Pegá el link de Google Maps…"
                        className="field-control flex-1"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // stop <label> from re-focusing the input
                          setShowLinkInput(false);
                          onEventFormChange({ ...eventForm, location: "", locationLat: null, locationLng: null });
                        }}
                        className="flex shrink-0 items-center rounded-[8px] border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
                        title="Cancelar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Location set — show Google Maps link prominently */}
                  {eventForm.location.trim() && (() => {
                    const mapsUrl = eventForm.locationLat !== null && eventForm.locationLng !== null
                      ? `https://maps.google.com/?q=${eventForm.locationLat},${eventForm.locationLng}`
                      : `https://maps.google.com/?q=${encodeURIComponent(eventForm.location.trim())}`;
                    return (
                      <div className="rounded-[12px] border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8f2f2b]" />
                          <span className="flex-1 text-xs text-zinc-500 line-clamp-2">
                            {eventForm.location}
                          </span>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              onEventFormChange({ ...eventForm, location: "", locationLat: null, locationLng: null });
                              setShowLinkInput(false);
                            }}
                            className="shrink-0 text-zinc-400 hover:text-zinc-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#8f2f2b] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{mapsUrl}</span>
                        </a>
                      </div>
                    );
                  })()}
                </div>
              </Field>
              {showLocationPicker && (
                <LocationPicker
                  initial={eventForm.location}
                  onConfirm={(result: LocationResult) => {
                    onEventFormChange({
                      ...eventForm,
                      location: result.name,
                      locationLat: result.lat,
                      locationLng: result.lng,
                    });
                    setShowLocationPicker(false);
                  }}
                  onClose={() => setShowLocationPicker(false)}
                />
              )}
              <Field label="Tipo de servicio">
                <select
                  value={eventForm.serviceType}
                  onChange={(event) =>
                    onEventFormChange({
                      ...eventForm,
                      serviceType: event.target.value as EventServiceType,
                    })
                  }
                  className="field-control"
                >
                  {recipeConfigs.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Estado">
                <select
                  value={eventForm.status}
                  onChange={(event) =>
                    onEventFormChange({
                      ...eventForm,
                      status: event.target.value as EventStatus,
                    })
                  }
                  className="field-control"
                >
                  {editableEventStatuses.map((status) => (
                    <option key={status} value={status}>
                      {eventStatusCopy[status]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Observaciones">
                <textarea
                  value={eventForm.notes}
                  onChange={(event) =>
                    onEventFormChange({
                      ...eventForm,
                      notes: event.target.value,
                    })
                  }
                  placeholder="Dirección, hora, responsable, pedidos especiales..."
                  className="field-control notes-textarea"
                />
              </Field>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#8f2f2b] px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(143,47,43,0.24)] transition hover:bg-[#7d2926]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Crear evento
              </button>
            </form>
          </div>
        </div>
      )}

      {editingEventId && (
        <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 px-4 py-6 backdrop-blur-sm md:left-[280px]" onClick={() => setEditingEventId(null)}>
          <div className="app-modal-panel max-h-full w-full max-w-[520px] overflow-y-auto rounded-[8px] border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(39,39,42,0.22)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <SectionTitle
                icon={Pencil}
                title="Editar evento"
                subtitle={editingEvent?.name ?? "Servicio cargado"}
              />
              <button
                type="button"
                onClick={() => setEditingEventId(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
                aria-label="Cerrar edición"
                title="Cerrar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleEditEventSubmit} className="mt-5 space-y-4">
              <Field label="Nombre del evento">
                <input
                  type="text"
                  value={editEventForm.name}
                  onChange={(event) =>
                    setEditEventForm({
                      ...editEventForm,
                      name: event.target.value,
                    })
                  }
                  placeholder="Cena para 60 personas"
                  className="field-control"
                  required
                />
              </Field>
              <Field label="Encargado">
                <input
                  type="text"
                  value={editEventForm.manager}
                  onChange={(event) =>
                    setEditEventForm({
                      ...editEventForm,
                      manager: event.target.value,
                    })
                  }
                  placeholder="Nombre del responsable"
                  className="field-control"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Fecha">
                  <DateField
                    value={editEventForm.date}
                    onChange={(value) =>
                      setEditEventForm({
                        ...editEventForm,
                        date: value,
                      })
                    }
                  />
                </Field>
                <Field label="Hora">
                  <TimeField
                    value={editEventForm.time}
                    onChange={(value) =>
                      setEditEventForm({
                        ...editEventForm,
                        time: value,
                      })
                    }
                  />
                </Field>
                <Field label="Personas">
                  <input
                    type="number"
                    min="1"
                    value={editEventForm.people}
                    onChange={(event) =>
                      setEditEventForm({
                        ...editEventForm,
                        people: event.target.value,
                      })
                    }
                    className="field-control"
                    required
                  />
                </Field>
              </div>
              <Field label="Ubicación">
                <input
                  type="text"
                  value={editEventForm.location}
                  onChange={(event) =>
                    setEditEventForm({
                      ...editEventForm,
                      location: event.target.value,
                      locationLat: null,
                      locationLng: null,
                    })
                  }
                  placeholder="Dirección o link de Google Maps"
                  className="field-control"
                />
              </Field>
              <Field label="Tipo de servicio">
                <select
                  value={editEventForm.serviceType}
                  onChange={(event) =>
                    setEditEventForm({
                      ...editEventForm,
                      serviceType: event.target.value as EventServiceType,
                    })
                  }
                  className="field-control"
                >
                  {recipeConfigs.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kg/persona">
                <input
                  type="text"
                  inputMode="decimal"
                  value={editEventForm.kgPerPerson}
                  onChange={(event) =>
                    setEditEventForm({
                      ...editEventForm,
                      kgPerPerson: normalizeAmountDraft(event.target.value),
                    })
                  }
                  placeholder={`Estándar ${formatAmountInputValue(
                    getDefaultKgPerPerson(editEventForm.serviceType),
                  )}`}
                  className="field-control"
                />
              </Field>
              <Field label="Estado">
                <select
                  value={editEventForm.status}
                  onChange={(event) =>
                    setEditEventForm({
                      ...editEventForm,
                      status: event.target.value as EventStatus,
                    })
                  }
                  className="field-control"
                >
                  {editableEventStatuses.map((status) => (
                    <option key={status} value={status}>
                      {eventStatusCopy[status]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Observaciones">
                <textarea
                  value={editEventForm.notes}
                  onChange={(event) =>
                    setEditEventForm({
                      ...editEventForm,
                      notes: event.target.value,
                    })
                  }
                  placeholder="Dirección, hora, responsable, pedidos especiales..."
                  className="field-control notes-textarea"
                />
              </Field>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#8f2f2b] px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(143,47,43,0.24)] transition hover:bg-[#7d2926]"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Guardar cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EventMetricCard({
  compact = false,
  detail,
  icon: Icon,
  label,
  tone,
  value,
}: {
  compact?: boolean;
  detail?: string;
  icon?: typeof Gauge;
  label: string;
  tone?: string;
  value: string;
}) {
  if (compact) {
    return (
      <div className="rounded-[8px] border border-zinc-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(39,39,42,0.04)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.02em] text-zinc-500">
          {label}
        </p>
        <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-zinc-700">
          {value}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-[8px] border border-zinc-200 bg-white p-4 shadow-[0_8px_24px_rgba(39,39,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.02em] text-zinc-500">
          {label}
        </p>
        {Icon && tone && (
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${tone}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-950">{value}</p>
      {detail && (
        <p className="mt-auto pt-3 text-[11px] font-medium text-zinc-400">
          {detail}
        </p>
      )}
    </div>
  );
}

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12.04 2C6.56 2 2.1 6.34 2.1 11.68c0 1.7.46 3.36 1.33 4.82L2 22l5.7-1.46a10.2 10.2 0 0 0 4.34 1c5.48 0 9.94-4.34 9.94-9.68S17.52 2 12.04 2Zm0 17.9a8.48 8.48 0 0 1-4.04-1l-.29-.16-3.38.86.9-3.2-.19-.31a7.98 7.98 0 0 1-1.25-4.31c0-4.43 3.7-8.04 8.25-8.04s8.25 3.61 8.25 8.04-3.7 8.12-8.25 8.12Zm4.52-6.03c-.25-.12-1.47-.7-1.7-.78-.23-.09-.39-.12-.56.12-.16.24-.64.78-.78.94-.14.16-.29.18-.54.06-.25-.12-1.05-.38-2-1.2-.74-.64-1.24-1.44-1.39-1.68-.14-.24-.02-.37.11-.49.11-.11.25-.28.37-.42.12-.14.16-.24.25-.4.08-.16.04-.3-.02-.42-.06-.12-.56-1.32-.77-1.8-.2-.48-.41-.41-.56-.42h-.48c-.16 0-.42.06-.64.3-.22.24-.84.8-.84 1.96s.86 2.28.98 2.44c.12.16 1.7 2.54 4.14 3.55.58.25 1.03.4 1.38.51.58.18 1.11.15 1.53.09.47-.07 1.47-.58 1.68-1.14.21-.56.21-1.04.15-1.14-.06-.1-.23-.16-.48-.28Z" />
    </svg>
  );
}

function EventProductTable({
  eventProductPlan,
  needs,
  onRemoveProduct,
  onUpdatePlan,
  onUpdateReturn,
  returnLog,
  serviceLabel,
}: {
  eventProductPlan: Record<string, EventProductPlanEntry>;
  needs: EventNeed[];
  onRemoveProduct: (productId: string) => void;
  onUpdatePlan: (need: EventNeed, value: string) => void;
  onUpdateReturn: (need: EventNeed, value: string) => void;
  returnLog: EventReturnLog[string];
  serviceLabel: string;
}) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[660px] table-fixed border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase text-zinc-500">
            <th className="w-[30%] border-b border-zinc-200 pb-3">Producto</th>
            <th className="w-[14%] border-b border-zinc-200 pb-3 text-center">
              Servicio
            </th>
            <th className="w-[13%] border-b border-zinc-200 pb-3 text-center">
              Estimado
            </th>
            <th className="w-[13%] border-b border-zinc-200 pb-3 text-center">
              A llevar
            </th>
            <th className="w-[13%] border-b border-zinc-200 pb-3 text-center">
              Volvió
            </th>
            <th className="w-[13%] border-b border-zinc-200 pb-3 text-center">
              Consumido
            </th>
            <th className="w-[4%] border-b border-zinc-200 pb-3 text-right" />
          </tr>
        </thead>
        <tbody>
          {(() => {
            const needGroups = [
              {
                id: "frigorifico",
                label: "Frigorífico",
                icon: Refrigerator,
                needs: needs.filter(
                  (n) =>
                    n.product.category === "Carnes" ||
                    n.product.category === "Embutidos",
                ),
              },
              {
                id: "despensa",
                label: "Despensa",
                icon: Utensils,
                needs: needs.filter((n) => n.product.category === "Despensa"),
              },
              {
                id: "inventario",
                label: "Inventario",
                icon: ClipboardList,
                needs: needs.filter(
                  (n) => n.product.category === "Inventario",
                ),
              },
            ].filter((g) => g.needs.length > 0);
            const hasMultipleGroups = needGroups.length > 1;
            return needGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <Fragment key={group.id}>
                  {hasMultipleGroups && (
                    <tr>
                      <td colSpan={7} className="bg-zinc-50 px-3 py-3">
                        <div className="flex items-center gap-2">
                          <GroupIcon
                            className="h-4 w-4 text-zinc-500"
                            aria-hidden="true"
                          />
                          <p className="text-xs font-bold uppercase text-zinc-700">
                            {group.label}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {group.needs.map((need) => {
                    const returnEntry = getDraftReturnEntry(
                      need.product.id,
                      returnLog,
                    );
                    const consumed = clampAmount(
                      Math.max(need.total - returnEntry.returned, 0),
                    );
                    const visual = getProductVisual(need.product);

                    return (
                      <tr key={need.product.id}>
                        <td className="w-[30%] border-b border-zinc-100 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-zinc-100 text-[#8f2f2b]">
                              {visual.type === "image" ? (
                                <Image
                                  src={visual.src}
                                  alt={visual.alt}
                                  width={24}
                                  height={24}
                                  className="h-6 w-6 object-contain"
                                />
                              ) : (
                                <visual.Icon
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-zinc-950">
                                {need.product.name}
                              </p>
                              <p className="mt-1 text-xs font-medium text-zinc-500">
                                {need.share
                                  ? `${formatShare(need.share)}%`
                                  : "Por persona"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="w-[14%] border-b border-zinc-100 py-3 text-center text-zinc-600">
                          {need.source ?? serviceLabel}
                        </td>
                        <td className="w-[13%] border-b border-zinc-100 py-3 text-center text-zinc-700">
                          {formatAmount(
                            need.base + need.preventive,
                            need.product.unit,
                          )}
                        </td>
                        <td className="w-[13%] border-b border-zinc-100 py-3">
                          <QuantityInput
                            ariaLabel={`Cantidad a llevar de ${need.product.name}`}
                            value={need.total}
                            onChange={(value) => onUpdatePlan(need, value)}
                          />
                        </td>
                        <td className="w-[13%] border-b border-zinc-100 py-3">
                          <QuantityInput
                            ariaLabel={`Cantidad que volvió de ${need.product.name}`}
                            value={returnEntry.returned}
                            onChange={(value) => onUpdateReturn(need, value)}
                          />
                        </td>
                        <td className="w-[13%] border-b border-zinc-100 py-3 text-center font-semibold text-zinc-950">
                          {formatAmount(consumed, need.product.unit)}
                        </td>
                        <td className="w-[4%] border-b border-zinc-100 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onRemoveProduct(need.product.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-zinc-400 transition hover:bg-red-50 hover:text-red-700"
                            aria-label={`Quitar ${need.product.name} del evento`}
                            title="Quitar producto"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            });
          })()}
        </tbody>
      </table>
    </div>
  );
}

function QuantityInput({
  ariaLabel,
  onChange,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  value: number;
}) {
  const [draftValue, setDraftValue] = useState(formatAmountInputValue(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setDraftValue(formatAmountInputValue(value));
  }, [isEditing, value]);

  function handleChange(nextValue: string) {
    const normalizedValue = normalizeOperationalAmountDraft(nextValue);

    setDraftValue(normalizedValue);
    onChange(normalizedValue);
  }

  function handleCommit() {
    const normalizedValue = normalizeOperationalAmountDraft(draftValue);
    const committedValue = formatAmountInputValue(parseAmountInput(normalizedValue));

    setIsEditing(false);
    setDraftValue(committedValue);
    onChange(committedValue);
  }

  return (
    <input
      aria-label={ariaLabel}
      className="mx-auto block h-9 w-24 rounded-[8px] border border-zinc-200 bg-white px-2 text-center text-sm font-semibold text-zinc-950 outline-none transition focus:border-zinc-500 focus:shadow-[0_0_0_3px_rgba(82,82,91,0.08)]"
      inputMode="decimal"
      min="0"
      pattern="[0-9]*[.,]?[0-9]*"
      type="text"
      value={draftValue}
      onBlur={handleCommit}
      onChange={(event) => handleChange(event.target.value)}
      onFocus={() => setIsEditing(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function StockTableRow({
  categoryLabel,
  onOpen,
  product,
  reservedStock,
}: {
  categoryLabel: string;
  onOpen: () => void;
  product: Product;
  reservedStock: number;
}) {
  const visual = getProductVisual(product);
  const availableStock = roundAmount(
    Math.max(product.currentStock - reservedStock, 0),
  );
  const missingStock = roundAmount(
    Math.max(reservedStock - product.currentStock, 0),
  );
  const stockBadge = getStockBadge(availableStock);

  return (
    <tr
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      className="app-table-row cursor-pointer outline-none transition hover:bg-zinc-50 focus-visible:bg-zinc-50"
    >
      <td className="border-b border-zinc-100 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-zinc-100 text-[#8f2f2b]">
            {visual.type === "image" ? (
              <Image
                src={visual.src}
                alt={visual.alt}
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
              />
            ) : (
              <visual.Icon className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-zinc-950">{product.name}</p>
              {stockBadge && (
                <span
                  className={`inline-flex items-center rounded-[8px] border px-2 py-0.5 text-[11px] font-bold uppercase ${stockBadge.className}`}
                >
                  {stockBadge.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="w-28 border-b border-zinc-100 py-3 text-center text-zinc-700">
        {categoryLabel}
      </td>
      <td className="w-24 border-b border-zinc-100 py-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm font-semibold text-zinc-950">
          <Scale className="h-3 w-3 text-zinc-500" aria-hidden="true" />
          {formatAmount(product.currentStock, product.unit)}
        </span>
      </td>
      <td className="w-24 border-b border-zinc-100 py-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-amber-200 bg-amber-50 px-2 py-1.5 text-sm font-semibold text-amber-900">
          <PackageCheck className="h-3 w-3 text-amber-700" aria-hidden="true" />
          {formatAmount(reservedStock, product.unit)}
        </span>
      </td>
      <td className="w-24 border-b border-zinc-100 py-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-sm font-semibold text-emerald-900">
          <Scale className="h-3 w-3 text-emerald-700" aria-hidden="true" />
          {formatAmount(availableStock, product.unit)}
        </span>
      </td>
      <td className="w-24 border-b border-zinc-100 py-3 text-center">
        <span
          className={`inline-flex items-center gap-1.5 rounded-[8px] border px-2 py-1.5 text-sm font-semibold ${
            missingStock > 0
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-zinc-200 bg-zinc-50 text-zinc-500"
          }`}
        >
          <AlertTriangle
            className={`h-3 w-3 ${
              missingStock > 0 ? "text-red-700" : "text-zinc-400"
            }`}
            aria-hidden="true"
          />
          {formatAmount(missingStock, product.unit)}
        </span>
      </td>
    </tr>
  );
}

function StockDetailModal({
  events,
  movements,
  onClose,
  onDeleteStockMovement,
  onSetManualProductStock,
  product,
  reservedEntries,
  reservedStock,
}: {
  events: CateringEvent[];
  movements: StockMovement[];
  onClose: () => void;
  onDeleteStockMovement: (movementId: string) => void;
  onSetManualProductStock: (productId: string, value: string) => void;
  product: Product;
  reservedEntries: StockReservationEntry[];
  reservedStock: number;
}) {
  const visual = getProductVisual(product);
  const [isEditingManualStock, setIsEditingManualStock] = useState(false);
  const [manualStockValue, setManualStockValue] = useState(
    formatAmountInputValue(product.currentStock),
  );
  const availableStock = roundAmount(
    Math.max(product.currentStock - reservedStock, 0),
  );
  const missingStock = roundAmount(
    Math.max(reservedStock - product.currentStock, 0),
  );
  const incomingMovements = movements.filter(
    (movement) => movement.type === "entrada",
  );
  const outgoingMovements = movements.filter(
    (movement) => movement.type === "salida",
  );
  const movementBalance = roundAmount(
    incomingMovements.reduce((total, movement) => total + movement.amount, 0) -
      outgoingMovements.reduce((total, movement) => total + movement.amount, 0),
  );
  const stockWithoutHistory = roundAmount(product.currentStock - movementBalance);

  useEffect(() => {
    setManualStockValue(formatAmountInputValue(product.currentStock));
  }, [product.currentStock]);

  function handleManualStockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSetManualProductStock(product.id, manualStockValue);
    setIsEditingManualStock(false);
  }

  return (
    <div className="app-slide-panel fixed inset-y-0 left-0 right-0 z-50 bg-[#f4f5f7] md:left-[280px]">
      <div className="flex h-full w-full flex-col overflow-hidden border-l border-zinc-200 bg-[#f4f5f7]">
        <div className="border-b border-zinc-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-zinc-100 text-[#8f2f2b]">
                {visual.type === "image" ? (
                  <Image
                    src={visual.src}
                    alt={visual.alt}
                    width={30}
                    height={30}
                    className="h-8 w-8 object-contain"
                  />
                ) : (
                  <visual.Icon className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold leading-tight text-zinc-950">
                  {product.name}
                </h2>
                <p className="mt-1 text-sm font-medium text-zinc-500">
                  Historial, reservas, disponibilidad y faltantes
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
              aria-label="Cerrar detalle de stock"
              title="Cerrar"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative flex flex-col rounded-[8px] border border-zinc-200 bg-white p-4 shadow-[0_8px_24px_rgba(39,39,42,0.04)]">
              <button
                type="button"
                onClick={() =>
                  setIsEditingManualStock((currentValue) => !currentValue)
                }
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent text-zinc-500 transition hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-950"
                aria-label="Editar stock manual"
                title="Editar stock"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="pr-9 text-[11px] font-bold uppercase tracking-[0.02em] text-zinc-500">
                Stock
              </p>
              {isEditingManualStock ? (
                <form
                  onSubmit={handleManualStockSubmit}
                  className="mt-2 flex items-center gap-2 pr-9"
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    value={manualStockValue}
                    onChange={(event) =>
                      setManualStockValue(
                        normalizeAmountDraft(event.target.value),
                      )
                    }
                    className="h-10 min-w-0 flex-1 rounded-[8px] border border-zinc-200 bg-white px-3 text-xl font-bold text-zinc-950 outline-none transition focus:border-zinc-500"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-zinc-950 text-white transition hover:bg-zinc-800"
                    aria-label="Guardar stock"
                    title="Guardar stock"
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <p className="mt-2 pr-9 text-2xl font-bold text-zinc-950">
                  {formatAmount(product.currentStock, product.unit)}
                </p>
              )}
              <p className="mt-auto pt-3 text-[11px] font-medium text-zinc-400">
                Stock total registrado
              </p>
            </div>
            <EventMetricCard
              label="Reservado"
              value={formatAmount(reservedStock, product.unit)}
              icon={CalendarDays}
              tone="bg-[#fef3ee] text-[#a35612]"
              detail="Comprometido en eventos"
            />
            <EventMetricCard
              label="Disponible"
              value={formatAmount(availableStock, product.unit)}
              icon={PackageCheck}
              tone="bg-[#edf7f1] text-[#2f6b4f]"
              detail="Listo para despacho"
            />
            <EventMetricCard
              label="Falta"
              value={formatAmount(missingStock, product.unit)}
              icon={AlertTriangle}
              tone={
                missingStock > 0
                  ? "bg-red-50 text-red-700"
                  : "bg-zinc-100 text-zinc-500"
              }
              detail="Necesario para cubrir reservas"
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <StockMovementList
              amountTone="border-emerald-200 bg-emerald-50 text-emerald-900"
              emptyText="Todavía no hay ingresos registrados."
              events={events}
              icon={PackagePlus}
              items={incomingMovements}
              onDeleteMovement={onDeleteStockMovement}
              title="Entró"
              tone="text-emerald-700"
              unit={product.unit}
            />
            <StockMovementList
              amountTone="border-red-200 bg-red-50 text-red-800"
              emptyText="Todavía no hay salidas registradas."
              events={events}
              icon={Minus}
              items={outgoingMovements}
              onDeleteMovement={onDeleteStockMovement}
              title="Salió"
              tone="text-red-700"
              unit={product.unit}
            />
            <StockReservationList
              emptyText="No hay eventos reservando este producto."
              entries={reservedEntries}
              title="Reservado"
              unit={product.unit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StockSummaryCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <div className={`rounded-[8px] border px-4 py-3 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase">{label}</p>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}

function StockMovementList({
  amountTone,
  emptyText,
  events,
  icon: Icon,
  items,
  onDeleteMovement,
  title,
  tone,
  unit,
}: {
  amountTone: string;
  emptyText: string;
  events: CateringEvent[];
  icon: typeof Gauge;
  items: StockMovement[];
  onDeleteMovement?: (movementId: string) => void;
  title: string;
  tone: string;
  unit: ProductUnit;
}) {
  return (
    <div className="rounded-[8px] border border-zinc-200 bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
        <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
        <h3 className="text-sm font-bold text-zinc-950">{title}</h3>
      </div>
      <div className="max-h-[calc(100vh-170px)] space-y-3 overflow-y-auto p-3">
        {items.length > 0 ? (
          items.map((movement) => {
            const movementEvent = getMovementEventInfo(movement, events);

            return (
              <div
                key={movement.id}
                className="rounded-[8px] border border-zinc-200 bg-white p-3 shadow-[0_8px_20px_rgba(39,39,42,0.04)]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p
                    className={`inline-flex whitespace-nowrap rounded-[8px] border px-2 py-1 text-sm font-bold ${amountTone}`}
                  >
                    {formatAmount(movement.amount, unit)}
                  </p>
                  <p className="min-w-0 text-right text-xs font-semibold leading-5 text-zinc-500">
                    {movementEvent
                      ? formatEventDate(movementEvent.date)
                      : formatStockMovementDate(movement.date)}
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-800">
                  {formatStockMovementNote(movement)}
                </p>
                {movement.provider && movement.note !== "Ingreso manual" && (
                  <p className="mt-1 text-xs font-semibold text-zinc-500">
                    {movement.note}
                  </p>
                )}
                {movementEvent && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <EventStatusBadge status={movementEvent.status} />
                    <span className="text-xs font-semibold text-zinc-500">
                      {serviceTypeCopy[movementEvent.serviceType]}
                    </span>
                  </div>
                )}
                {onDeleteMovement && !movementEvent && (
                  <button
                    type="button"
                    onClick={() => onDeleteMovement(movement.id)}
                    className="mt-2 ml-auto flex h-7 w-7 items-center justify-center rounded-[8px] text-zinc-400 transition hover:bg-red-50 hover:text-red-700"
                    aria-label={`Eliminar ${movement.type}`}
                    title={`Eliminar ${movement.type}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <p className="px-1 py-3 text-sm font-medium text-zinc-500">
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
}

function StockReservationList({
  emptyText,
  entries,
  title,
  unit,
}: {
  emptyText: string;
  entries: StockReservationEntry[];
  title: string;
  unit: ProductUnit;
}) {
  return (
    <div className="rounded-[8px] border border-zinc-200 bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
        <PackageCheck className="h-4 w-4 text-amber-700" aria-hidden="true" />
        <h3 className="text-sm font-bold text-zinc-950">{title}</h3>
      </div>
      <div className="max-h-[calc(100vh-170px)] space-y-3 overflow-y-auto p-3">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div
              key={`${entry.eventId}-${entry.productId}`}
              className="rounded-[8px] border border-zinc-200 bg-white p-3 shadow-[0_8px_20px_rgba(39,39,42,0.04)]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="inline-flex whitespace-nowrap rounded-[8px] border border-amber-200 bg-amber-50 px-2 py-1 text-sm font-bold text-amber-900">
                  {formatAmount(entry.amount, unit)}
                </p>
                <p className="min-w-0 text-right text-xs font-semibold leading-5 text-zinc-500">
                  {formatEventDate(entry.eventDate)}
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold text-zinc-800">
                Evento: {formatEventNameDisplay(entry.eventName)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <EventStatusBadge status={entry.eventStatus} />
                <span className="text-xs font-semibold text-zinc-500">
                  {serviceTypeCopy[entry.serviceType]}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="px-1 py-3 text-sm font-medium text-zinc-500">
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
}
