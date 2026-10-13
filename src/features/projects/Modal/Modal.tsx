import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  children: ReactNode;
}

export default function Modal({
  title,
  onClose,
  busy = false,
  wide = false,
  children,
}: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={`p-0 text-neutral-900 bg-white border border-neutral-200 shadow-none overflow-y-auto max-h-[90vh] ${wide ? "w-[min(94vw,760px)] max-h-[92dvh]" : "w-[min(94vw,690px)]"}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) onClose();
      }}
    >
      <header className="sticky top-0 z-[2] flex items-center justify-between gap-4 px-5 py-4 bg-white border-b border-neutral-200">
        <h2 id={titleId} className="m-0 text-base font-semibold">
          {title}
        </h2>
        <button
          className="min-w-10 min-h-10 text-neutral-900 bg-neutral-100 border border-neutral-200 text-xl cursor-pointer shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          aria-label="Cerrar modal"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
