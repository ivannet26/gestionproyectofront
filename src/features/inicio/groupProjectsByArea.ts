import type {
  ProjectAreaGroup,
  ProjectSummary,
} from "../../core/interfaces/project.interface";

export function groupProjectsByArea(
  projects: ProjectSummary[],
): ProjectAreaGroup[] {
  const groups = new Map<number, ProjectAreaGroup>();
  const withoutArea: ProjectAreaGroup = {
    id: 0,
    name: "Sin área",
    projects: [],
  };

  for (const project of projects) {
    if (project.areas.length === 0) {
      withoutArea.projects.push(project);
      continue;
    }

    for (const area of project.areas) {
      const group = groups.get(area.id) ?? { ...area, projects: [] };
      group.projects.push(project);
      groups.set(area.id, group);
    }
  }

  const result = [...groups.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );

  if (withoutArea.projects.length > 0) result.push(withoutArea);

  return result;
}
