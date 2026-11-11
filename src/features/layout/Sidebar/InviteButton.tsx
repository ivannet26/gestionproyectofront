import { lazy, Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import UserPlusIcon from "../../../shared/Icons/UserPlusIcon";
import { useActiveAreas } from "../../organizations/accounts/useAccounts";

const InvitationModal = lazy(
  () =>
    import("../../organizations/accounts/InvitationModal/InvitationModal"),
);

export default function InviteButton() {
  const [open, setOpen] = useState(false);
  const { data: areas = [], refetch } = useActiveAreas();
  const queryClient = useQueryClient();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void refetch();
          setOpen(true);
        }}
        title="Invitar"
        className="flex w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 max-md:w-auto max-md:flex-row max-md:gap-2 max-md:px-3"
      >
        <UserPlusIcon className="size-5" />
        <span className="max-w-full min-w-0">Invitar</span>
      </button>

      {open && (
        <Suspense fallback={null}>
          <InvitationModal
            areas={areas}
            onClose={() => setOpen(false)}
            onUpdate={() =>
              queryClient.invalidateQueries({ queryKey: ["accounts"] })
            }
          />
        </Suspense>
      )}
    </>
  );
}
