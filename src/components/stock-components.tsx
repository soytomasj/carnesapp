"use client";

import Image from "next/image";
import {
  AlertTriangle,
  type Gauge,
  PackageCheck,
  Scale,
  Trash2,
} from "lucide-react";
import type { CateringEvent, Product, ProductUnit } from "@/lib/catering-data";
import type { StockMovement, StockReservationEntry } from "@/lib/catering-types";
import { formatAmount, formatEventDate } from "@/lib/catering-calculations";
import { roundAmount } from "@/lib/catering-calculations";
import { formatStockMovementDate } from "@/lib/form-utils";
import {
  formatEventNameDisplay,
  formatStockMovementNote,
  getMovementEventInfo,
  getProductVisual,
  getStockBadge,
} from "@/lib/stock-utils";
import { EventStatusBadge } from "@/components/ui/primitives";
import { serviceTypeCopy } from "@/lib/catering-app-constants";

export function StockTableRow({
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

export function StockSummaryCard({
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

export function StockMovementList({
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

export function StockReservationList({
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
