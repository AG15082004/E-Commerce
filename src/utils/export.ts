/**
 * Cleanly escapes a table cell value for CSV formatting
 */
function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) return ""
  let str = String(val)
  // Escape quotes
  str = str.replace(/"/g, '""')
  // Wrap in quotes if comma, quote, or newline is present
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str}"`
  }
  return str
}

/**
 * Downloads a list of objects as a CSV spreadsheet
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename = "analytics-export.csv"
) {
  if (!data || data.length === 0) {
    console.warn("No data to export")
    return
  }

  // Get keys from first object
  const headers = Object.keys(data[0])
  
  // Format row headers
  const csvHeaders = headers.map(h => escapeCSVValue(h)).join(",")
  
  // Format rows
  const csvRows = data.map(row => 
    headers.map(header => escapeCSVValue(row[header])).join(",")
  )

  // Assemble full content
  const csvContent = [csvHeaders, ...csvRows].join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  
  // Trigger client browser download
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
