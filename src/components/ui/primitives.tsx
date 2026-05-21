"use client";

import { type Gauge } from "lucide-react";
import type { EventStatus } from "@/lib/catering-data";
import { eventStatusCopy, eventStatusStyles } from "@/lib/catering-app-constants";

export { TimeField, DateField } from "@/components/ui/date-time-fields";

export function StatCard({
  detail,
  icon: Icon,
  label,
  smallValue,
  tone,
  value,
}: {
  detail: string;
  icon: typeof Gauge;
  label: string;
  smallValue?: boolean;
  tone: string;
  value: string;
}) {
  return (
    <article className="app-card-enter flex min-h-[158px] flex-col rounded-[8px] border border-zinc-200 bg-white p-5 shadow-[0_18px_40px_rgba(39,39,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-500">{label}</p>
          <p className={`mt-3 font-bold text-zinc-950 ${smallValue ? "line-clamp-2 text-base leading-snug" : "truncate text-3xl"}`}>{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-auto truncate pt-4 text-xs font-medium text-zinc-500">
        {detail}
      </p>
    </article>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`app-card-enter rounded-[8px] border border-zinc-200 bg-white p-5 shadow-[0_18px_48px_rgba(39,39,42,0.06)] sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function HeaderBlock({
  eyebrow,
  subtitle,
  title,
}: {
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
  return (
    <header className="app-section-enter flex flex-col gap-2">
      <p className="text-xs font-bold uppercase text-[#8f2f2b]">{eyebrow}</p>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            {subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}

export function SectionTitle({
  icon: Icon,
  subtitle,
  title,
}: {
  icon: typeof Gauge;
  subtitle?: string;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-zinc-100 text-zinc-800">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-zinc-950">{title}</h2>
        {subtitle && (
          <p className="mt-1 truncate text-sm text-zinc-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function EventStatusBadge({
  inverted = false,
  status,
}: {
  inverted?: boolean;
  status: EventStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[8px] border px-2.5 py-1 text-xs font-semibold ${
        inverted ? "border-white/20 bg-white/10 text-white" : eventStatusStyles[status]
      }`}
    >
      {eventStatusCopy[status]}
    </span>
  );
}

export function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center text-sm font-medium text-zinc-500">
      {text}
    </div>
  );
}
