import * as React from 'react'
import { cn } from '../../lib/utils'

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex w-full min-h-16 rounded-[9px] border border-input bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors resize-y',
        'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
