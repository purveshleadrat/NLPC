import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 border px-2 py-0.5 text-[10.5px] font-medium w-fit whitespace-nowrap shrink-0 [&_svg]:pointer-events-none [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'rounded-full border-transparent bg-primary text-primary-foreground',
        secondary: 'rounded-full border-transparent bg-secondary text-secondary-foreground',
        outline: 'rounded-full border-border text-foreground bg-transparent',
        destructive: 'rounded-full border-transparent bg-destructive text-destructive-foreground',
        superseded: 'badge-prototype badge-superseded',
        decision: 'badge-prototype badge-decision',
        open: 'badge-prototype badge-open',
        changed: 'badge-prototype badge-decision',
        source: 'badge-source-tag',
        chip: 'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[5px] border border-white/10 bg-white/[0.03] text-gray-400',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)

// `style` is left as an escape hatch for the reference design's exact per-status hex
// colors (decision/open/superseded), which aren't part of the generic variant set.
function Badge({ className, variant, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'span'
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
