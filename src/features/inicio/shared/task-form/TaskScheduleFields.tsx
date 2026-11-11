import type { useTaskScheduleForm } from "../../utils/useTaskScheduleForm";

export default function TaskScheduleFields({
  editor,
}: {
  editor: ReturnType<typeof useTaskScheduleForm>;
}) {
  return (
    <fieldset className="grid min-w-0 gap-2 border-0 p-0 text-xs">
      <legend className="sr-only">Precisión del calendario</legend>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={editor.precision === "hour"}
          onChange={(event) =>
            editor.setPrecision(event.target.checked ? "hour" : "day")
          }
        />
        Usar horario · America/Lima
      </label>
      {editor.precision === "hour" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">
            Inicio horario
            <input
              className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-600 dark:bg-neutral-900"
              name="planned_start"
              type="datetime-local"
              step="60"
              value={editor.start}
              onChange={(event) => editor.setStart(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1">
            Fin horario exclusivo (opcional)
            <input
              className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-600 dark:bg-neutral-900"
              name="planned_end"
              type="datetime-local"
              step="60"
              value={editor.end}
              onChange={(event) => editor.setEnd(event.target.value)}
            />
          </label>
          <p className="m-0 text-neutral-600 dark:text-neutral-300 sm:col-span-2">
            Mínimo una hora. Deja el fin vacío para conservar una tarea sin
            límite.
          </p>
        </div>
      )}
    </fieldset>
  );
}
