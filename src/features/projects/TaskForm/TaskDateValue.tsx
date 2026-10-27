import { formatTaskDate } from "../TaskList/taskHierarchy";
import { isBeforeTaskCreation } from "./taskDates";

export default function TaskDateValue({ value, createdAt }: { value?: string | null; createdAt?: string | null }) {
  const beforeCreation = isBeforeTaskCreation(value, createdAt);
  return <span data-before-creation={beforeCreation || undefined} className={beforeCreation ? "text-red-700" : undefined}>{formatTaskDate(value)}{beforeCreation && <span className="sr-only"> · Fecha actual anterior al día de creación</span>}</span>;
}
