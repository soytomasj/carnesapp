"use client";

import Image from "next/image";
import { Fragment, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  type Gauge,
  Minus,
  PackagePlus,
  Plus,
  Save,
  ShoppingCart,
} from "lucide-react";
import type { CateringEvent, EventReturnLog, Product } from "@/lib/catering-data";
import type {
  EventProductPlanLog,
  StockFeedback,
  StockForm,
  StockMovement,
  StockProductGroup,
  StockReservationEntry,
} from "@/lib/catering-types";
import { formatAmount, roundAmount } from "@/lib/catering-calculations";
import { clampAmount, normalizeAmountDraft, parseAmountInput } from "@/lib/form-utils";
import { getEventOperationalNeeds, getStoredReturnEntry } from "@/lib/event-utils";
import { getProductVisual, groupStockProducts } from "@/lib/stock-utils";
import { stockProviders } from "@/lib/catering-app-constants";
import { useBodyScrollLock } from "@/lib/catering-normalize";
import { HeaderBlock, Panel, SectionTitle } from "@/components/ui/primitives";
import { StockDetailModal } from "@/components/stock-detail-modal";
import { StockTableRow } from "@/components/stock-components";

export function FridgeSection({
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
