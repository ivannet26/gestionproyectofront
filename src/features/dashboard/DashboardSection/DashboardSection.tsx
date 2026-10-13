import type { ReactNode } from 'react'

interface DashboardSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

function DashboardSection({ title, description, children, className = "" }: DashboardSectionProps) {
  return (
    <section className={`bg-white border border-neutral-200 shadow-none ${className}`.trim()}>
      <header className="px-5 pt-5 pb-0">
        <div>
          <h2 className="m-0 text-base font-semibold text-neutral-900">{title}</h2>
          {description && <p className="m-0 mt-1 text-sm text-neutral-600">{description}</p>}
        </div>
      </header>
      <div className="grid">{children}</div>
    </section>
  );
}

export default DashboardSection;
