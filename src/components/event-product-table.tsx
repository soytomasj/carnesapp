"use client";

import Image from "next/image";
import { Fragment, useEffect, useState } from "react";
import {
  ClipboardList,
  type Gauge,
  Refrigerator,
  Trash2,
  Utensils,
} from "lucide-react";
import type { EventReturnLog } from "@/lib/catering-data";
import { formatAmount, type EventNeed } from "@/lib/catering-calculations";
import type { EventProductPlanEntry } from "@/lib/catering-types";
import {
  clampAmount,
  formatAmountInputValue,
  formatShare,
  normalizeOperationalAmountDraft,
  parseAmountInput,
} from "@/lib/form-utils";
import { getProductVisual } from "@/lib/stock-utils";
import { getDraftReturnEntry } from "@/lib/event-utils";

export function EventMetricCard({
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

export function WhatsAppIcon({ className = "" }: { className?: string }) {
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

export function QuantityInput({
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

export function EventProductTable({
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
            const sourcesMap = new Map<string | undefined, EventNeed[]>();
            for (const need of needs) {
              const key = need.source;
              if (!sourcesMap.has(key)) sourcesMap.set(key, []);
              sourcesMap.get(key)!.push(need);
            }
            const sourceGroups = [
              ...[...sourcesMap.entries()].filter(([k]) => k !== undefined),
              ...[...sourcesMap.entries()].filter(([k]) => k === undefined),
            ].map(([source, sourceNeeds]) => ({ source, sourceNeeds }));
            const hasMultipleSources =
              sourceGroups.filter((g) => g.source !== undefined).length > 1;

            return sourceGroups.map(({ source, sourceNeeds }) => {
              const categoryGroups = [
                {
                  id: "frigorifico",
                  label: "Frigorífico",
                  icon: Refrigerator,
                  needs: sourceNeeds.filter(
                    (n) =>
                      n.product.category === "Carnes" ||
                      n.product.category === "Embutidos",
                  ),
                },
                {
                  id: "despensa",
                  label: "Despensa",
                  icon: Utensils,
                  needs: sourceNeeds.filter(
                    (n) => n.product.category === "Despensa",
                  ),
                },
                {
                  id: "inventario",
                  label: "Inventario",
                  icon: ClipboardList,
                  needs: sourceNeeds.filter(
                    (n) => n.product.category === "Inventario",
                  ),
                },
              ].filter((g) => g.needs.length > 0);
              const hasMultipleCategories = categoryGroups.length > 1;

              return (
                <Fragment key={source ?? "__extras__"}>
                  {hasMultipleSources && source && (
                    <tr>
                      <td colSpan={7} className="bg-zinc-100 px-3 py-2.5">
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-900">
                          {source}
                        </p>
                      </td>
                    </tr>
                  )}
                  {categoryGroups.map((group) => {
                    const GroupIcon = group.icon;
                    return (
                      <Fragment key={group.id}>
                        {(hasMultipleCategories || hasMultipleSources) && (
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
                                  onChange={(value) =>
                                    onUpdateReturn(need, value)
                                  }
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
