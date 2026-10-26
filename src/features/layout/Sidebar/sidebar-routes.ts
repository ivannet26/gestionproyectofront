import type { ComponentType } from "react";
import AdminIcon from "../../../shared/icons/AdminIcon";
import FolderIcon from "../../../shared/icons/FolderIcon";
import HomeIcon from "../../../shared/icons/HomeIcon";
import KeyIcon from "../../../shared/icons/KeyIcon";
import TeamsIcon from "../../../shared/icons/TeamsIcon";
import type { IconProps } from "../../../shared/icons/types";
import BriefcaseIcon from "../../../shared/icons/BriefcaseIcon";
import MegaphoneIcon from "../../../shared/icons/MegaphoneIcon";

export interface NavigationEntry {
  label: string;
  path: string;
  icon: ComponentType<IconProps>;
  requiresAdmin: boolean;
}

export const navigation: NavigationEntry[] = [
  { label: "Inicio", path: "/", icon: HomeIcon, requiresAdmin: false },
  {
    label: "Publicaciones",
    path: "/publicaciones",
    icon: MegaphoneIcon,
    requiresAdmin: false,
  },
  {
    label: "Trabajadores",
    path: "/trabajadores",
    icon: TeamsIcon,
    requiresAdmin: true,
  },
  {
    label: "Equipos",
    path: "/equipos",
    icon: BriefcaseIcon,
    requiresAdmin: false,
  },
  {
    label: "Organización",
    path: "/organizacion",
    icon: FolderIcon,
    requiresAdmin: false,
  },
  {
    label: "Cuentas y accesos",
    path: "/cuentas",
    icon: AdminIcon,
    requiresAdmin: true,
  },
  {
    label: "Recuperaciones",
    path: "/recuperaciones",
    icon: KeyIcon,
    requiresAdmin: true,
  },
];
