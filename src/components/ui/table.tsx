import * as React from "react"
import { cn } from "../../utils/cn"

export const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>((({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-xs border-collapse", className)}
      {...props}
    />
  </div>
)))
Table.displayName = "Table"

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "border-b border-[#E1DFDD] bg-[#F3F2F1]",
      className
    )}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-[#E1DFDD] bg-[#FAF9F8] font-semibold [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-[#E1DFDD]",
      "transition-colors duration-100",
      "hover:bg-[#E1F5FE]",  // Light Ice Blue active hover highlight
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-9 px-4 text-left align-middle font-semibold",
      "text-[#242424]",
      "[&:has([role=checkbox])]:pr-0 [&:has([role=checkbox])]:pl-4",
      "text-[10px] tracking-wider uppercase",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-3 align-middle [&:has([role=checkbox])]:pr-0 [&:has([role=checkbox])]:pl-4",
      "text-[#242424] font-normal text-xs",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

export const TableCaption = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-xs text-[#605E5C]", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"
