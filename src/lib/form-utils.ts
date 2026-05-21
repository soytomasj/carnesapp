export function clampAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value * 1000) / 1000);
}

export function parseAmountInput(value: string): number {
  const normalizedValue = normalizeAmountDraft(value);
  const parsedValue = Number(normalizedValue.replace(",", "."));

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return clampAmount(parsedValue);
}

export function formatAmountInputValue(value: number): string {
  return clampAmount(value).toLocaleString("es-PY", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
    useGrouping: false,
  });
}

export function normalizeAmountDraft(value: string): string {
  const normalizedSeparators = value.replace(/\./g, ",");
  const [integerPart = "", ...decimalParts] = normalizedSeparators.split(",");
  const sanitizedInteger = integerPart.replace(/\D/g, "");
  const sanitizedDecimal = decimalParts.join("").replace(/\D/g, "").slice(0, 3);

  if (decimalParts.length > 0) {
    return `${sanitizedInteger},${sanitizedDecimal}`;
  }

  return sanitizedInteger;
}

export function normalizeOperationalAmountDraft(value: string): string {
  const normalizedValue = normalizeAmountDraft(value);

  if (normalizedValue.includes(",")) {
    return normalizedValue;
  }

  if (/^0\d+$/.test(normalizedValue)) {
    return `0,${normalizedValue.slice(1, 4)}`;
  }

  return normalizedValue;
}

export function areJsonEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function formatShare(value: number): string {
  return value.toLocaleString("es-PY", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

export function isValidDateParts(day: string, month: string, year: string): boolean {
  const numericDay = Number(day);
  const numericMonth = Number(month);
  const numericYear = Number(year);
  const date = new Date(`${year}-${month}-${day}T12:00:00`);

  return (
    Number.isInteger(numericDay) &&
    Number.isInteger(numericMonth) &&
    Number.isInteger(numericYear) &&
    date.getFullYear() === numericYear &&
    date.getMonth() + 1 === numericMonth &&
    date.getDate() === numericDay
  );
}

export function normalizeEventDateInput(value: string): string | null {
  const trimmedValue = value.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return isValidDateParts(day, month, year) ? `${year}-${month}-${day}` : null;
  }

  const displayMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmedValue);

  if (!displayMatch) {
    return null;
  }

  const [, rawDay, rawMonth, year] = displayMatch;
  const day = rawDay.padStart(2, "0");
  const month = rawMonth.padStart(2, "0");

  return isValidDateParts(day, month, year) ? `${year}-${month}-${day}` : null;
}

export function normalizeEventTimeInput(value: string): string | undefined {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(value.trim());

  if (!match) {
    return undefined;
  }

  const [, rawHours, rawMinutes] = match;
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return undefined;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDateForForm(value: string): string {
  const normalizedDate = normalizeEventDateInput(value);

  if (!normalizedDate) {
    return value;
  }

  const [year, month, day] = normalizedDate.split("-");
  return `${day}/${month}/${year}`;
}

export function isPastEventDate(value: string): boolean {
  const normalizedDate = normalizeEventDateInput(value);

  if (!normalizedDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(`${normalizedDate}T12:00:00`);
  eventDate.setHours(0, 0, 0, 0);

  return eventDate < today;
}

export function getCalendarMonthDate(value: string): Date {
  const normalizedDate = normalizeEventDateInput(value);

  if (!normalizedDate) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const [year, month] = normalizedDate.split("-");
  return new Date(Number(year), Number(month) - 1, 1);
}

export function getCalendarDays(
  visibleMonth: Date,
): Array<{ day: number; isoDate: string } | null> {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Array<{ day: number; isoDate: string } | null> = [];

  for (let index = 0; index < mondayOffset; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const monthValue = String(month + 1).padStart(2, "0");
    const dayValue = String(day).padStart(2, "0");

    days.push({
      day,
      isoDate: `${year}-${monthValue}-${dayValue}`,
    });
  }

  return days;
}

export function formatStockMovementDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
