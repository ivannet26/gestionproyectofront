import type { ComponentType } from "react";

import DashboardPage from "./features/dashboard/DashboardPage/DashboardPage";
import ProjectList from "./features/projects/ProjectList/ProjectList";
import ProjectRoute from "./features/projects/ProjectRoute/ProjectRoute";
import WorkersPage from "./features/workers/WorkersPage";
import AbsencesPage from "./features/absences/AbsencesPage";
import OrganizationPage from "./features/organization/OrganizationPage";
import TeamDetailPage from "./features/teams/TeamDetailPage";
import AccountsPage from "./features/accounts/AccountsPage";
import RecoveryRequestsPage from "./features/recovery-requests/RecoveryRequestsPage";

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
    path: "/ausencias",
    Component: AbsencesPage,
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
