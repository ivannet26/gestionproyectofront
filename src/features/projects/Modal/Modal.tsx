import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import styles from "./Modal.module.css";

interface ModalProps {
  title: string;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  taskComposer?: boolean;
  projectComposer?: boolean;
  children: ReactNode;
}

export default function Modal({ title, onClose, busy = false, wide = false, taskComposer = false, projectComposer = false, children }: ModalProps) {
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
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={`${styles.modal}${wide ? ` ${styles.wide}` : ""}${taskComposer ? ` ${styles.taskComposer}` : ""}${projectComposer ? ` ${styles.projectComposer}` : ""}`}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if ((taskComposer || projectComposer) && event.key === "Tab" && event.target instanceof HTMLElement
          && event.target.closest("dialog") === event.currentTarget) {
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            'button, input, textarea, select, a[href], summary, [tabindex]:not([tabindex="-1"])',
          )).filter((element) => !element.matches(":disabled") && element.getClientRects().length > 0
            && element.closest("dialog") === event.currentTarget);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
        if (event.key === "Escape" && !event.defaultPrevented
          && event.currentTarget.parentElement?.closest("dialog[open]")
          && event.target instanceof HTMLElement && event.target.closest("dialog") === event.currentTarget) {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) onClose();
        }
      }}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); if (!busy) onClose(); }}
    >
      <header className={styles.header}>
        <h2 id={titleId}>{title}</h2>
        <button className={styles.close} type="button" aria-label="Cerrar modal" disabled={busy} onClick={onClose}>×</button>
      </header>
      {children}
    </dialog>
  );
}
