"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
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

export function StockDetailModal({
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
