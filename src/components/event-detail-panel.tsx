"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Flame,
  PackageCheck,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Scale,
  Truck,
  X,
} from "lucide-react";
import type { CateringEvent, EventReturnLog, Product } from "@/lib/catering-data";
import {
  formatAmount,
  formatEventDate,
  getRecipeGroups,
  type EventNeed,
} from "@/lib/catering-calculations";
import type { EventProductPlanLog } from "@/lib/catering-types";
import { serviceTypeCopy } from "@/lib/catering-app-constants";
import { formatAmountInputValue, normalizeAmountDraft } from "@/lib/form-utils";
import { exportEventToCalendar } from "@/lib/event-utils";
import { formatEventNameDisplay, formatPersonName, getProductVisual } from "@/lib/stock-utils";
import { EventStatusBadge, SectionTitle } from "@/components/ui/primitives";
import { EventMetricCard, EventProductTable, WhatsAppIcon } from "@/components/event-product-table";

export function EventDetailPanel({
  addableProducts,
  detailConsumedTotal,
  detailEstimatedConsumptionTotal,
  detailEvent,
  detailNeeds,
  detailReturnedTotal,
  detailSentTotal,
  detailWhatsappUrl,
  draftProductPlan,
  draftReturnLog,
  hasSavedDraft,
  hasUnsavedDraft,
  onAddProduct,
  onClose,
  onFinalizeEvent,
  onKgPerPersonSave,
  onKgPerPersonBySourceSave,
  onRemoveProduct,
  onSaveDraft,
  onStartEditing,
  onUpdatePlan,
  onUpdateReturn,
}: {
  addableProducts: Product[];
  detailConsumedTotal: number;
  detailEstimatedConsumptionTotal: number;
  detailEvent: CateringEvent;
  detailNeeds: EventNeed[];
  detailReturnedTotal: number;
  detailSentTotal: number;
  detailWhatsappUrl: string;
  draftProductPlan: EventProductPlanLog[string];
  draftReturnLog: EventReturnLog[string];
  hasSavedDraft: boolean;
  hasUnsavedDraft: boolean;
  onAddProduct: (productId: string) => void;
  onClose: () => void;
  onFinalizeEvent: (event: CateringEvent) => void;
  onKgPerPersonSave: (draft: string) => void;
  onKgPerPersonBySourceSave: (source: string, draft: string) => void;
  onRemoveProduct: (productId: string) => void;
  onSaveDraft: () => void;
  onStartEditing: (event: CateringEvent) => void;
  onUpdatePlan: (need: EventNeed, value: string) => void;
  onUpdateReturn: (need: EventNeed, value: string) => void;
}) {
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [kgPerPersonDraft, setKgPerPersonDraft] = useState("");

  useEffect(() => {
    setEditingSource(null);
  }, [detailEvent.id]);

  return (
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
                onClick={() => onStartEditing(detailEvent)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Editar datos
              </button>
              <button
                type="button"
                onClick={() => onFinalizeEvent(detailEvent)}
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
                onClick={onClose}
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
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.02em] text-zinc-500">
                Kg / persona
              </p>
              {(() => {
                const groups = getRecipeGroups(detailEvent.serviceType);
                const isMultiGroup = groups.length > 1;
                if (!isMultiGroup) {
                  const group = groups[0]!;
                  const currentValue = detailEvent.kgPerPerson ?? group.kgPerPerson;
                  const isCustom = detailEvent.kgPerPerson != null;
                  const isEditing = editingSource === group.source;
                  return (
                    <>
                      <div className="mt-2 flex h-9 items-center">
                        {isEditing ? (
                          <form
                            onSubmit={(e) => { e.preventDefault(); onKgPerPersonSave(kgPerPersonDraft); setEditingSource(null); }}
                            className="flex w-full items-center gap-2"
                          >
                            <input
                              type="text" inputMode="decimal" autoFocus
                              value={kgPerPersonDraft}
                              onChange={(e) => setKgPerPersonDraft(normalizeAmountDraft(e.target.value))}
                              onKeyDown={(e) => { if (e.key === "Escape") setEditingSource(null); }}
                              className="h-9 min-w-0 flex-1 rounded-[8px] border border-zinc-200 bg-white px-3 text-lg font-bold text-zinc-950 outline-none transition focus:border-zinc-500"
                            />
                            <button type="submit" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-zinc-950 text-white transition hover:bg-zinc-800" aria-label="Guardar">
                              <Save className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </form>
                        ) : (
                          <div className="flex w-full items-center">
                            <p className="flex-1 text-2xl font-bold text-zinc-950">{formatAmount(currentValue, "kg")}</p>
                            <button type="button" onClick={() => { setKgPerPersonDraft(formatAmountInputValue(currentValue)); setEditingSource(group.source); }} className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-transparent text-zinc-400 transition hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-700" aria-label="Editar kg por persona">
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="mt-auto pt-3">
                        <p className="text-[11px] font-medium text-zinc-400">{isCustom ? "PERSONALIZADO" : "Valor estándar de receta"}</p>
                      </div>
                    </>
                  );
                }
                return (
                  <div className="flex flex-col gap-1">
                    {groups.map((group) => {
                      const currentValue = detailEvent.kgPerPersonBySource?.[group.source] ?? group.kgPerPerson;
                      const isCustom = detailEvent.kgPerPersonBySource?.[group.source] != null;
                      const isEditing = editingSource === group.source;
                      return (
                        <div key={group.source} className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-zinc-50">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                              {group.source}
                            </p>
                            {isEditing ? (
                              <form
                                onSubmit={(e) => { e.preventDefault(); onKgPerPersonBySourceSave(group.source, kgPerPersonDraft); setEditingSource(null); }}
                                className="mt-1 flex items-center gap-1.5"
                              >
                                <input
                                  type="text" inputMode="decimal" autoFocus
                                  value={kgPerPersonDraft}
                                  onChange={(e) => setKgPerPersonDraft(normalizeAmountDraft(e.target.value))}
                                  onKeyDown={(e) => { if (e.key === "Escape") setEditingSource(null); }}
                                  className="h-8 w-full min-w-0 rounded-[6px] border border-zinc-200 bg-white px-2 text-sm font-bold text-zinc-950 outline-none transition focus:border-zinc-500"
                                />
                                <button type="submit" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-zinc-950 text-white transition hover:bg-zinc-800" aria-label="Guardar">
                                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </form>
                            ) : (
                              <p className="text-base font-bold text-zinc-950">{formatAmount(currentValue, "kg")}</p>
                            )}
                            <p className="text-[10px] font-medium text-zinc-400">{isCustom ? "PERSONALIZADO" : "Estándar"}</p>
                          </div>
                          {!isEditing && (
                            <button type="button" onClick={() => { setKgPerPersonDraft(formatAmountInputValue(currentValue)); setEditingSource(group.source); }} className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-transparent text-zinc-300 transition hover:border-zinc-200 hover:bg-white hover:text-zinc-600" aria-label="Editar kg por persona">
                              <Pencil className="h-3 w-3" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
                                  onAddProduct(product.id);
                                  setIsAddingProduct(false);
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
                    onClick={onSaveDraft}
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
                onRemoveProduct={onRemoveProduct}
                onUpdatePlan={onUpdatePlan}
                onUpdateReturn={onUpdateReturn}
                returnLog={draftReturnLog}
                serviceLabel={serviceTypeCopy[detailEvent.serviceType]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
