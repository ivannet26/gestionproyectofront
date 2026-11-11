export function themeColor(value?: string | null): string | undefined {
  if (!value) return undefined;
  return /^[a-z]+-(50|[1-9]00|950)$/.test(value)
    ? `var(--color-${value})`
    : value;
}

export function themeIcon(value?: string | null): string | undefined {
  return value
    ?.replace(/Icon$/, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}
