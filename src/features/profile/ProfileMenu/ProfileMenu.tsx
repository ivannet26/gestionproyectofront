import { useState } from "react";
import LogoutIcon from "../../../shared/icons/LogoutIcon";
import SparkleIcon from "../../../shared/icons/SparkleIcon";
import { avatarFor } from "../../../shared/avatar";
import type { SessionUser } from "../../auth/api";
import { roleLabel } from "../../auth/roles";
import ProfileModal from "../ProfileModal/ProfileModal";

interface ProfileMenuProps {
  user: SessionUser;
  onLogout: () => void;
  isCollapsed: boolean;
}

function ProfileMenu({ user, onLogout, isCollapsed }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const item =
    "w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-800 hover:bg-neutral-50 rounded-lg cursor-pointer text-left";

  return (
    <div
      className={`relative w-full ${isCollapsed ? "flex justify-center" : ""}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir menú de perfil"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex min-w-0 rounded-lg hover:bg-neutral-50 cursor-pointer ${
          isCollapsed
            ? "justify-center p-0"
            : "w-full items-start gap-2.5 p-1 text-left"
        }`}
      >
        <div
          aria-hidden="true"
          className="size-8 inline-flex items-center justify-center rounded-full bg-sky-500 text-xs font-medium text-white"
        >
          {avatarFor(user.name)}
        </div>
        {!isCollapsed && (
          <div className="flex flex-1 flex-col items-start min-w-0 text-left">
            <span className="line-clamp-1 text-sm text-neutral-800 leading-tight">
              {user.name}
            </span>
            <span className="line-clamp-1 text-xs text-neutral-600 leading-tight mt-0.5">
              {roleLabel(user.role)}
            </span>
          </div>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute bottom-full left-0 z-50 mb-4 w-56 bg-white border border-neutral-200 rounded-xl p-2"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setModal(true);
              }}
              className={item}
            >
              <SparkleIcon className="size-4 flex-none" aria-hidden="true" />
              Añadir especialidad
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className={item}
            >
              <LogoutIcon className="size-4 flex-none" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </>
      )}

      {modal && <ProfileModal onClose={() => setModal(false)} />}
    </div>
  );
}

export default ProfileMenu;
