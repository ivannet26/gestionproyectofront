export type TaskIconName = "state" | "person" | "date" | "priority" | "labels" | "settings" | "check";

export default function TaskIcon({ name }: { name: TaskIconName }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === "state" && <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></>}
    {name === "person" && <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>}
    {name === "date" && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h2" /></>}
    {name === "priority" && <><path d="M5 21V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0" /></>}
    {name === "labels" && <><path d="m3 12 9 9 9-9-9-9H3z" /><circle cx="8" cy="8" r="1" /></>}
    {name === "settings" && <><path d="M3 7h4m6 0h8M3 17h10m6 0h2" /><circle cx="10" cy="7" r="3" /><circle cx="16" cy="17" r="3" /></>}
    {name === "check" && <path d="m5 12 4 4L19 6" />}
  </svg>;
}
