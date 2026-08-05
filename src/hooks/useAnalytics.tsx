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
    staleTime: 30000,         // Cache dashboard data for 30 seconds to make filtering instant
    gcTime: 5 * 60 * 1000,    // Keep unused data in cache for 5 minutes
    refetchOnMount: true,     // Refetch in background on mount if stale
    refetchOnWindowFocus: false, // Don't trigger full reload on focus
    retry: 1,
  })
}

// Passthrough AnalyticsProvider to preserve imports structure
export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}
