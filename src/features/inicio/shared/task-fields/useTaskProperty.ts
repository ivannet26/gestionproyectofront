import { useId, useLayoutEffect, useRef, useState } from "react";

export function useTaskProperty(id: string, fitViewport = false) {
  const panelId = useId(),
    panel = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    const node = panel.current,
      button = trigger.current;
    if (!open || !node || !button) return;
    let frame = 0;
    function place() {
      if (!node || !button || !node.matches(":popover-open")) return;
      const box = button.getBoundingClientRect(),
        viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth,
        height = viewport?.height ?? window.innerHeight,
        left = viewport?.offsetLeft ?? 0,
        top = viewport?.offsetTop ?? 0;
      const below = height + top - box.bottom - 12,
        above = box.top - top - 12,
        down = below >= Math.min(node.scrollHeight, 300) || below >= above;
      node.style.maxHeight =
        Math.max(80, fitViewport ? height - 16 : down ? below : above) + "px";
      const size = node.getBoundingClientRect();
      node.style.left =
        Math.max(left + 8, Math.min(box.left, left + width - size.width - 8)) +
        "px";
      const preferredTop = down ? box.bottom + 4 : box.top - size.height - 4;
      node.style.top =
        Math.max(
          top + 8,
          fitViewport
            ? Math.min(preferredTop, top + height - size.height - 8)
            : preferredTop,
        ) + "px";
    }
    place();
    (
      node.querySelector<HTMLElement>("[data-panel-focus]") ??
      node.querySelector<HTMLElement>("input,button,select,[tabindex]")
    )?.focus({ preventScroll: true });
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [open, fitViewport]);
  function close() {
    panel.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  }
  return { id, panelId, panel, trigger, open, setOpen, close };
}
