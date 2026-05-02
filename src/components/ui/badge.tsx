import React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-stone-200 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-stone-950 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-stone-900 text-stone-50 hover:bg-stone-900/80",
        secondary:
          "border-transparent bg-stone-100 text-stone-900 hover:bg-stone-100/80",
        destructive:
          "border-transparent bg-red-500 text-stone-50 hover:bg-red-500/80",
        outline: "text-stone-950",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps {
  children?: React.ReactNode
  className?: string
  variant?: "default" | "secondary" | "destructive" | "outline" | null
  [key: string]: any
}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </div>
  )
}

export { badgeVariants }
