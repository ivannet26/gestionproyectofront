import { useId, useState } from "react";
import type { ProjectTaskState, Task } from "../types";

export default function TaskMoveControl({ task, states, tasks, disabled, onMove, onClose }: {
  task: Task; states: ProjectTaskState[]; tasks: Task[]; disabled: boolean; onClose?: () => void;
  onMove: (task: Task, state: string, before: number | null) => void;
}) {
  const [state, setState] = useState(task.state_code), [before, setBefore] = useState("");
  const id = useId(), allowed = states.filter((item) => item.code === task.state_code || (task.move_targets ? task.move_targets.includes(item.code) : task.transitions.some((transition) => transition.target === item.code)));
  return <fieldset disabled={disabled} className="grid gap-2 border-0 border-t border-neutral-200 pt-3"><legend className="text-xs font-medium">Mover tarea</legend>
      <label htmlFor={`${id}-state`}>Estado de destino</label><select id={`${id}-state`} name="move_state" value={state} onChange={(event) => { setState(event.target.value); setBefore(""); }}>
        {allowed.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select>
      <label htmlFor={`${id}-position`}>Posición entre hermanos</label><select id={`${id}-position`} name="move_before" value={before} onChange={(event) => setBefore(event.target.value)}>
        <option value="">Al final</option>{tasks.filter((item) => item.parent_id === task.parent_id && item.state_code === state && item.id !== task.id).map((item) => <option key={item.id} value={item.id}>Antes de {item.name}</option>)}</select>
      <p className="m-0 text-xs text-neutral-600">No cambia el padre ni los atributos de la tarea. Se aplican las transiciones autorizadas.</p>
      <button type="button" className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-white hover:bg-neutral-700" onClick={() => { onClose?.(); onMove(task, state, before ? Number(before) : null); }}>Confirmar movimiento</button>
    </fieldset>;
}
