import * as React from "react"
import { cn } from "../../utils/cn"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded border border-[#E1DFDD]",
            "bg-[#FFFFFF] text-[#242424] text-xs font-semibold",
            "pl-3 pr-8 py-1.5",
            "focus:outline-none focus:border-[#00A4EF] focus:ring-1 focus:ring-[#00A4EF]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all appearance-none cursor-pointer",
            "hover:bg-[#FAF9F8] hover:border-[#C8C6C4]",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-2.5 pointer-events-none text-[#605E5C]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    )
  }
)
Select.displayName = "Select"
