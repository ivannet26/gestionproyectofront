import type { HTMLAttributes } from "react";

import { avatarFor } from "./avatarInitials";

interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  className?: string;
}

export default function Avatar({
  name,
  className = "size-7 text-xs",
  ...props
}: AvatarProps) {
  return (
    <span
      {...props}
      className={`inline-grid shrink-0 place-items-center rounded-full bg-sky-600 font-medium text-white ${className}`}
    >
      {avatarFor(name)}
    </span>
  );
}
