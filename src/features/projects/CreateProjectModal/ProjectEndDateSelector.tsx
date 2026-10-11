import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import TaskProperty from "../TaskForm/TaskProperty";
import TaskIcon from "../TaskForm/TaskIcon";
import styles from "./ProjectEndDateSelector.module.css";

interface ProjectEndDateSelectorProps {
  value: string;
  min?: string;
  error?: string;
  onChange: (value: string) => void;
}

const shortDate = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" });
const fullDate = new Intl.DateTimeFormat("es-PE", { dateStyle: "full" });
const monthName = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" });
const weekdays = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function dateKey(date: Date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function Calendar({ value, min, onChange, close }: ProjectEndDateSelectorProps & { close: () => void }) {
  const today = dateKey(new Date());
  const initial = value || min || today;
  const [month, setMonth] = useState(() => new Date(readDate(initial).getFullYear(), readDate(initial).getMonth(), 1, 12));
  const [focusedDate, setFocusedDate] = useState(initial);
  const grid = useRef<HTMLDivElement>(null);
  const first = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay(), 12);
  const days = Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + index, 12));
  const previousEnd = dateKey(new Date(month.getFullYear(), month.getMonth(), 0, 12));

  function changeMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1, 12);
    setMonth(next);
    const firstAllowed = min && dateKey(next) < min ? min : dateKey(next);
    setFocusedDate(firstAllowed);
  }

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLButtonElement) || !event.target.dataset.date) return;
    const current = readDate(event.target.dataset.date);
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
      Home: -current.getDay(), End: 6 - current.getDay() };
    if (!(event.key in offsets) && event.key !== "PageUp" && event.key !== "PageDown") return;
    event.preventDefault();
    const next = new Date(current);
    if (event.key in offsets) next.setDate(next.getDate() + offsets[event.key]);
    else {
      next.setDate(1);
      next.setMonth(next.getMonth() + (event.key === "PageUp" ? -1 : 1));
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(current.getDate(), lastDay));
    }
    const key = dateKey(next);
    if (min && key < min) return;
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1, 12));
    setFocusedDate(key);
    requestAnimationFrame(() => grid.current?.querySelector<HTMLElement>(`[data-date="${key}"]`)?.focus());
  }

  return <div className={styles.calendar} tabIndex={-1} data-panel-focus
    onFocus={(event) => {
      if (event.target !== event.currentTarget) return;
      const day = grid.current?.querySelector<HTMLElement>(`[data-date="${focusedDate}"]:not(:disabled)`)
        ?? grid.current?.querySelector<HTMLElement>("[data-date]:not(:disabled)");
      day?.focus({ preventScroll: true });
    }}>
    <p className={styles.caption}>Fecha de fin estimada <span>(opcional)</span></p>
    <div className={styles.heading}>
      <button type="button" aria-label="Mes anterior" disabled={Boolean(min && previousEnd < min)}
        onClick={() => changeMonth(-1)}><TaskIcon name="previous" /></button>
      <strong aria-live="polite">{monthName.format(month)}</strong>
      <button type="button" aria-label="Mes siguiente" onClick={() => changeMonth(1)}><TaskIcon name="next" /></button>
    </div>
    <div ref={grid} role="grid" aria-label={monthName.format(month)} onKeyDown={navigate}>
      <div role="row" className={styles.week}>
        {weekdays.map((day) => <span key={day} role="columnheader" aria-label={day}>{day.slice(0, 2)}</span>)}
      </div>
      {Array.from({ length: 6 }, (_, week) => <div key={week} role="row" className={styles.week}>
        {days.slice(week * 7, week * 7 + 7).map((date) => {
          const key = dateKey(date);
          const disabled = Boolean(min && key < min);
          return <button type="button" key={key} role="gridcell" data-date={key}
            className={`${styles.day}${date.getMonth() !== month.getMonth() ? ` ${styles.outside}` : ""}`}
            aria-label={fullDate.format(date)} aria-selected={value === key}
            aria-current={today === key ? "date" : undefined} disabled={disabled}
            tabIndex={key === focusedDate && !disabled ? 0 : -1}
            data-panel-focus={key === focusedDate && !disabled ? "" : undefined}
            onFocus={(event) => {
              setFocusedDate(key);
              event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
            }} onClick={() => { onChange(key); close(); }}>
            {date.getDate()}
          </button>;
        })}
      </div>)}
    </div>
    <div className={styles.actions}>
      <button type="button" disabled={!value} onClick={() => { onChange(""); close(); }}>Quitar fecha</button>
      <button type="button" onClick={close}>Listo</button>
    </div>
  </div>;
}

export default function ProjectEndDateSelector(props: ProjectEndDateSelectorProps) {
  const value = props.value ? shortDate.format(readDate(props.value)) : "Fecha de fin estimada";
  return <TaskProperty id="project-end-date" label="Fecha de fin estimada (opcional)" value={value}
    icon="date" error={props.error}>
    {(close) => <Calendar {...props} close={close} />}
  </TaskProperty>;
}
