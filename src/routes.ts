import { lazy } from "react";
import type { ComponentType } from "react";
import DashboardIcon from "./shared/Icons/Dashboard";
import ProjectsIcon from "./shared/Icons/ProjectsIcon";
import TeamsIcon from "./shared/Icons/TeamsIcon";
import BuildingIcon from "./shared/Icons/BuildingIcon";
import FileIcon from "./shared/Icons/FileIcon";
import FolderIcon from "./shared/Icons/FolderIcon";
import UserIcon from "./shared/Icons/UserIcon";
import KeyIcon from "./shared/Icons/KeyIcon";
import ClockIcon from "./shared/Icons/ClockIcon";

export const HomePage = lazy(() => import("./features/home/HomePage"));
export const ProjectRoute = lazy(() => import("./features/home/ProjectPage"));
export const PublicationsPage = lazy(
  () => import("./features/publications/PublicationsPage"),
);
const TeamsPage = lazy(() => import("./features/teams/TeamsPage"));
const TeamDetailPage = lazy(() => import("./features/teams/TeamDetailPage"));
const OrganizationsPage = lazy(
  () => import("./features/organizations/OrganizationsPage"),
);
const AccountsPage = lazy(
  () => import("./features/organizations/accounts/AccountsPage"),
);
const RecoveryRequestsPage = lazy(
  () =>
    import("./features/organizations/recovery-requests/RecoveryRequestsPage"),
);

export interface SubRoute {
  title: string;
  path: string;
  Icon: ComponentType<{ className?: string; fill?: boolean }>;
  Component: ComponentType<{ canManage?: boolean }>;
  hidden?: boolean;
}

export interface NavModule {
  label: string;
  Icon: ComponentType<{ className?: string; fill?: boolean }>;
  path: string;
  requiresAdmin?: boolean;
  subRoutes: SubRoute[];
}

export const appModules: NavModule[] = [
  {
    label: "Inicio",
    Icon: DashboardIcon,
    path: "/",
    subRoutes: [
      {
        title: "Publicaciones",
        path: "/publicaciones",
        Icon: FileIcon,
        Component: PublicationsPage,
      },
      {
        title: "Últimas tareas",
        path: "/",
        Icon: ClockIcon,
        Component: HomePage,
      },
      {
        title: "Todos mis proyectos",
        path: "/mis-proyectos",
        Icon: ProjectsIcon,
        Component: HomePage,
      },
      {
        title: "Detalle de proyecto",
        path: "/proyectos/:projectId",
        Icon: FolderIcon,
        Component: ProjectRoute,
        hidden: true,
      },
    ],
  },
  {
    label: "Equipos",
    Icon: TeamsIcon,
    path: "/equipos",
    subRoutes: [
      {
        title: "Todos los equipos",
        path: "/equipos",
        Icon: TeamsIcon,
        Component: TeamsPage,
      },
      {
        title: "Trabajadores",
        path: "/equipos/trabajadores",
        Icon: UserIcon,
        Component: TeamsPage,
      },
      {
        title: "Detalle de equipo",
        path: "/equipos/:teamId",
        Icon: TeamsIcon,
        Component: TeamDetailPage,
        hidden: true,
      },
    ],
  },
  {
    label: "Organización",
    Icon: BuildingIcon,
    path: "/organizaciones",
    requiresAdmin: true,
    subRoutes: [
      {
        title: "Equipos",
        path: "/organizaciones",
        Icon: TeamsIcon,
        Component: OrganizationsPage,
      },
      {
        title: "Especialidades",
        path: "/organizaciones/especialidades",
        Icon: FileIcon,
        Component: OrganizationsPage,
      },
      {
        title: "Proyectos",
        path: "/organizaciones/proyectos",
        Icon: ProjectsIcon,
        Component: OrganizationsPage,
      },
      {
        title: "Áreas",
        path: "/organizaciones/areas",
        Icon: FolderIcon,
        Component: OrganizationsPage,
      },
      {
        title: "Cuentas",
        path: "/organizaciones/cuentas",
        Icon: UserIcon,
        Component: AccountsPage,
      },
      {
        title: "Recuperaciones",
        path: "/organizaciones/recuperaciones",
        Icon: KeyIcon,
        Component: RecoveryRequestsPage,
      },
    ],
  },
];

export function projectPath(projectId: number | string): string {
  return `/proyectos/${projectId}`;
}

export function teamPath(teamId: number | string): string {
  return `/equipos/${teamId}`;
}
