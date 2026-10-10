import { useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import TaskIcon from "./TaskIcon";
import type { TaskIconName } from "./TaskIcon";
import styles from "./TaskProperty.module.css";

interface TaskPropertyProps {
  id: string;
  label: string;
  value: string;
  icon: TaskIconName;
  error?: string;
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
}

export default function TaskProperty({ id, label, value, icon, error, disabled, children }: TaskPropertyProps) {
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const element = panel.current;
    const button = trigger.current;
    if (!open || !element || !button) return;
    function place() {
      if (!element || !button) return;
      const anchor = button.getBoundingClientRect();
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const offsetLeft = viewport?.offsetLeft ?? 0;
      const below = height + offsetTop - anchor.bottom - 18;
      const above = anchor.top - offsetTop - 18;
      const placeBelow = below >= Math.min(element.scrollHeight, 300) || below >= above;
      element.style.maxHeight = `${Math.max(80, placeBelow ? below : above)}px`;
      const bounds = element.getBoundingClientRect();
      element.style.left = `${Math.max(offsetLeft + 12, Math.min(anchor.left, width + offsetLeft - bounds.width - 12))}px`;
      element.style.top = `${Math.max(offsetTop + 12, placeBelow ? anchor.bottom + 6 : anchor.top - bounds.height - 6)}px`;
    }
    place();
    element.querySelector<HTMLElement>("[data-panel-focus], input, button, select")?.focus({ preventScroll: true });
    const observer = new ResizeObserver(place);
    observer.observe(element);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [open]);

  function close() {
    document.getElementById(panelId)?.hidePopover();
    document.getElementById(id)?.focus();
  }

  return <div className={styles.property}>
    <button ref={trigger} id={id} type="button" className={styles.trigger} popoverTarget={panelId}
      disabled={disabled} aria-label={`${label}: ${value}`} title={`${label}: ${value}`}
      aria-expanded={open} aria-controls={panelId} aria-haspopup="dialog"
      aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}>
      <TaskIcon name={icon} /><span>{value}</span>
    </button>
    {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
    <div ref={panel} id={panelId} popover="auto" role="dialog" aria-label={label} className={styles.panel}
      onToggle={(event) => setOpen(event.currentTarget.matches(":popover-open"))}
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)
          && !trigger.current?.contains(event.relatedTarget)) panel.current?.hidePopover();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
      }}>
      {children(close)}
    </div>
  </div>;
}
