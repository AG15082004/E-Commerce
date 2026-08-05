import React from "react"
import { useQuery } from "@tanstack/react-query"
import api from "../services/api"
import type { AnalyticsResponse } from "../services/api"

export function useAnalytics(startDate: string, endDate: string, filters: any = {}) {
  return useQuery<AnalyticsResponse>({
    queryKey: ["analytics", startDate, endDate, JSON.stringify(filters)],
    queryFn: async () => {
      const response = await api.get<AnalyticsResponse>("/analytics", {
        params: {
          start: startDate,
          end: endDate,
          ...filters,
        },
      })
      return response.data
    },
    staleTime: 0,           // Always treat data as stale → refetch from Databricks on every access
    gcTime: 0,              // Don't keep old data in cache between navigations
    refetchOnMount: true,   // Refetch whenever a page/component mounts
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    retry: 1,
  })
}

// Passthrough AnalyticsProvider to preserve imports structure
export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}
