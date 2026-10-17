import { useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ label, children, stretch = false }: {
  label: string;
  stretch?: boolean;
  children: (description: string) => ReactNode;
}) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      if (!anchor.current || !tip.current) return;
      const a = anchor.current.getBoundingClientRect();
      const t = tip.current.getBoundingClientRect();
      tip.current.style.left = `${Math.max(8, Math.min(a.left, innerWidth - t.width - 8))}px`;
      tip.current.style.top = `${a.top > t.height + 12 ? a.top - t.height - 6 : a.bottom + 6}px`;
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, label]);
  return <span ref={anchor} className={`inline-flex min-w-0 ${stretch ? "w-full" : ""}`} onMouseEnter={() => setOpen(true)}
    onMouseLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setOpen(false); }} onFocus={() => setOpen(true)}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(":hover")) setOpen(false); }}
    onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    {children(id)}
    {open && createPortal(<span ref={tip} id={id} role="tooltip"
      className="fixed z-[100] max-w-[calc(100vw-16px)] break-words rounded-lg border border-neutral-200 bg-neutral-800 px-2 py-1 text-xs text-white [overflow-wrap:anywhere]">{label}</span>, document.body)}
    {!open && <span id={id} role="tooltip" hidden>{label}</span>}
  </span>;
}
