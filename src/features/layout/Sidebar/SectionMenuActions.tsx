import PlusIcon from "../../../shared/Icons/PlusIcon";
import FileIcon from "../../../shared/Icons/FileIcon";

export default function SectionMenuActions() {
  return (
    <div className="mb-2 flex flex-col gap-1.5 px-0.5">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("gm-open-create-task"))}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        <PlusIcon className="size-3.5" />
        <span>Crear tarea</span>
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("gm-open-publish"))}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <FileIcon className="size-3.5" />
        <span>Publicar</span>
      </button>
    </div>
  );
}

