import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
const styles = {
  modal:
    "m-auto max-h-[90dvh] w-[min(94vw,690px)] overflow-y-auto overscroll-contain rounded-lg bg-white p-0 text-neutral-900 backdrop:bg-neutral-900/50",
  wide: "w-[min(94vw,760px)] max-h-[92dvh]",
  taskComposer:
    "w-[min(800px,calc(100vw-32px))] max-h-[calc(100dvh-48px)] overflow-hidden open:flex open:flex-col max-sm:w-[calc(100vw-16px)] max-sm:max-h-[calc(100dvh-16px)]",
  projectComposer:
    "w-[min(800px,calc(100vw-32px))] max-h-[calc(100dvh-48px)] overflow-hidden open:flex open:flex-col max-sm:w-[calc(100vw-16px)] max-sm:max-h-[calc(100dvh-16px)]",
  statusComposer:
    "w-[min(800px,calc(100vw-32px))]! h-[min(760px,calc(100dvh-48px))] max-h-none! overflow-x-hidden! overflow-y-hidden! rounded-xl open:flex open:flex-col max-sm:w-[calc(100vw-16px)]! max-sm:h-[calc(100dvh-16px)]",
  header:
    "sticky top-0 z-2 flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-6 py-3 max-sm:px-4 [&_h2]:m-0 [&_h2]:text-[15px] [&_h2]:[&_h2]:break-words",
  close:
    "min-h-8 min-w-8 rounded-lg border-0 bg-neutral-50 text-xl text-neutral-900 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700",
};

interface ModalProps {
  title: string;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  taskComposer?: boolean;
  projectComposer?: boolean;
  statusComposer?: boolean;
  taskDetail?: boolean;
  children: ReactNode;
}

export default function Modal({
  title,
  onClose,
  busy = false,
  wide = false,
  taskComposer = false,
  projectComposer = false,
  statusComposer = false,
  taskDetail = false,
  children,
}: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement;
    element.showModal();
    element.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={`${styles.modal}${wide ? ` ${styles.wide}` : ""}${taskComposer ? ` ${styles.taskComposer}` : ""}${projectComposer ? ` ${styles.projectComposer}` : ""}${statusComposer ? ` ${styles.statusComposer}` : ""}${taskDetail ? " w-[min(1800px,calc(100vw-24px))]! h-[calc(100dvh-24px)] max-h-none! overflow-hidden! rounded-xl open:flex open:flex-col max-sm:w-[calc(100vw-12px)]! max-sm:h-[calc(100dvh-12px)]" : ""}`}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (
          (taskComposer || projectComposer || statusComposer || taskDetail) &&
          event.key === "Tab" &&
          event.target instanceof HTMLElement &&
          event.target.closest("dialog") === event.currentTarget
        ) {
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button, input, textarea, select, a[href], summary, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter(
            (element) =>
              !element.matches(":disabled") &&
              element.getClientRects().length > 0 &&
              element.closest("dialog") === event.currentTarget,
          );
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
        if (
          event.key === "Escape" &&
          !event.defaultPrevented &&
          event.currentTarget.parentElement?.closest("dialog[open]") &&
          event.target instanceof HTMLElement &&
          event.target.closest("dialog") === event.currentTarget
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) onClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) onClose();
      }}
    >
      {taskDetail ? <h2 id={titleId} className="sr-only">{title}</h2> : <header className={styles.header}>
        <h2 id={titleId}>{title}</h2>
        <button
          className={styles.close}
          type="button"
          aria-label="Cerrar modal"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </header>}
      {children}
    </dialog>
  );
}
