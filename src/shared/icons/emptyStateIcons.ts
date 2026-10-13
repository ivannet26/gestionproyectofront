import type { ComponentType } from "react";
import FileIcon from "./FileIcon";
import FolderIcon from "./FolderIcon";
import ProjectsIcon from "./ProjectsIcon";
import TeamsIcon from "./TeamsIcon";

export type EmptyStateIconName =
  | "areas"
  | "teams"
  | "specialties"
  | "projects";

type IconComponent = ComponentType<{ className?: string }>;

export const emptyStateIcons: Record<EmptyStateIconName, IconComponent> = {
  areas: FolderIcon,
  teams: TeamsIcon,
  specialties: FileIcon,
  projects: ProjectsIcon,
};
