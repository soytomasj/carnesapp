"use client";

import Image from "next/image";
import { AlertTriangle, CalendarDays, Scale, Truck } from "lucide-react";
import type { CateringEvent } from "@/lib/catering-data";
import {
  formatAmount,
  formatEventDate,
  roundAmount,
} from "@/lib/catering-calculations";
import { serviceTypeCopy } from "@/lib/catering-app-constants";
import { formatEventNameDisplay } from "@/lib/stock-utils";
import { StatCard } from "@/components/ui/primitives";

export function DashboardSection({
  eventsCount,
  nextEvent,
  nextPreparationTotal,
  stockTotal,
}: {
  eventsCount: number;
  nextEvent?: CateringEvent;
  nextPreparationTotal: number;
  stockTotal: number;
}) {
  return (
    <div className="space-y-6">
      <section className="app-card-enter relative min-h-[260px] overflow-hidden rounded-[8px] border border-zinc-900/10 bg-zinc-950 shadow-[0_24px_70px_rgba(39,39,42,0.18)]">
        <Image
          src="/asado-dashboard-hero.png"
          alt="Bandeja premium de asado para catering"
          fill
          priority
          sizes="(min-width: 768px) 1180px, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.88),rgba(9,9,11,0.62)_42%,rgba(9,9,11,0.12))]" />
        <div className="relative flex min-h-[260px] max-w-2xl flex-col justify-end p-5 text-white sm:p-8">
          <div className="mb-5 flex w-fit items-center gap-2 rounded-[8px] border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur">
            Servicio listo para planificar
          </div>
          <h1 className="max-w-xl text-3xl font-bold leading-tight sm:text-4xl">
            Próximo asado bajo control antes de salir al evento.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-200 sm:text-base">
            Stock actual, faltantes y retorno preventivo preparados para una
            operación prolija.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          value={nextEvent ? formatEventNameDisplay(nextEvent.name) : "Agenda libre"}
          detail={
            nextEvent
              ? `${formatEventDate(nextEvent.date)} · ${nextEvent.people} personas · ${serviceTypeCopy[nextEvent.serviceType]}`
              : "Sin eventos cargados"
          }
          tone="bg-[#eef6f7] text-[#2c6770]"
        />
      </section>
    </div>
  );
}
