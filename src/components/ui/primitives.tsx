"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, type Gauge } from "lucide-react";
import type { EventStatus } from "@/lib/catering-data";
import { eventStatusCopy, eventStatusStyles } from "@/lib/catering-app-constants";
import {
  formatDateForForm,
  getCalendarDays,
  getCalendarMonthDate,
  normalizeEventDateInput,
} from "@/lib/form-utils";

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

export function TimeField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const hhRef = useRef<HTMLInputElement>(null);
  const mmRef = useRef<HTMLInputElement>(null);
  const parts = value.includes(":") ? value.split(":") : ["", ""];
  const hh = parts[0] ?? "";
  const mm = parts[1] ?? "";

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  function handleHH(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    onChange(`${digits}:${mm}`);
    if (digits.length === 2) mmRef.current?.select();
  }

  function handleMM(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    onChange(`${hh}:${digits}`);
  }

  function blurHH() {
    const raw = hhRef.current?.value ?? hh;
    if (!raw) return;
    const n = clamp(Number(raw), 0, 23);
    const currentMM = mmRef.current?.value ?? mm;
    onChange(`${String(n).padStart(2, "0")}:${currentMM}`);
  }

  function blurMM() {
    const raw = mmRef.current?.value ?? mm;
    if (!raw) return;
    const n = clamp(Number(raw), 0, 59);
    const currentHH = hhRef.current?.value ?? hh;
    onChange(`${currentHH}:${String(n).padStart(2, "0")}`);
  }

  function handleHHKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const n = clamp((Number(hh) + 1) % 24, 0, 23);
      onChange(`${String(n).padStart(2, "0")}:${mm}`);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const n = clamp((Number(hh) - 1 + 24) % 24, 0, 23);
      onChange(`${String(n).padStart(2, "0")}:${mm}`);
    } else if (e.key === ":" || e.key === "Tab") {
      mmRef.current?.select();
    }
  }

  function handleMMKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const n = (Number(mm) + 1) % 60;
      onChange(`${hh}:${String(n).padStart(2, "0")}`);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const n = (Number(mm) - 1 + 60) % 60;
      onChange(`${hh}:${String(n).padStart(2, "0")}`);
    } else if (e.key === "Backspace" && mm === "") {
      e.preventDefault();
      hhRef.current?.select();
    }
  }

  return (
    <div className="time-field">
      <input
        ref={hhRef}
        type="text"
        inputMode="numeric"
        value={hh}
        onChange={(e) => handleHH(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={blurHH}
        onKeyDown={handleHHKey}
        placeholder="00"
        maxLength={2}
        className="time-field-part"
      />
      <span className="time-field-sep">:</span>
      <input
        ref={mmRef}
        type="text"
        inputMode="numeric"
        value={mm}
        onChange={(e) => handleMM(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={blurMM}
        onKeyDown={handleMMKey}
        placeholder="00"
        maxLength={2}
        className="time-field-part"
      />
    </div>
  );
}

export function DateField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedValue = normalizeEventDateInput(value) ?? "";
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getCalendarMonthDate(normalizedValue),
  );

  function openCalendar() {
    setVisibleMonth(getCalendarMonthDate(normalizedValue));
    setIsOpen(true);
    setIsVisible(true);
  }

  function closeCalendar() {
    setIsOpen(false);
  }
  const calendarDays = getCalendarDays(visibleMonth);
  const selectedDay = normalizedValue;
  const monthLabel = new Intl.DateTimeFormat("es-PY", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeCalendar();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeCalendar();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={openCalendar}
        placeholder="dd/mm/aaaa"
        className="field-control pr-10"
        required
      />
      <button
        type="button"
        onClick={openCalendar}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
        aria-label="Abrir calendario"
        title="Abrir calendario"
      >
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
      </button>
      {isVisible && (
        <div
          className={`${isOpen ? "app-popover" : "app-popover-out"} absolute left-0 top-[calc(100%+0.5rem)] z-[70] w-[280px] rounded-[8px] border border-zinc-200 bg-white p-3 shadow-[0_20px_50px_rgba(39,39,42,0.18)]`}
          onAnimationEnd={(event) => {
            if (event.currentTarget === event.target && !isOpen) {
              setIsVisible(false);
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(
                    visibleMonth.getFullYear(),
                    visibleMonth.getMonth() - 1,
                    1,
                  ),
                )
              }
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-sm font-bold capitalize text-zinc-950">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(
                    visibleMonth.getFullYear(),
                    visibleMonth.getMonth() + 1,
                    1,
                  ),
                )
              }
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-zinc-400">
            {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) =>
              day ? (
                <button
                  key={day.isoDate}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onChange(formatDateForForm(day.isoDate));
                    closeCalendar();
                  }}
                  className={`flex h-8 items-center justify-center rounded-[8px] text-sm font-semibold transition ${
                    day.isoDate === selectedDay
                      ? "bg-[#8f2f2b] text-white"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {day.day}
                </button>
              ) : (
                <span key={`empty-${index}`} className="h-8" />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center text-sm font-medium text-zinc-500">
      {text}
    </div>
  );
}
