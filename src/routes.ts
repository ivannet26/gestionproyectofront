import type { ComponentType } from "react";
import AdminAccountsPage from "./features/auth/AdminAccountsPage/AdminAccountsPage";
import DashboardPage from "./features/dashboard/DashboardPage/DashboardPage";
import ProjectList from "./features/projects/ProjectList/ProjectList";
import ProjectRoute from "./features/projects/ProjectRoute/ProjectRoute";
import WorkersPage from "./features/workers/WorkersPage";
import OrganizationPage from "./features/organization/OrganizationPage";
import TeamDetailPage from "./features/teams/TeamDetailPage";

export interface AppRoute {
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<any>;
  requiresAdmin: boolean;
}

export const appRoutes: AppRoute[] = [
  {
    path: "/",
    Component: DashboardPage,
    requiresAdmin: false,
  },
  {
    path: "/proyectos",
    Component: ProjectList,
    requiresAdmin: false,
  },
  {
    path: "/proyectos/resumen",
    Component: ProjectList,
    requiresAdmin: false,
  },
  {
    path: "/proyectos/:projectId",
    Component: ProjectRoute,
    requiresAdmin: false,
  },
  {
    path: "/administracion/cuentas",
    Component: AdminAccountsPage,
    requiresAdmin: true,
  },
  {
    path: "/trabajadores",
    Component: WorkersPage,
    requiresAdmin: true,
  },
  {
    path: "/organizacion",
    Component: OrganizationPage,
    requiresAdmin: false,
  },
  {
    path: "/equipos/:teamId",
    Component: TeamDetailPage,
    requiresAdmin: false,
  },
];

export function projectPath(projectId: number): string {
  return `/proyectos/${projectId}`;
}
