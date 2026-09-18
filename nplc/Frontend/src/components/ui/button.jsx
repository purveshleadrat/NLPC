import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] text-[12px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-90',
        brand: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm',
        outline: 'border border-border bg-transparent text-foreground hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:opacity-80',
        ghost: 'text-foreground hover:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
        tabActive: 'btn-prototype-tab-active',
        tabInactive: 'btn-prototype-tab',
        pillActive: 'btn-prototype-pill-active',
        pillInactive: 'btn-prototype-pill',
      },
      size: {
        default: 'h-7.5 px-3 py-1.5',
        sm: 'h-6.5 px-2.5 text-[11px]',
        lg: 'h-8.5 px-4 text-[13px]',
        icon: 'h-7.5 w-7.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
