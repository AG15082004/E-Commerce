import * as React from "react"
import { cn } from "../../utils/cn"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link" | "danger"
  size?: "sm" | "md" | "lg" | "icon"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base: Tighter rounded-sm Fluent styling
          "inline-flex items-center justify-center rounded text-xs font-semibold transition-all duration-120",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A4EF] focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          // Variants (No scaling - hover shift background tint + box shadow lift)
          {
            // Primary Brand blue
            "bg-[#00A4EF] text-white hover:bg-[#0078D4] active:bg-[#005A9E] shadow-sm hover:shadow":
              variant === "primary",
            // Secondary Tint
            "bg-[#FAF9F8] border border-[#E1DFDD] text-[#242424] hover:bg-[#E1F5FE] hover:text-[#005A9E] hover:border-[#B3E5FC]":
              variant === "secondary",
            // Outline
            "border border-[#E1DFDD] bg-transparent text-[#242424] hover:bg-[#E1F5FE] hover:text-[#005A9E] hover:border-[#B3E5FC]":
              variant === "outline",
            // Ghost
            "text-[#605E5C] hover:bg-[#F3F2F1] hover:text-[#242424]":
              variant === "ghost",
            // Link
            "text-[#00A4EF] underline-offset-4 hover:underline p-0":
              variant === "link",
            // Danger
            "bg-[#A80000] text-white hover:bg-[#8A0000] shadow-sm":
              variant === "danger",
          },
          // Sizes
          {
            "h-8 px-3 text-xs": size === "sm",
            "h-9 px-4 py-1.5":  size === "md",
            "h-10 px-6":        size === "lg",
            "h-8 w-8 p-0":      size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
