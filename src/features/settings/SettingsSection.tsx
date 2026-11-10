import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section className="py-5">
      <h3 className="m-0 text-sm text-neutral-900 dark:text-neutral-100">
        {title}
      </h3>
      <p className="m-0 mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        {description}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
