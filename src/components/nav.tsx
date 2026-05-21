"use client";

import { Truck } from "lucide-react";
import { sections } from "@/lib/catering-app-constants";
import type { Section, SyncStatus } from "@/lib/catering-types";

function AnimatedFlame() {
  return (
    <div className="bf" aria-hidden="true">
      <div className="bf-glow" />
      <div className="bf-layer bf-a" />
      <div className="bf-layer bf-b" />
      <div className="bf-layer bf-c" />
      <div className="bf-layer bf-d" />
      <div className="bf-spark bf-s1" />
      <div className="bf-spark bf-s2" />
      <div className="bf-spark bf-s3" />
      <div className="bf-spark bf-s4" />
      <div className="bf-spark bf-s5" />
    </div>
  );
}

function Brand({
  compact = false,
  syncStatus,
}: {
  compact?: boolean;
  syncStatus: SyncStatus;
}) {
  const statusCopy: Record<SyncStatus, string> = {
    error: "Sin sincronizar",
    loading: "Cargando datos",
    local: "Modo local",
    saving: "Guardando",
    synced: "Supabase activo",
  };
  const statusStyles: Record<SyncStatus, string> = {
    error: "bg-rose-50 text-rose-700 ring-rose-200",
    loading: "bg-zinc-100 text-zinc-600 ring-zinc-200",
    local: "bg-amber-50 text-amber-800 ring-amber-200",
    saving: "bg-sky-50 text-sky-700 ring-sky-200",
    synced: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  return (
    <div className="flex items-center gap-3">
      <div className="brand-fire-shell">
        <AnimatedFlame />
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-1">
        <p className="truncate text-sm font-bold leading-4 text-zinc-950">
          Koke Al Asador
        </p>
        <p
          className={`w-fit rounded-[8px] px-2 py-0.5 text-[10px] font-semibold leading-4 ring-1 ${statusStyles[syncStatus]}`}
        >
          {compact ? statusCopy[syncStatus].replace("Supabase activo", "Activo") : statusCopy[syncStatus]}
        </p>
      </div>
    </div>
  );
}

const mobileSectionLabels: Record<Section, string> = {
  dashboard: "Inicio",
  frigorifico: "Frigo",
  despensa: "Despensa",
  inventario: "Stock",
  eventos: "Eventos",
};

export function Sidebar({
  activeSection,
  onChange,
  syncStatus,
}: {
  activeSection: Section;
  onChange: (section: Section) => void;
  syncStatus: SyncStatus;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] border-r border-zinc-200/80 bg-white/80 px-5 py-6 shadow-[8px_0_30px_rgba(39,39,42,0.04)] backdrop-blur md:flex md:flex-col">
      <Brand syncStatus={syncStatus} />

      <nav className="mt-8 space-y-2" aria-label="Principal">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              className={`flex w-full items-center gap-3 rounded-[8px] px-3 py-3 text-left text-sm font-semibold transition ${
                isActive
                  ? "bg-[#8f2f2b] text-white shadow-[0_12px_24px_rgba(143,47,43,0.22)]"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {section.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-zinc-200/80 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-zinc-100 text-zinc-500">
            <Truck className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-700">Operación activa</p>
            <p className="text-[11px] text-zinc-400">Asados y catering</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({
  activeSection,
  onChange,
  syncStatus,
}: {
  activeSection: Section;
  onChange: (section: Section) => void;
  syncStatus: SyncStatus;
}) {
  return (
    <>
      <div className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <Brand compact syncStatus={syncStatus} />
      </div>
      <nav
        aria-label="Navegación principal"
        className="mobile-nav-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-5">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onChange(section.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-semibold transition-colors ${
                  isActive ? "text-[#8f2f2b]" : "text-zinc-400"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${isActive ? "text-[#8f2f2b]" : "text-zinc-400"}`}
                  aria-hidden="true"
                />
                <span>{mobileSectionLabels[section.id]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
