import type { HTMLAttributes } from "react";
import { initialColor } from "../utils/initialColor";

export function avatarFor(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const letters =
    words.length > 1
      ? words
          .slice(0, 2)
          .map((word) => Array.from(word)[0])
          .join("")
      : Array.from(words[0] ?? "")
          .slice(0, 2)
          .join("");

  return letters.toLocaleUpperCase("es");
}

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
      className={`inline-grid shrink-0 place-items-center text-white ${initialColor(name)} ${className}`}
    >
      {avatarFor(name)}
    </span>
  );
}
