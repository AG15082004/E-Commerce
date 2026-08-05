import React, { useEffect, useState } from "react"
import { Select } from "./select"
import { Input } from "./input"
import { Calendar } from "lucide-react"

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onChange: (start: string, end: string) => void
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
}) => {
  const [preset, setPreset] = useState<string>("30")

  // Determine preset if dates change from outside
  useEffect(() => {
    if (startDate === "All" || endDate === "All") {
      setPreset("all")
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 7) {
      setPreset("7")
    } else if (diffDays === 30) {
      setPreset("30")
    } else if (diffDays === 90) {
      setPreset("90")
    } else {
      setPreset("custom")
    }
  }, [startDate, endDate])

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setPreset(val)

    if (val === "custom") return
    if (val === "all") {
      onChange("All", "All")
      return
    }

    const end = new Date()
    const start = new Date()
    const days = parseInt(val)

    start.setDate(end.getDate() - days)

    const endStr = end.toISOString().split("T")[0]
    const startStr = start.toISOString().split("T")[0]
    onChange(startStr, endStr)
  }

  const handleDateChange = (type: "start" | "end", value: string) => {
    if (type === "start") {
      onChange(value, endDate)
    } else {
      onChange(startDate, value)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 transition-colors duration-200">
      <div className="flex items-center gap-2 px-2 text-slate-500 dark:text-slate-400">
        <Calendar size={13} />
        <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">Range</span>
      </div>

      <div className="w-full sm:w-36">
        <Select
          value={preset}
          onChange={handlePresetChange}
          className="h-8 py-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="all">All</option>
          <option value="custom">Custom Range</option>
        </Select>
      </div>

      {preset === "custom" && (
        <div className="flex items-center gap-1.5 animation-fade-in">
          <Input
            type="date"
            value={startDate === "All" ? "" : startDate}
            onChange={(e) => handleDateChange("start", e.target.value)}
            className="h-8 text-xs py-0 w-32 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          />
          <span className="text-xs text-slate-400 dark:text-slate-500">to</span>
          <Input
            type="date"
            value={endDate === "All" ? "" : endDate}
            onChange={(e) => handleDateChange("end", e.target.value)}
            className="h-8 text-xs py-0 w-32 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          />
        </div>
      )}
    </div>
  )
}
export default DateRangePicker
