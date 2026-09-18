import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet'

// A right-edge panel over the current page, for quick "add" forms that shouldn't
// navigate away from whatever the user was looking at (Timeline, Scope, etc.).
// Thin wrapper around shadcn's Sheet (Radix Dialog) so every call site keeps the
// same simple {title, onClose, children} API regardless of the primitive underneath.
export default function SideSheet({ title, onClose, children, width = 440 }) {
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent width={width} className="p-0 flex flex-col h-full overflow-hidden">
        <SheetHeader className="shrink-0">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
