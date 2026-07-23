"use client"

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"

import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 data-horizontal:h-px data-horizontal:w-full data-horizontal:shadow-[0_1px_0_var(--neu-light),0_-1px_0_var(--neu-dark)] data-vertical:w-px data-vertical:self-stretch data-vertical:shadow-[1px_0_0_var(--neu-light),-1px_0_0_var(--neu-dark)]",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
