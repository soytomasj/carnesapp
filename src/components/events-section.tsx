"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Menu,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import type {
  CateringEvent,
  EventReturnLog,
  EventStatus,
  Product,
} from "@/lib/catering-data";
import {
  calculateEventNeeds,
  formatEventDate,
  getDefaultKgPerPerson,
  type EventNeed,
} from "@/lib/catering-calculations";
import type {
  EventAgendaFilter,
  EventForm,
  EventProductPlanLog,
} from "@/lib/catering-types";
import {
  eventAgendaFilters,
  serviceTypeCopy,
} from "@/lib/catering-app-constants";
import { useBodyScrollLock } from "@/lib/catering-normalize";
import {
  areJsonEqual,
  clampAmount,
  formatAmountInputValue,
  formatDateForForm,
  parseAmountInput,
} from "@/lib/form-utils";
import {
  buildDefaultEventProductPlan,
  exportEventToCalendar,
  getDraftReturnEntry,
  getEventNeedsWhatsappUrl,
  getEventOperationalNeeds,
} from "@/lib/event-utils";
import {
  formatEventNameDisplay,
  formatPersonName,
} from "@/lib/stock-utils";
import {
  EmptyState,
  EventStatusBadge,
  HeaderBlock,
  Panel,
  SectionTitle,
  StatCard,
} from "@/components/ui/primitives";
import { EventDetailPanel } from "@/components/event-detail-panel";
import { CreateEventPanel, EditEventPanel } from "@/components/event-form-panels";

export function EventsSection({
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
  const [agendaFilter, setAgendaFilter] =
    useState<EventAgendaFilter>("todos");
  const [isAgendaFilterOpen, setIsAgendaFilterOpen] = useState(false);
  const [draftProductPlan, setDraftProductPlan] = useState<EventProductPlanLog[string]>({});
  const [draftReturnLog, setDraftReturnLog] = useState<EventReturnLog[string]>({});
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
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

  function handleKgPerPersonSave(draft: string) {
    if (!detailEvent) return;
    const parsed = parseAmountInput(draft);
    if (parsed <= 0) return;
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
        <EventDetailPanel
          addableProducts={addableProducts}
          detailConsumedTotal={detailConsumedTotal}
          detailEstimatedConsumptionTotal={detailEstimatedConsumptionTotal}
          detailEvent={detailEvent}
          detailNeeds={detailNeeds}
          detailReturnedTotal={detailReturnedTotal}
          detailSentTotal={detailSentTotal}
          detailWhatsappUrl={detailWhatsappUrl}
          draftProductPlan={draftProductPlan}
          draftReturnLog={draftReturnLog}
          hasSavedDraft={hasSavedDraft}
          hasUnsavedDraft={hasUnsavedDraft}
          onAddProduct={addDraftProduct}
          onClose={() => setDetailEventId(null)}
          onFinalizeEvent={handleFinalizeEvent}
          onKgPerPersonSave={handleKgPerPersonSave}
          onRemoveProduct={removeDraftProduct}
          onSaveDraft={saveDetailDraft}
          onStartEditing={startEditingEvent}
          onUpdatePlan={updateDraftProductPlan}
          onUpdateReturn={updateDraftReturnEntry}
        />
      )}

      {isCreatingEvent && (
        <CreateEventPanel
          eventForm={eventForm}
          onClose={() => setIsCreatingEvent(false)}
          onFormChange={onEventFormChange}
          onSubmit={handleCreateEventSubmit}
        />
      )}

      {editingEventId && (
        <EditEventPanel
          editingEvent={editingEvent}
          editingEventId={editingEventId}
          editEventForm={editEventForm}
          onClose={() => setEditingEventId(null)}
          onFormChange={setEditEventForm}
          onSubmit={handleEditEventSubmit}
        />
      )}
    </div>
  );
}
