"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Scale,
  Trophy,
  Truck,
  Users,
} from "lucide-react";
import type { CateringEvent } from "@/lib/catering-data";
import type { StockMovement } from "@/lib/catering-types";
import {
  formatAmount,
  formatEventDate,
  roundAmount,
} from "@/lib/catering-calculations";
import { serviceTypeCopy } from "@/lib/catering-app-constants";
import { formatEventNameDisplay } from "@/lib/stock-utils";
import { StatCard } from "@/components/ui/primitives";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function DashboardSection({
  eventsCount,
  nextEvent,
  nextPreparationTotal,
  stockTotal,
  events,
  stockMovements,
  meatProductIds,
}: {
  eventsCount: number;
  nextEvent?: CateringEvent;
  nextPreparationTotal: number;
  stockTotal: number;
  events: CateringEvent[];
  stockMovements: StockMovement[];
  meatProductIds: string[];
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const meatIdSet = useMemo(() => new Set(meatProductIds), [meatProductIds]);

  const yearlyStats = useMemo(() => {
    const finalized = events.filter(
      (e) =>
        e.status === "finalizado" &&
        new Date(e.date).getFullYear() === currentYear,
    );
    const finalizedIds = new Set(finalized.map((e) => e.id));
    const kilos = stockMovements
      .filter(
        (m) =>
          m.type === "salida" &&
          m.eventId &&
          finalizedIds.has(m.eventId) &&
          meatIdSet.has(m.productId),
      )
      .reduce((sum, m) => sum + m.amount, 0);
    const personas = finalized.reduce((sum, e) => sum + e.people, 0);
    return { kilos, personas, eventos: finalized.length };
  }, [events, stockMovements, meatIdSet, currentYear]);

  const monthlyStats = useMemo(() => {
    const finalized = events.filter((e) => {
      const d = new Date(e.date);
      return (
        e.status === "finalizado" &&
        d.getFullYear() === currentYear &&
        d.getMonth() === selectedMonth
      );
    });
    const finalizedIds = new Set(finalized.map((e) => e.id));
    const kilos = stockMovements
      .filter(
        (m) =>
          m.type === "salida" &&
          m.eventId &&
          finalizedIds.has(m.eventId) &&
          meatIdSet.has(m.productId),
      )
      .reduce((sum, m) => sum + m.amount, 0);
    const personas = finalized.reduce((sum, e) => sum + e.people, 0);
    return { kilos, personas, eventos: finalized.length };
  }, [events, stockMovements, meatIdSet, selectedMonth, currentYear]);

  function prevMonth() {
    setSelectedMonth((m) => (m === 0 ? 11 : m - 1));
  }
  function nextMonth() {
    setSelectedMonth((m) => (m === 11 ? 0 : m + 1));
  }

  return (
    <div className="space-y-8">
      {/* Hero — Yearly KPIs */}
      <section className="app-card-enter relative min-h-[300px] overflow-hidden rounded-[8px] border border-zinc-900/10 bg-zinc-950 shadow-[0_24px_70px_rgba(39,39,42,0.18)]">
        <Image
          src="/asado-dashboard-hero.png"
          alt="Bandeja premium de asado para catering"
          fill
          priority
          sizes="(min-width: 768px) 1180px, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.92),rgba(9,9,11,0.72)_50%,rgba(9,9,11,0.18))]" />
        <div className="relative flex min-h-[300px] flex-col justify-between p-5 sm:p-8">
          <div>
            <div className="mb-3 flex w-fit items-center gap-2 rounded-[8px] border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              Tus números este año
            </div>
            <h1 className="max-w-lg text-2xl font-bold leading-tight text-white sm:text-3xl">
              Llevando el mejor asado a las familias paraguayas.
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Este año hemos compartido:
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <div className="flex items-center gap-1.5 rounded-[8px] border border-white/15 bg-white/10 px-2.5 py-3 backdrop-blur-sm sm:gap-2.5 sm:px-4">
              <Flame className="h-4 w-4 shrink-0 text-orange-400" />
              <div>
                <p className="text-base font-bold leading-none text-white sm:text-xl">
                  {yearlyStats.kilos > 0
                    ? roundAmount(yearlyStats.kilos).toLocaleString("es-PY", {
                        maximumFractionDigits: 0,
                      })
                    : "—"}{" "}
                  kg
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  de carne cocinada
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-[8px] border border-white/15 bg-white/10 px-2.5 py-3 backdrop-blur-sm sm:gap-2.5 sm:px-4">
              <Users className="h-4 w-4 shrink-0 text-sky-400" />
              <div>
                <p className="text-base font-bold leading-none text-white sm:text-xl">
                  {yearlyStats.personas > 0
                    ? yearlyStats.personas.toLocaleString("es-PY")
                    : "—"}
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  personas servidas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-[8px] border border-white/15 bg-white/10 px-2.5 py-3 backdrop-blur-sm sm:gap-2.5 sm:px-4">
              <Trophy className="h-4 w-4 shrink-0 text-yellow-400" />
              <div>
                <p className="text-base font-bold leading-none text-white sm:text-xl">
                  {yearlyStats.eventos > 0 ? yearlyStats.eventos : "—"}
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  eventos exitosos
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Monthly breakdown */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
            Rendimiento mensual
          </h2>
          <div className="inline-flex overflow-hidden rounded-[8px] border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(39,39,42,0.07)]">
            <button
              onClick={prevMonth}
              className="flex w-10 items-center justify-center border-r border-zinc-100 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="flex w-[160px] select-none items-center justify-center gap-2 px-4 py-2.5">
              <span className="text-sm font-semibold text-zinc-900">
                {MONTHS[selectedMonth]}
              </span>
              <span className="text-sm text-zinc-400">{currentYear}</span>
            </div>
            <button
              onClick={nextMonth}
              className="flex w-10 items-center justify-center border-l border-zinc-100 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-800"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {monthlyStats.eventos > 0 ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={Flame}
              label="Kg cocinados"
              value={roundAmount(monthlyStats.kilos).toLocaleString("es-PY", {
                maximumFractionDigits: 1,
              })}
              detail="Carnes y embutidos"
              tone="bg-[#fff5ee] text-[#a35612]"
            />
            <StatCard
              icon={Users}
              label="Personas servidas"
              value={monthlyStats.personas.toLocaleString("es-PY")}
              detail="Invitados en eventos finalizados"
              tone="bg-[#eef6f7] text-[#2c6770]"
            />
            <StatCard
              icon={Trophy}
              label="Eventos realizados"
              value={monthlyStats.eventos.toString()}
              detail="Servicios completados"
              tone="bg-[#edf7f1] text-[#2f6b4f]"
            />
          </div>
        ) : (
          <div className="flex min-h-[120px] items-center justify-center rounded-[8px] border border-dashed border-zinc-200 bg-white/60 text-sm text-zinc-400">
            Sin eventos registrados en {MONTHS[selectedMonth].toLowerCase()}
          </div>
        )}
      </section>

      {/* Operational — upcoming */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Lo que viene
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={CalendarDays}
            label="Eventos próximos"
            value={eventsCount.toString()}
            detail="Servicios pendientes"
            tone="bg-[#edf7f1] text-[#2f6b4f]"
          />
          <StatCard
            icon={Scale}
            label="Stock disponible"
            value={roundAmount(stockTotal).toLocaleString("es-PY", {
              maximumFractionDigits: 1,
            })}
            detail="Stock total en kg"
            tone="bg-zinc-100 text-zinc-700"
          />
          <StatCard
            icon={AlertTriangle}
            label="Kg a preparar"
            value={formatAmount(nextPreparationTotal, "kg")}
            detail="Para el próximo evento"
            tone="bg-zinc-100 text-[#a35612]"
          />
          <StatCard
            icon={Truck}
            label="Próximo evento"
            smallValue
            value={
              nextEvent
                ? formatEventNameDisplay(nextEvent.name)
                : "Agenda libre"
            }
            detail={
              nextEvent
                ? `${formatEventDate(nextEvent.date)} · ${nextEvent.people} personas · ${serviceTypeCopy[nextEvent.serviceType]}`
                : "Sin eventos cargados"
            }
            tone="bg-[#eef6f7] text-[#2c6770]"
          />
        </div>
      </section>
    </div>
  );
}
