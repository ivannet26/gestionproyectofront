import { useId, useState } from "react";
import TaskIcon from "../TaskForm/TaskIcon";

export default function TaskStatusSettingsControl({ onClick }: { onClick: () => void }) {
  const id = useId();
  const [dismissed, setDismissed] = useState(false);
  return <div className="group relative flex shrink-0 items-center">
    <button type="button" aria-label="Ajustes de estados" aria-haspopup="dialog" aria-describedby={id} onClick={onClick}
      onFocus={() => setDismissed(false)} onMouseEnter={() => setDismissed(false)}
      onKeyDown={(event) => { if (event.key === "Escape") setDismissed(true); }}
      className="inline-flex cursor-pointer touch-manipulation items-center justify-center rounded-lg p-2 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 [@media(pointer:coarse)]:p-3.5">
      <TaskIcon name="settings" />
    </button>
    <span id={id} role="tooltip" hidden={dismissed} className="invisible absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800 group-hover:visible group-focus-within:visible">Ajustes de estados</span>
  </div>;
}
