import type { ComponentProps } from "react";
import { Calendar as CalendarGrid } from "./ProjectEndDateSelector";
export default function Calendar(props: ComponentProps<typeof CalendarGrid>) {
  return <CalendarGrid {...props} />;
}
