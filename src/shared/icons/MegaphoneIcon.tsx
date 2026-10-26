import type { IconProps } from "./types";

function MegaphoneIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 8a3 3 0 0 1 0 6" />
      <path d="M10 8v11a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-11" />
      <path d="M3 11h11a3 3 0 0 0 -3 -3h-5a3 3 0 0 0 -3 3z" />
    </svg>
  );
}

export default MegaphoneIcon;
