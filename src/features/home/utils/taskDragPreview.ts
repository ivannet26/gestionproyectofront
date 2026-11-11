export function taskDragPreview(
  row: HTMLElement,
  origin: { x: number; y: number },
) {
  const bounds = row.getBoundingClientRect();
  const tableRow = row.tagName === "TR";
  const cells = tableRow ? (row as HTMLTableRowElement).cells : row.children;
  const widths = Array.from(
    cells,
    (cell) => cell.getBoundingClientRect().width,
  );
  const clone = row.cloneNode(true) as HTMLElement;
  const source = [row, ...row.querySelectorAll("*")];
  const copies = [clone, ...clone.querySelectorAll("*")];
  const styles = source.map((element) => {
    const style = getComputedStyle(element);
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      opacity: style.opacity,
      display: style.display,
      font: style.font,
      alignItems: style.alignItems,
      gap: style.gap,
      padding: style.padding,
    };
  });
  copies.forEach((element, index) => {
    if (
      source[index].matches(
        '[popover], [role="tooltip"], [role="menu"], [role="dialog"], dialog',
      )
    ) {
      element.remove();
      return;
    }
    for (const attribute of [...element.attributes]) {
      if (
        /^(id|name|for|title|tabindex|href|popover.*|aria-.*|on.*|data-task-id|data-context|data-dragging|data-drag-enabled|inert|contenteditable|draggable)$/.test(
          attribute.name,
        )
      )
        element.removeAttribute(attribute.name);
    }
    if (element.matches("button, a, input, textarea, select, summary")) {
      const passive = document.createElement("span");
      for (const attribute of [...element.attributes])
        passive.setAttribute(attribute.name, attribute.value);
      passive.dataset.previewControl = "";
      passive.append(...element.childNodes);
      Object.assign(passive.style, styles[index]);
      element.replaceWith(passive);
    } else if (element instanceof HTMLElement) {
      Object.assign(element.style, styles[index]);
    }
  });
  Array.from(clone.children).forEach((cell, index) => {
    if (cell instanceof HTMLElement) cell.style.width = `${widths[index]}px`;
  });
  clone.style.height = `${bounds.height}px`;
  let content: HTMLElement = clone;
  if (tableRow) {
    const table = document.createElement("table");
    table.className =
      "w-full table-fixed border-collapse text-xs text-neutral-800";
    table.createTBody().append(clone);
    content = table;
  }
  const preview = document.createElement("div");
  preview.className = "gm-task-list gm-task-preview";
  preview.dataset.taskPreview = String(row.dataset.taskId);
  preview.setAttribute("aria-hidden", "true");
  preview.inert = true;
  preview.style.width = `${bounds.width}px`;
  preview.style.height = `${bounds.height}px`;
  preview.append(content);
  const offset = { x: origin.x - bounds.left, y: origin.y - bounds.top };
  const move = (x: number, y: number) => {
    preview.style.transform = `translate3d(${x - offset.x}px, ${y - offset.y}px, 0)`;
  };
  move(origin.x, origin.y);
  document.body.append(preview);
  return { move, remove: () => preview.remove() };
}
