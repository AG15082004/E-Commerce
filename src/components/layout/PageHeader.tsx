import React from "react"
import { Download, RefreshCw } from "lucide-react"
import { Button } from "../ui/button"

interface PageHeaderProps {
  title: string
  description: string
  onExport?: () => void
  onRefresh?: () => void
  isLoading?: boolean
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  onExport,
  onRefresh,
  isLoading = false,
}) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 dark:border-slate-800/80 pb-5 mb-5 transition-colors duration-200">
      {/* Title block */}
      <div>
        <h2 style={{ color: "#1E293B", fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em" }} className="dark:text-slate-200 leading-tight">{title}</h2>
        <p style={{ color: "#64748B", fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: "12px" }} className="dark:text-slate-500 mt-1">{description}</p>
      </div>

      {/* Page Actions block */}
      <div className="flex items-center gap-2">
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="flex-1 sm:flex-initial gap-1.5 h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <Download size={13} className="text-slate-500 dark:text-slate-500" />
            <span>Export CSV</span>
          </Button>
        )}

        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            title="Refresh analytics data"
          >
            <RefreshCw
              size={13}
              className={`text-slate-500 dark:text-slate-400 transition-transform ${
                isLoading ? "animate-spin text-blue-600 dark:text-blue-500" : ""
              }`}
            />
          </Button>
        )}
      </div>
    </div>
  )
}
export default PageHeader
