import type { HTMLAttributes } from "react";
import { avatarFor } from "./avatar";

const tones = [
  "bg-sky-700",
  "bg-emerald-700",
  "bg-amber-700",
  "bg-rose-700",
  "bg-violet-700",
  "bg-cyan-700",
  "bg-orange-700",
  "bg-teal-700",
] as const;

function toneFor(name: string) {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  }
  return tones[hash % tones.length];
}

interface InitialsAvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
}

export default function InitialsAvatar({
  name,
  className = "size-7 text-xs",
  ...props
}: InitialsAvatarProps) {
  return (
    <span
      {...props}
      className={`inline-grid shrink-0 place-items-center rounded-full font-medium text-white ${toneFor(name)} ${className}`}
    >
      {avatarFor(name)}
    </span>
  );
}
