import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import Tooltip from "../../../shared/Tooltip";
import type { IconProps } from "../../../shared/icons/types";
const styles = {
  property: "min-w-0 max-w-full",
  cell: "w-full min-h-10 border-transparent !px-1.5 !py-1.5 text-left disabled:bg-transparent disabled:text-neutral-700 disabled:opacity-100",
  trigger:
    "inline-flex min-h-9 w-full max-w-full items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] leading-snug text-neutral-700 cursor-pointer hover:enabled:bg-neutral-100 aria-expanded:bg-neutral-100 aria-expanded:border-neutral-600 aria-invalid:border-red-700 disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-default [&>svg]:shrink-0 [&>span]:max-w-[150px] [&>span]:truncate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 [@media(pointer:coarse)]:min-h-10",
  error:
    "mb-0 mt-1 max-w-[230px] text-xs leading-relaxed text-red-700 [overflow-wrap:anywhere]",
  panel:
    "fixed inset-auto m-0 w-72 max-w-[calc(100vw-24px)] overflow-y-auto overscroll-contain rounded-lg border border-neutral-200 bg-white p-3 text-[13px] text-neutral-900 backdrop:bg-transparent [&_label]:mb-1.5 [&_label]:block [&_label]:text-xs [&_label]:font-medium [&_label]:text-neutral-600 [&_input:not([type=radio])]:w-full [&_input:not([type=radio])]:min-h-9 [&_input:not([type=radio])]:rounded-lg [&_input:not([type=radio])]:border [&_input:not([type=radio])]:border-neutral-200 [&_input:not([type=radio])]:bg-white [&_input:not([type=radio])]:px-2 [&_input:not([type=radio])]:py-1.5 [&_select]:w-full [&_select]:min-h-9 [&_select]:rounded-lg [&_select]:border [&_select]:border-neutral-200 [&_select]:bg-white [&_select]:px-2 [&_select]:py-1.5 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-neutral-700 [&_button:disabled]:opacity-60",
};

interface TaskPropertyProps {
  id: string;
  label: string;
  value: string;
  icon?: ComponentType<IconProps> | ReactNode;
  error?: string;
  disabled?: boolean;
  cell?: boolean;
  compact?: boolean;
  appearance?: "detail" | "toolbar" | "list";
  triggerProps?: Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "draggable" | "onDragStart" | "onDragEnd"
  >;
  selected?: boolean;
  triggers?: { label: string; content: ReactNode }[];
  content?: ReactNode;
  triggerClassName?: string;
  children: (close: () => void) => ReactNode;
}

export default function TaskProperty({
  id,
  label,
  value,
  icon,
  error,
  disabled,
  cell,
  compact,
  appearance,
  triggerProps,
  selected,
  triggers,
  content,
  triggerClassName,
  children,
}: TaskPropertyProps) {
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
      const placeBelow =
        below >= Math.min(element.scrollHeight, 300) || below >= above;
      element.style.maxHeight = `${Math.max(80, placeBelow ? below : above)}px`;
      const bounds = element.getBoundingClientRect();
      element.style.left = `${Math.max(offsetLeft + 12, Math.min(anchor.left, width + offsetLeft - bounds.width - 12))}px`;
      element.style.top = `${Math.max(offsetTop + 12, placeBelow ? anchor.bottom + 6 : anchor.top - bounds.height - 6)}px`;
    }
    place();
    element
      .querySelector<HTMLElement>("[data-panel-focus], input, button, select")
      ?.focus({ preventScroll: true });
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
    document
      .getElementById(
        document.getElementById(panelId)?.dataset.returnFocus ?? id,
      )
      ?.focus();
  }

  return (
    <div className={styles.property}>
      <div
        className={
          triggers ? "flex flex-wrap items-center gap-0.5 px-1.5" : "contents"
        }
      >
        {(
          triggers ?? [
            {
              label: `${label}: ${value}`,
              content: content ?? (
                <>
                  {typeof icon === "function"
                    ? (() => {
                        const IconComp = icon;
                        return <IconComp className="size-4" />;
                      })()
                    : (icon ?? null)}
                  <span>{value}</span>
                </>
              ),
            },
          ]
        ).map((item, index) => (
          <Tooltip
            key={index}
            label={item.label}
            stretch={!compact && !triggers}
          >
            {(description) => (
              <button
                ref={index === 0 ? trigger : undefined}
                id={index === 0 ? id : `${id}-${index}`}
                type="button"
                className={
                  triggerClassName ??
                  (triggers
                    ? "inline-flex cursor-pointer touch-manipulation items-center justify-center rounded-full p-0.5 text-neutral-700 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 aria-disabled:cursor-default [@media(pointer:coarse)]:p-2"
                    : compact
                      ? "inline-flex cursor-pointer touch-manipulation items-center justify-center rounded-lg bg-transparent p-1.5 text-neutral-600 hover:bg-neutral-100 aria-pressed:bg-neutral-100 aria-pressed:text-neutral-800 aria-disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 [@media(pointer:coarse)]:p-3.5"
                      : `${styles.trigger}${cell ? ` ${styles.cell}` : ""}`)
                }
                popoverTarget={disabled ? undefined : panelId}
                disabled={disabled && !triggers && !compact}
                aria-disabled={disabled || undefined}
                aria-label={item.label}
                aria-pressed={compact ? selected : undefined}
                onClick={(event) => {
                  trigger.current = event.currentTarget;
                  if (panel.current)
                    panel.current.dataset.returnFocus = event.currentTarget.id;
                }}
                aria-expanded={open}
                aria-controls={panelId}
                aria-haspopup="dialog"
                aria-invalid={Boolean(error)}
                aria-describedby={`${description}${error ? ` ${id}-error` : ""}`}
              >
                {item.content}
              </button>
            )}
          </Tooltip>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div
        ref={panel}
        id={panelId}
        popover="auto"
        role="dialog"
        aria-label={label}
        className={styles.panel}
        onToggle={(event) =>
          setOpen(event.currentTarget.matches(":popover-open"))
        }
        onBlur={(event) => {
          if (
            event.relatedTarget instanceof Node &&
            !event.currentTarget.contains(event.relatedTarget) &&
            !trigger.current?.contains(event.relatedTarget)
          )
            panel.current?.hidePopover();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
          if (event.key === "Enter" && event.target instanceof HTMLInputElement)
            event.preventDefault();
        }}
      >
        {(!cell || open) && children(close)}
      </div>
    </div>
  );
}
