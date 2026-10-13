import {
  emptyStateIcons,
  type EmptyStateIconName,
} from "../icons/emptyStateIcons";

interface EmptyStateProps {
  iconName: EmptyStateIconName;
  message: string;
}

function EmptyState({ iconName, message }: EmptyStateProps) {
  const Icon = emptyStateIcons[iconName];

  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center px-2.5 py-8 text-center"
    >
      <span className="text-neutral-600" aria-hidden="true">
        <Icon className="size-8" />
      </span>
      <p className="m-0 mt-2 text-xs text-neutral-600">{message}</p>
    </div>
  );
}

export default EmptyState;
