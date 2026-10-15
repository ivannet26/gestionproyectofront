import type { ComponentType } from "react";
import AdminIcon from "../../../shared/icons/AdminIcon";
import FolderIcon from "../../../shared/icons/FolderIcon";
import HomeIcon from "../../../shared/icons/HomeIcon";
import TeamsIcon from "../../../shared/icons/TeamsIcon";
import type { IconProps } from "../../../shared/icons/types";

export interface NavigationEntry {
  label: string;
  path: string;
  icon: ComponentType<IconProps>;
  requiresAdmin: boolean;
}

export const navigation: NavigationEntry[] = [
  { label: "Inicio", path: "/", icon: HomeIcon, requiresAdmin: false },
  {
    label: "Trabajadores",
    path: "/trabajadores",
    icon: TeamsIcon,
    requiresAdmin: true,
  },
  {
    label: "Organización",
    path: "/organizacion",
    icon: FolderIcon,
    requiresAdmin: false,
  },
  {
    label: "Administración",
    path: "/administracion/cuentas",
    icon: AdminIcon,
    requiresAdmin: true,
  },
];
