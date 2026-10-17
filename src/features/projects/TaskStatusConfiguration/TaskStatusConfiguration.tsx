import { lazy, Suspense } from "react";
import type { Project, ProjectTaskConfiguration } from "../types";
import Modal from "../Modal/Modal";

const ConfigurationDialog = lazy(() => import("./TaskStatusConfigurationDialog"));

export default function TaskStatusConfiguration(props: {
  project: Project; onConfigured: (value: ProjectTaskConfiguration) => void; onClose: () => void;
}) {
  return <Suspense fallback={<Modal title="Modifica los estados de Tareas" onClose={props.onClose} statusComposer><p role="status" className="p-5 text-xs text-neutral-600">Cargando gestor…</p></Modal>}>
    <ConfigurationDialog {...props} />
  </Suspense>;
}
