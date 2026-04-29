export function FilterRail() {
  return (
    <aside className="hidden lg:block w-[240px] shrink-0 text-[0.82rem] text-[#0F1111]">
      <Section title="Department">
        <ul className="space-y-1">
          <li className="font-bold">
            <span aria-hidden="true">‹ </span>Beauty &amp; Personal Care
          </li>
          <li className="pl-3 text-[#007185]">Hair Care</li>
          <li className="pl-6 font-bold">Shampoo</li>
        </ul>
      </Section>

      <Section title="Customer Reviews">
        {[4, 3, 2, 1].map((stars) => (
          <Stars key={stars} count={stars} />
        ))}
      </Section>

      <Section title="Brand">
        <Checks
          options={[
            'ScalpRX',
            'DermaKlear',
            'Lumina Pro',
            'Head & Shoulders',
            'Nizoral',
            'Neutrogena',
            'Selsun Blue',
          ]}
        />
      </Section>

      <Section title="Hair Concern">
        <Checks
          options={[
            'Dandruff',
            'Dry scalp',
            'Itchiness',
            'Stress flare-ups',
            'Sensitivity',
          ]}
        />
      </Section>

      <Section title="Price">
        <ul className="space-y-1 text-[#007185]">
          <li>Under $10</li>
          <li>$10 to $20</li>
          <li>$20 to $30</li>
          <li>$30 &amp; Above</li>
        </ul>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="$ Min"
            aria-label="min price"
            className="w-16 h-7 border border-[#888c8c] rounded px-1.5 text-[0.78rem]"
          />
          <span className="text-[0.78rem]">–</span>
          <input
            type="text"
            placeholder="$ Max"
            aria-label="max price"
            className="w-16 h-7 border border-[#888c8c] rounded px-1.5 text-[0.78rem]"
          />
          <button
            type="button"
            className="h-7 px-2 text-[0.78rem] border border-[#888c8c] rounded bg-[#F0F2F2] hover:bg-[#e3e6e6]"
          >
            Go
          </button>
        </div>
      </Section>

      <Section title="Deals &amp; Discounts">
        <Checks options={['All Discounts', 'Today\'s Deals']} />
      </Section>
    </aside>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-5">
      <h3
        className="font-bold text-[0.92rem] text-[#0F1111] mb-1.5"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {children}
    </section>
  )
}

function Stars({ count }: { count: number }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-[#007185] hover:text-[#C7511F] hover:underline"
    >
      <span aria-hidden="true" className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={i < count ? 'text-[#FFA41C]' : 'text-[#D5D9D9]'}
          >
            ★
          </span>
        ))}
      </span>
      <span className="text-[0.78rem] text-[#0F1111]">&amp; Up</span>
    </button>
  )
}

function Checks({ options }: { options: string[] }) {
  return (
    <ul className="space-y-1.5">
      {options.map((label) => (
        <li key={label} className="flex items-center gap-2">
          <input
            type="checkbox"
            aria-label={label}
            onChange={(e) => e.preventDefault()}
            className="size-3.5 accent-[#007185]"
          />
          <span className="text-[#007185] hover:text-[#C7511F] hover:underline cursor-default">
            {label}
          </span>
        </li>
      ))}
    </ul>
  )
}
