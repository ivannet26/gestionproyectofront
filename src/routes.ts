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

export const HomePage = lazy(() => import("./features/inicio/HomePage"));
export const ProjectRoute = lazy(() => import("./features/inicio/ProjectPage"));
export const PublicationsPage = lazy(
  () => import("./features/publicaciones/PublicacionesPage"),
);
const EquiposPage = lazy(() => import("./features/equipos/EquiposPage"));
const TeamDetailPage = lazy(() => import("./features/equipos/TeamDetailPage"));
const OrganizacionesPage = lazy(
  () => import("./features/organizaciones/OrganizacionesPage"),
);
const AccountsPage = lazy(
  () => import("./features/organizaciones/accounts/AccountsPage"),
);
const RecoveryRequestsPage = lazy(
  () =>
    import("./features/organizaciones/recovery-requests/RecoveryRequestsPage"),
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
    label: "Publicaciones",
    Icon: FileIcon,
    path: "/publicaciones",
    subRoutes: [
      {
        title: "Publicaciones",
        path: "/publicaciones",
        Icon: FileIcon,
        Component: PublicationsPage,
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
        Component: EquiposPage,
      },
      {
        title: "Trabajadores",
        path: "/equipos/trabajadores",
        Icon: UserIcon,
        Component: EquiposPage,
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
        Component: OrganizacionesPage,
      },
      {
        title: "Especialidades",
        path: "/organizaciones/especialidades",
        Icon: FileIcon,
        Component: OrganizacionesPage,
      },
      {
        title: "Proyectos",
        path: "/organizaciones/proyectos",
        Icon: ProjectsIcon,
        Component: OrganizacionesPage,
      },
      {
        title: "Áreas",
        path: "/organizaciones/areas",
        Icon: FolderIcon,
        Component: OrganizacionesPage,
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
