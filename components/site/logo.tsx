import Image from 'next/image'

import { cn } from '@/lib/utils'

type LogoColor = 'coral' | 'cream' | 'ink'
type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

const sizeHeight: Record<LogoSize, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
  xl: 'h-20',
}

export function Logo({
  size = 'md',
  color: _color,
  className,
}: {
  size?: LogoSize
  color?: LogoColor
  className?: string
}) {
  return (
    <span className={cn('inline-block leading-none', sizeHeight[size], className)}>
      <Image
        src="/logo.svg"
        alt="giftly"
        width={1486}
        height={1010}
        priority
        className="h-full w-auto"
      />
    </span>
  )
}
