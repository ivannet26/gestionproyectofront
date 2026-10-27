import type { ComponentType } from "react";

import DashboardPage from "./features/dashboard/DashboardPage/DashboardPage";
import ProjectList from "./features/projects/ProjectList/ProjectList";
import ProjectRoute from "./features/projects/ProjectRoute/ProjectRoute";
import WorkersPage from "./features/workers/WorkersPage";
import OrganizationPage from "./features/organization/OrganizationPage";
import TeamsPage from "./features/teams/TeamsPage";
import TeamDetailPage from "./features/teams/TeamDetailPage";
import AccountsPage from "./features/accounts/AccountsPage";
import RecoveryRequestsPage from "./features/recovery-requests/RecoveryRequestsPage";
import PublicationsPage from "./features/publications/PublicationsPage";
import SettingsPage from "./features/settings/SettingsPage";

export interface AppRoute {
  path: string;
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
    path: "/publicaciones",
    Component: PublicationsPage,
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
    path: "/cuentas",
    Component: AccountsPage,
    requiresAdmin: true,
  },
  {
    path: "/recuperaciones",
    Component: RecoveryRequestsPage,
    requiresAdmin: true,
  },
  {
    path: "/trabajadores",
    Component: WorkersPage,
    requiresAdmin: true,
  },
  {
    path: "/equipos",
    Component: TeamsPage,
    requiresAdmin: false,
  },
  {
    path: "/equipos/:teamId",
    Component: TeamDetailPage,
    requiresAdmin: false,
  },
  {
    path: "/organizacion",
    Component: OrganizationPage,
    requiresAdmin: false,
  },
  {
    path: "/configuracion",
    Component: SettingsPage,
    requiresAdmin: false,
  },
];

export function projectPath(projectId: number): string {
  return `/proyectos/${projectId}`;
}
