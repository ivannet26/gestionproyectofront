import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import styles from "./Modal.module.css";

interface ModalProps {
  title: string;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  children: ReactNode;
}

export default function Modal({ title, onClose, busy = false, wide = false, children }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={`${styles.modal}${wide ? ` ${styles.wide}` : ""}`}
      aria-labelledby={titleId}
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
