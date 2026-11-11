import { useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import Avatar from "../../../shared/Avatar";
import EmptyState from "../../../shared/EmptyState/EmptyState";
import PlusIcon from "../../../shared/Icons/PlusIcon";
import TeamMembersModal from "../../organizations/Teams/TeamMembersModal";
import { teamPath } from "../../../routes";
import type { Team } from "../../../core/interfaces/organization.interface";

interface MyTeamsListProps {
  currentPath: string;
}

const myTeams: Team[] = [];

function MyTeamsList({ currentPath }: MyTeamsListProps) {
  const [memberTeam, setMemberTeam] = useState<Team | null>(null);
  const queryClient = useQueryClient();

  return (
    <>
      {myTeams.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 mx-2">
          <EmptyState
            style="small"
            iconName="teams"
            message="Cuando te añadan a un equipo, lo verás aquí."
          />
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {myTeams.map((team) => {
            const path = teamPath(team.id);
            const active =
              currentPath === path || currentPath.startsWith(`${path}/`);
            return (
              <li
                key={team.id}
                className={`flex items-center rounded-lg pr-1 text-xs ${
                  active
                    ? "bg-neutral-100 dark:bg-neutral-800"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Link
                  to={path}
                  aria-current={active ? "page" : undefined}
                  title={team.name}
                  className={`badge min-w-0 flex-1 ${
                    active ? "text-neutral-800 dark:text-neutral-100" : ""
                  }`}
                >
                  <Avatar
                    name={team.name.charAt(0)}
                    className="size-4 rounded-md text-xs"
                  />
                  <span className="min-w-0 flex-1 truncate">{team.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMemberTeam(team)}
                  aria-label={`Añadir integrante a ${team.name}`}
                  title="Añadir integrante"
                  className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-neutral-600 hover:bg-neutral-200 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  <PlusIcon className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {memberTeam != null && (
        <TeamMembersModal
          team={memberTeam}
          onClose={() => setMemberTeam(null)}
          onChanged={() =>
            void queryClient.invalidateQueries({ queryKey: ["teams"] })
          }
        />
      )}
    </>
  );
}

export default MyTeamsList;
