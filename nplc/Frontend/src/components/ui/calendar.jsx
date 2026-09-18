import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-2 select-none', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-2',
        month_caption: 'flex justify-center pt-1 relative items-center text-[13px] font-semibold text-gray-100',
        caption_label: 'text-[13px] font-semibold text-gray-100',
        nav: 'flex items-center gap-1',
        button_previous: 'absolute left-1 top-1 h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-white/10 rounded-md flex items-center justify-center transition-colors text-gray-300 cursor-pointer',
        button_next: 'absolute right-1 top-1 h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-white/10 rounded-md flex items-center justify-center transition-colors text-gray-300 cursor-pointer',
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex justify-between',
        weekday: 'text-gray-500 rounded-md w-8 font-normal text-[11px] text-center',
        week: 'flex w-full mt-1 justify-between',
        day: 'h-8 w-8 text-center text-[12px] p-0 relative focus-within:relative focus-within:z-20',
        day_button: 'h-8 w-8 p-0 font-normal rounded-[6px] hover:bg-white/10 transition-colors flex items-center justify-center text-gray-300 cursor-pointer',
        selected: '[&>.rdp-day_button]:!bg-emerald-600 [&>.rdp-day_button]:!text-white [&>.rdp-day_button]:font-semibold',
        today: '[&>.rdp-day_button]:border [&>.rdp-day_button]:border-emerald-500/50 [&>.rdp-day_button]:text-emerald-400',
        outside: 'opacity-30 text-gray-500',
        disabled: 'text-gray-600 opacity-50 cursor-not-allowed',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) => {
          return orientation === 'left' ? (
            <ChevronLeft className="size-4" {...chevronProps} />
          ) : (
            <ChevronRight className="size-4" {...chevronProps} />
          )
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
