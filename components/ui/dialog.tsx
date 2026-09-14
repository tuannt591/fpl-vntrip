"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  overlayClassName?: string
  onMobileSwipeDown?: () => void
  /**
   * Uses bottom-sheet positioning as the base style. This avoids the desktop
   * dialog translate transforms leaking into sheets on small screens.
   */
  bottomSheet?: boolean
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className,
  children,
  overlayClassName,
  onMobileSwipeDown,
  bottomSheet = false,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...props
}, ref) => {
  const dragStartRef = React.useRef<{ pointerId: number; y: number; timestamp: number } | null>(null)
  const snapBackTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dragOffset, setDragOffset] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isSnappingBack, setIsSnappingBack] = React.useState(false)

  React.useEffect(() => () => {
    if (snapBackTimeoutRef.current) clearTimeout(snapBackTimeoutRef.current)
  }, [])

  const isMobileSheetHandle = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest("[data-bottom-sheet-drag-handle]"))

  const resetToRestingPosition = () => {
    setIsDragging(false)
    setIsSnappingBack(true)
    setDragOffset(0)

    if (snapBackTimeoutRef.current) clearTimeout(snapBackTimeoutRef.current)
    snapBackTimeoutRef.current = setTimeout(() => {
      setIsSnappingBack(false)
      snapBackTimeoutRef.current = null
    }, 180)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !onMobileSwipeDown ||
      event.pointerType !== "touch" ||
      !window.matchMedia("(max-width: 767px)").matches ||
      !isMobileSheetHandle(event.target)
    ) {
      return
    }

    if (snapBackTimeoutRef.current) clearTimeout(snapBackTimeoutRef.current)
    setIsSnappingBack(false)
    dragStartRef.current = {
      pointerId: event.pointerId,
      y: event.clientY,
      timestamp: event.timeStamp,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current
    if (!dragStart || dragStart.pointerId !== event.pointerId) return

    const nextOffset = Math.max(0, event.clientY - dragStart.y)
    if (nextOffset === 0) return

    event.preventDefault()
    setIsDragging(true)
    setDragOffset(Math.min(nextOffset, 320))
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current
    if (!dragStart || dragStart.pointerId !== event.pointerId) return

    dragStartRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const draggedDistance = Math.max(0, event.clientY - dragStart.y)
    const elapsed = Math.max(1, event.timeStamp - dragStart.timestamp)
    const velocity = draggedDistance / elapsed
    const sheetHeight = event.currentTarget.getBoundingClientRect().height
    const closeThreshold = Math.min(160, Math.max(96, sheetHeight * 0.24))
    const shouldClose =
      draggedDistance >= closeThreshold || (draggedDistance >= 48 && velocity >= 0.55)

    if (!shouldClose) {
      resetToRestingPosition()
      return
    }

    setIsDragging(false)
    setDragOffset(0)
    window.requestAnimationFrame(() => onMobileSwipeDown?.())
  }

  const dragStyle = isDragging || isSnappingBack
    ? {
        transform: `translate3d(0, ${dragOffset}px, 0)`,
        transition: isDragging ? "none" : "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
      }
    : undefined
  const overlayDragStyle = isDragging
    ? { opacity: Math.max(0.2, 1 - dragOffset / 320) }
    : undefined

  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} style={overlayDragStyle} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          bottomSheet
            ? "fixed inset-x-0 bottom-0 z-50 flex w-full max-w-none flex-col translate-x-0 translate-y-0 overflow-hidden border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:rounded-lg max-h-full"
            : "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-y-auto max-h-full",
          className
        )}
        style={{ ...style, ...dragStyle }}
        onPointerDown={(event) => {
          onPointerDown?.(event)
          if (!event.defaultPrevented) handlePointerDown(event)
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event)
          if (!event.defaultPrevented) handlePointerMove(event)
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event)
          handlePointerEnd(event)
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event)
          handlePointerEnd(event)
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
