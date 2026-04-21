export function PageHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <header>
      <h1 className="font-display text-[1.75rem] tracking-tight">{title}</h1>
      {subtitle ? (
        <p className="mt-1 text-[0.85rem] text-muted-warm">{subtitle}</p>
      ) : null}
    </header>
  )
}
