export function taskDragPreview(row: HTMLTableRowElement, origin: { x: number; y: number }) {
  const bounds = row.getBoundingClientRect();
  const widths = Array.from(row.cells, (cell) => cell.getBoundingClientRect().width);
  const clone = row.cloneNode(true) as HTMLTableRowElement;
  const source = [row, ...row.querySelectorAll("*")];
  const copies = [clone, ...clone.querySelectorAll("*")];
  const styles = source.map((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, backgroundColor: style.backgroundColor, borderColor: style.borderColor, opacity: style.opacity };
  });
  copies.forEach((element, index) => {
    if (source[index].matches('[popover], [role="tooltip"], [role="menu"], [role="dialog"], dialog')) { element.remove(); return; }
    for (const attribute of [...element.attributes]) {
      if (/^(id|name|for|title|tabindex|href|popover.*|aria-.*|on.*|data-task-id|data-context|data-dragging|data-drag-enabled|inert|contenteditable|draggable)$/.test(attribute.name)) element.removeAttribute(attribute.name);
    }
    if (element.matches("button, a, input, textarea, select, summary")) {
      const passive = document.createElement("span");
      for (const attribute of [...element.attributes]) passive.setAttribute(attribute.name, attribute.value);
      passive.dataset.previewControl = "";
      passive.append(...element.childNodes);
      Object.assign(passive.style, styles[index]);
      element.replaceWith(passive);
    } else if (element instanceof HTMLElement && element.classList.contains("gm-row-labels")) {
      element.style.opacity = styles[index].opacity;
    }
  });
  Array.from(clone.cells).forEach((cell, index) => { cell.style.width = `${widths[index]}px`; });
  clone.style.height = `${bounds.height}px`;
  const table = document.createElement("table");
  table.className = "w-full table-fixed border-collapse text-xs text-neutral-800";
  const body = table.createTBody();
  body.append(clone);
  const preview = document.createElement("div");
  preview.className = "gm-task-list gm-task-preview";
  preview.dataset.taskPreview = String(row.dataset.taskId);
  preview.setAttribute("aria-hidden", "true");
  preview.inert = true;
  preview.style.width = `${bounds.width}px`;
  preview.style.height = `${bounds.height}px`;
  preview.append(table);
  const offset = { x: origin.x - bounds.left, y: origin.y - bounds.top };
  const move = (x: number, y: number) => { preview.style.transform = `translate3d(${x - offset.x}px, ${y - offset.y}px, 0)`; };
  move(origin.x, origin.y);
  document.body.append(preview);
  return { move, remove: () => preview.remove() };
}
