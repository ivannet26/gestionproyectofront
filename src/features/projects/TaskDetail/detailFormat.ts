export function formatEstimate(minutes: number | null | undefined) {
  if (!minutes) return "Añadir estimación";
  const days = Math.floor(minutes / 480), hours = Math.floor((minutes % 480) / 60), rest = minutes % 60;
  return [days ? `${days} d` : "", hours ? `${hours} h` : "", rest ? `${rest} min` : ""].filter(Boolean).join(" ");
}

/** Explicit whole-unit grammar; gaps, repeated units and bare numbers are rejected. */
export function parseEstimate(input: string): number | null {
  const text = input.normalize("NFC").trim().toLocaleLowerCase("es");
  if (!text) return null;
  if (/^\d+$/.test(text)) throw new Error("Indica una unidad: d, h o min (p. ej. 4 h).");
  const tokens = /(\d+)\s*(días?|dias?|d|horas?|h|minutos?|min)\b/gu;
  const seen = new Set<number>();
  let end = 0, total = 0n;
  for (const token of text.matchAll(tokens)) {
    if (text.slice(end, token.index).trim()) throw new Error("Usa cantidades enteras positivas con d, h o min.");
    const unit = token[2].startsWith("d") ? 480 : token[2].startsWith("h") ? 60 : 1;
    if (seen.has(unit)) throw new Error("Indica cada unidad una sola vez.");
    seen.add(unit);
    total += BigInt(token[1]) * BigInt(unit);
    end = token.index + token[0].length;
  }
  if (!seen.size || text.slice(end).trim() || total < 1n) throw new Error("Usa cantidades enteras positivas con d, h o min.");
  if (total > 2147483647n) throw new Error("La duración no puede superar 2147483647 minutos.");
  return Number(total);
}

export function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function activityValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "sin definir";
  if (Array.isArray(value)) return value.length ? value.map(activityValue).join(", ") : "sin selección";
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    if (typeof item.name === "string") return item.name;
    if (typeof item.first_names === "string") return `${item.first_names} ${item.last_names ?? ""}`.trim();
    if (typeof item.code === "string") return item.code;
    return "dato actualizado";
  }
  return String(value);
}
