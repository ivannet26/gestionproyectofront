import { formatTaskDate } from "../../utils/taskHierarchy";
import { isBeforeTaskCreation } from "./taskDates";

const shortDate = new Intl.DateTimeFormat("es-PE", {
  month: "short",
  day: "numeric",
});

function formatShortDate(value: string) {
  const parts = shortDate.formatToParts(new Date(`${value}T12:00:00`));
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${month.replace(/\.$/u, "")}. ${day}`;
}

export default function TaskDateValue({
  value,
  short,
  createdAt,
}: {
  value?: string | null;
  short?: boolean;
  createdAt?: string | null;
}) {
  const beforeCreation = isBeforeTaskCreation(value, createdAt);
  const hasError = beforeCreation;
  return (
    <span
      data-before-creation={beforeCreation || undefined}
      className={hasError ? "text-red-600 dark:text-red-400" : undefined}
    >
      {short && value ? formatShortDate(value) : formatTaskDate(value)}
      {beforeCreation && (
        <span className="sr-only">
          {" "}
          · Fecha actual anterior al día de creación
        </span>
      )}
    </span>
  );
}
