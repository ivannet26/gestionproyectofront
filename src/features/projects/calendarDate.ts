export function calendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Fecha de calendario no válida.");
  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  if (year < 1 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    throw new Error("Fecha de calendario no válida.");
  return date;
}

export function calendarDateKey(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error("Fecha de calendario no válida.");
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addCalendarDays(value: string, days: number): string {
  if (!Number.isInteger(days)) throw new Error("El desplazamiento debe indicar días enteros.");
  const date = calendarDate(value);
  date.setDate(date.getDate() + days);
  return calendarDateKey(date);
}
