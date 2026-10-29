export const projectDirectoryEvent = "gm-project-directory-changed";

export function projectDirectoryChanged(areaIds: number[]) {
  window.dispatchEvent(new CustomEvent(projectDirectoryEvent, { detail: { areaIds: [...new Set(areaIds)] } }));
}
