import { DemoSwitcher } from '@/components/test/demo/demo-switcher'

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <DemoSwitcher />
    </>
  )
}
