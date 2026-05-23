"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Minus,
  PackageCheck,
  PackagePlus,
  Pencil,
  Save,
  X,
} from "lucide-react";
import type { CateringEvent, Product } from "@/lib/catering-data";
import type { StockMovement, StockReservationEntry } from "@/lib/catering-types";
import { formatAmount, roundAmount } from "@/lib/catering-calculations";
import { formatAmountInputValue, normalizeAmountDraft } from "@/lib/form-utils";
import { getProductVisual } from "@/lib/stock-utils";
import { EventMetricCard } from "@/components/event-product-table";
import {
  StockMovementList,
  StockReservationList,
} from "@/components/stock-components";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];


function getMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function StockDetailModal({
  events,
  movements,
  onClose,
  onDeleteStockMovement,
  onSetManualProductStock,
  product,
  reservedEntries,
}: {
  events: CateringEvent[];
  movements: StockMovement[];
  onClose: () => void;
  onDeleteStockMovement: (movementId: string) => void;
  onSetManualProductStock: (productId: string, value: string) => void;
  product: Product;
  reservedEntries: StockReservationEntry[];
}) {
  const visual = getProductVisual(product);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [isEditingManualStock, setIsEditingManualStock] = useState(false);
  const [manualStockValue, setManualStockValue] = useState(
    formatAmountInputValue(product.currentStock),
  );
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const availableMonths = useMemo(() => {
    const seen = new Set<string>();
    const months: { year: number; month: number }[] = [];

    function addMonth(year: number, month: number) {
      const key = getMonthKey(year, month);
      if (!seen.has(key)) {
        seen.add(key);
        months.push({ year, month });
      }
    }

    addMonth(currentYear, currentMonth);

    for (const m of movements) {
      const d = new Date(m.date);
      addMonth(d.getFullYear(), d.getMonth() + 1);
    }

    for (const e of reservedEntries) {
      const d = new Date(e.eventDate);
      addMonth(d.getFullYear(), d.getMonth() + 1);
    }

    return months.sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month,
    );
  }, [movements, reservedEntries, currentYear, currentMonth]);

  const selectedKey = getMonthKey(selectedYear, selectedMonth);
  const isCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonth;

  // Stock at end of selected month = currentStock minus net movements that happened after the month
  const stockAtEndOfMonth = useMemo(() => {
    const adjustment = movements
      .filter((m) => {
        const d = new Date(m.date);
        const y = d.getFullYear();
        const mo = d.getMonth() + 1;
        return y > selectedYear || (y === selectedYear && mo > selectedMonth);
      })
      .reduce(
        (sum, m) => (m.type === "entrada" ? sum + m.amount : sum - m.amount),
        0,
      );
    return roundAmount(product.currentStock - adjustment);
  }, [movements, product.currentStock, selectedYear, selectedMonth]);

  const monthMovements = useMemo(
    () =>
      movements.filter((m) => {
        const d = new Date(m.date);
        return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
      }),
    [movements, selectedYear, selectedMonth],
  );

  const monthIncoming = monthMovements.filter((m) => m.type === "entrada");
  const monthOutgoing = monthMovements.filter((m) => m.type === "salida");

  const monthReservedEntries = useMemo(
    () =>
      reservedEntries.filter((e) => {
        const d = new Date(e.eventDate);
        return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
      }),
    [reservedEntries, selectedYear, selectedMonth],
  );

  const monthReservedStock = roundAmount(
    monthReservedEntries.reduce((sum, e) => sum + e.amount, 0),
  );
  const monthAvailable = roundAmount(Math.max(stockAtEndOfMonth - monthReservedStock, 0));
  const monthMissing = roundAmount(Math.max(monthReservedStock - stockAtEndOfMonth, 0));

  useEffect(() => {
    setManualStockValue(formatAmountInputValue(product.currentStock));
  }, [product.currentStock]);


  function handleManualStockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSetManualProductStock(product.id, manualStockValue);
    setIsEditingManualStock(false);
  }

  function selectPrevMonth() {
    const idx = availableMonths.findIndex(
      (m) => m.year === selectedYear && m.month === selectedMonth,
    );
    if (idx > 0) {
      const prev = availableMonths[idx - 1];
      setSelectedYear(prev.year);
      setSelectedMonth(prev.month);
    }
  }

  function selectNextMonth() {
    const idx = availableMonths.findIndex(
      (m) => m.year === selectedYear && m.month === selectedMonth,
    );
    if (idx < availableMonths.length - 1) {
      const next = availableMonths[idx + 1];
      setSelectedYear(next.year);
      setSelectedMonth(next.month);
    }
  }

  const selectedIdx = availableMonths.findIndex(
    (m) => m.year === selectedYear && m.month === selectedMonth,
  );
  const hasPrev = selectedIdx > 0;
  const hasNext = selectedIdx < availableMonths.length - 1;

  const stockCardDetail = isCurrentMonth
    ? "Stock total registrado"
    : `Al cierre de ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

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
          {/* Month navigator */}
          <div className="mb-4 flex justify-center">
            <div className="inline-flex overflow-hidden rounded-[8px] border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(39,39,42,0.07)]">
              <button
                type="button"
                onClick={selectPrevMonth}
                disabled={!hasPrev}
                className="flex w-10 items-center justify-center border-r border-zinc-100 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-25"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              <div className="flex w-[160px] select-none items-center justify-center gap-2 px-4 py-2.5">
                <span className="text-sm font-semibold text-zinc-900">
                  {MONTH_NAMES[selectedMonth - 1]}
                </span>
                <span className="text-sm text-zinc-400">{selectedYear}</span>
              </div>

              <button
                type="button"
                onClick={selectNextMonth}
                disabled={!hasNext}
                className="flex w-10 items-center justify-center border-l border-zinc-100 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-25"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative flex flex-col rounded-[8px] border border-zinc-200 bg-white p-4 shadow-[0_8px_24px_rgba(39,39,42,0.04)]">
              {isCurrentMonth && (
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
              )}
              <p className="pr-9 text-[11px] font-bold uppercase tracking-[0.02em] text-zinc-500">
                Stock
              </p>
              {isCurrentMonth && isEditingManualStock ? (
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
                  {formatAmount(stockAtEndOfMonth, product.unit)}
                </p>
              )}
              <p className="mt-auto pt-3 text-[11px] font-medium text-zinc-400">
                {stockCardDetail}
              </p>
            </div>
            <EventMetricCard
              label="Reservado"
              value={formatAmount(monthReservedStock, product.unit)}
              icon={CalendarDays}
              tone="bg-[#fef3ee] text-[#a35612]"
              detail="Comprometido en eventos"
            />
            <EventMetricCard
              label="Disponible"
              value={formatAmount(monthAvailable, product.unit)}
              icon={PackageCheck}
              tone="bg-[#edf7f1] text-[#2f6b4f]"
              detail="Listo para despacho"
            />
            <EventMetricCard
              label="Falta"
              value={formatAmount(monthMissing, product.unit)}
              icon={AlertTriangle}
              tone={
                monthMissing > 0
                  ? "bg-red-50 text-red-700"
                  : "bg-zinc-100 text-zinc-500"
              }
              detail="Necesario para cubrir reservas"
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <StockMovementList
              amountTone="border-emerald-200 bg-emerald-50 text-emerald-900"
              emptyText="Sin ingresos en este mes."
              events={events}
              icon={PackagePlus}
              items={monthIncoming}
              onDeleteMovement={onDeleteStockMovement}
              title="Entró"
              tone="text-emerald-700"
              unit={product.unit}
            />
            <StockMovementList
              amountTone="border-red-200 bg-red-50 text-red-800"
              emptyText="Sin salidas en este mes."
              events={events}
              icon={Minus}
              items={monthOutgoing}
              onDeleteMovement={onDeleteStockMovement}
              title="Salió"
              tone="text-red-700"
              unit={product.unit}
            />
            <StockReservationList
              emptyText="Sin reservas para este mes."
              entries={monthReservedEntries}
              title="Reservado"
              unit={product.unit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
