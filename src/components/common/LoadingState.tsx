import React from "react"
import { cn } from "../../utils/cn"

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn("animate-pulse rounded bg-slate-200/80", className)}
      {...props}
    />
  )
}

export const KPISkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm flex flex-col gap-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2 items-center">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="space-y-3">
        <div className="flex gap-4 border-b border-slate-50 pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 items-center py-2 border-b border-slate-50/50">
            {Array.from({ length: 5 }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4 flex-1", c === 0 ? "w-1/3" : "")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Filters skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPISkeleton />
        <KPISkeleton />
        <KPISkeleton />
        <KPISkeleton />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-[280px] w-full" />
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-[280px] w-full" />
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <TableSkeleton rows={4} />
      </div>
    </div>
  )
}
