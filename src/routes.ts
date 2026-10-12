import type { ComponentType } from "react";
import AdminAccountsPage from "./features/auth/AdminAccountsPage/AdminAccountsPage";
import DashboardPage from "./features/dashboard/DashboardPage/DashboardPage";
import WorkersPage from "./features/workers/WorkersPage";
import OrganizationPage from "./features/organization/OrganizationPage";

export interface AppRoute {
  path: string;
  Component: ComponentType;
  requiresAdmin?: boolean;
}

export const appRoutes: AppRoute[] = [
  {
    path: "/",
    Component: DashboardPage,
  },
  {
    path: "/trabajadores",
    Component: WorkersPage,
  },
  {
    path: "/organizacion",
    Component: OrganizationPage,
    requiresAdmin: true,
  },
  {
    path: "/administracion",
    Component: AdminAccountsPage,
    requiresAdmin: true,
  },
];
