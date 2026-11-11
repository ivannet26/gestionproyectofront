export function suppressGanttClick(pointerId: number): () => void {
  const clear = () => {
    document.removeEventListener("click", block, true);
    document.removeEventListener("pointerdown", clear, true);
    window.removeEventListener("blur", clear);
  };
  const block = (event: MouseEvent) => {
    if (
      !event.detail ||
      ("pointerId" in event && event.pointerId !== pointerId)
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    clear();
  };
  document.addEventListener("click", block, true);
  document.addEventListener("pointerdown", clear, true);
  window.addEventListener("blur", clear);
  return clear;
}
