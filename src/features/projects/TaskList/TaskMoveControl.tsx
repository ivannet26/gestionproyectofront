import { useId, useState } from "react";
import type { ProjectTaskState, Task } from "../types";
import TaskProperty from "../TaskForm/TaskProperty";
import DotsIcon from "../../../shared/icons/DotsIcon";

export default function TaskMoveControl({ task, states, tasks, disabled, onMove }: {
  task: Task; states: ProjectTaskState[]; tasks: Task[]; disabled: boolean;
  onMove: (task: Task, state: string, before: number | null) => void;
}) {
  const [state, setState] = useState(task.state_code), [before, setBefore] = useState("");
  const id = useId(), allowed = states.filter((item) => item.code === task.state_code || (task.move_targets ? task.move_targets.includes(item.code) : task.transitions.some((transition) => transition.target === item.code)));
  return <TaskProperty id={id} cell compact appearance="toolbar" disabled={disabled} label={`Reubicar ${task.name}`} value="Arrastra la fila o elige estado y posición"
    icon="settings" content={<span aria-hidden="true"><DotsIcon className="size-4" /></span>}
    >
    {(close) => <div className="grid gap-2"><h3 className="m-0 text-sm font-medium">Mover tarea</h3>
      <label htmlFor={`${id}-state`}>Estado de destino</label><select id={`${id}-state`} name="move_state" value={state} onChange={(event) => { setState(event.target.value); setBefore(""); }}>
        {allowed.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select>
      <label htmlFor={`${id}-position`}>Posición entre hermanos</label><select id={`${id}-position`} name="move_before" value={before} onChange={(event) => setBefore(event.target.value)}>
        <option value="">Al final</option>{tasks.filter((item) => item.parent_id === task.parent_id && item.state_code === state && item.id !== task.id).map((item) => <option key={item.id} value={item.id}>Antes de {item.name}</option>)}</select>
      <p className="m-0 text-xs text-neutral-600">No cambia el padre ni los atributos de la tarea. Se aplican las transiciones autorizadas.</p>
      <button type="button" className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-white hover:bg-neutral-700" onClick={() => { close(); onMove(task, state, before ? Number(before) : null); }}>Confirmar movimiento</button>
    </div>}
  </TaskProperty>;
}
