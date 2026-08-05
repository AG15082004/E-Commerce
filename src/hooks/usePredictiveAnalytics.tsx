import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"

const mlApi = axios.create({
  baseURL: "/api/ml",
  headers: { "Content-Type": "application/json" },
})

// ─── Types (matching mlAdapter.ts) ───────────────────────────────────────────

export interface CustomerSegment {
  customer_id: string
  customer_name: string
  segment: string
  total_revenue: number
  total_orders: number
  avg_order_value: number
  purchase_frequency: number
  state?: string
  city?: string
  prediction_date?: string
}

export interface ChurnPrediction {
  customer_id: string
  customer_name: string
  churn_probability: number
  risk_level: string
  prediction_date: string
  model_version: string
  state?: string
  city?: string
}

export interface CLVPrediction {
  customer_id: string
  customer_name: string
  predicted_clv: number
  clv_tier: string
  current_revenue: number
  prediction_date: string
  model_version: string
  state?: string
  city?: string
}

export interface ProductRecommendation {
  customer_id: string
  customer_name: string
  product_id: string
  product_name: string
  brand: string
  category: string
  recommendation_score: number
  recommendation_rank: number
  prediction_date: string
}

export interface ProductAffinity {
  source_product: string
  recommended_product: string
  source_category: string
  recommended_category: string
  affinity_score: number
  co_purchase_count: number
}

export interface SalesForecast {
  forecast_date: string
  predicted_revenue: number
  lower_bound: number
  upper_bound: number
  model_version: string
  mae?: number
  mape?: number
}

// ─── Filter params ────────────────────────────────────────────────────────────
export interface MLFilters {
  prediction_date?: string
  segment?: string
  risk_level?: string
  category?: string
  brand?: string
  state?: string
  city?: string
  forecast_period?: string
  recommendation_rank?: string
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 min — ML predictions don't change per-second
  gcTime: 10 * 60 * 1000,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
  retry: 1,
}

export function useCustomerSegments(filters: MLFilters = {}) {
  return useQuery<CustomerSegment[]>({
    queryKey: ["ml-customer-segments", JSON.stringify(filters)],
    queryFn: async () => {
      const res = await mlApi.get<CustomerSegment[]>("/customer-segments", { params: filters })
      return res.data
    },
    ...QUERY_CONFIG,
  })
}

export function useChurnPredictions(filters: MLFilters = {}) {
  return useQuery<ChurnPrediction[]>({
    queryKey: ["ml-churn-predictions", JSON.stringify(filters)],
    queryFn: async () => {
      const res = await mlApi.get<ChurnPrediction[]>("/churn-predictions", { params: filters })
      return res.data
    },
    ...QUERY_CONFIG,
  })
}

export function useCLVPredictions(filters: MLFilters = {}) {
  return useQuery<CLVPrediction[]>({
    queryKey: ["ml-clv-predictions", JSON.stringify(filters)],
    queryFn: async () => {
      const res = await mlApi.get<CLVPrediction[]>("/clv-predictions", { params: filters })
      return res.data
    },
    ...QUERY_CONFIG,
  })
}

export function useProductRecommendations(filters: MLFilters = {}) {
  return useQuery<ProductRecommendation[]>({
    queryKey: ["ml-product-recommendations", JSON.stringify(filters)],
    queryFn: async () => {
      const res = await mlApi.get<ProductRecommendation[]>("/product-recommendations", { params: filters })
      return res.data
    },
    ...QUERY_CONFIG,
  })
}

export function useProductAffinities(filters: MLFilters = {}) {
  return useQuery<ProductAffinity[]>({
    queryKey: ["ml-product-affinities", JSON.stringify(filters)],
    queryFn: async () => {
      const res = await mlApi.get<ProductAffinity[]>("/product-affinities", { params: filters })
      return res.data
    },
    ...QUERY_CONFIG,
  })
}

export function useSalesForecast(filters: MLFilters = {}) {
  return useQuery<SalesForecast[]>({
    queryKey: ["ml-sales-forecast", JSON.stringify(filters)],
    queryFn: async () => {
      const res = await mlApi.get<SalesForecast[]>("/sales-forecast", { params: filters })
      return res.data
    },
    ...QUERY_CONFIG,
  })
}

// ─── Combined hook ────────────────────────────────────────────────────────────
export function usePredictiveAnalytics(filters: MLFilters = {}) {
  const [refreshSeed, setRefreshSeed] = useState(0)

  const activeFilters = useMemo(() => {
    if (refreshSeed > 0) {
      return { ...filters, refresh: "true", _seed: refreshSeed }
    }
    return filters
  }, [filters, refreshSeed])

  const segments = useCustomerSegments(activeFilters)
  const churn = useChurnPredictions(activeFilters)
  const clv = useCLVPredictions(activeFilters)
  const recommendations = useProductRecommendations(activeFilters)
  const affinities = useProductAffinities(activeFilters)
  const forecast = useSalesForecast(activeFilters)

  const isLoading =
    segments.isLoading ||
    churn.isLoading ||
    clv.isLoading ||
    recommendations.isLoading ||
    affinities.isLoading ||
    forecast.isLoading

  const isError =
    segments.isError ||
    churn.isError ||
    clv.isError ||
    recommendations.isError ||
    affinities.isError ||
    forecast.isError

  const refetchAll = () => {
    setRefreshSeed(prev => prev + 1)
  }

  // Clear refresh seed when fetches are complete
  useEffect(() => {
    if (
      refreshSeed > 0 &&
      !segments.isFetching &&
      !churn.isFetching &&
      !clv.isFetching &&
      !recommendations.isFetching &&
      !affinities.isFetching &&
      !forecast.isFetching
    ) {
      setRefreshSeed(0)
    }
  }, [
    refreshSeed,
    segments.isFetching,
    churn.isFetching,
    clv.isFetching,
    recommendations.isFetching,
    affinities.isFetching,
    forecast.isFetching,
  ])

  return {
    segments: segments.data ?? [],
    churn: churn.data ?? [],
    clv: clv.data ?? [],
    recommendations: recommendations.data ?? [],
    affinities: affinities.data ?? [],
    forecast: forecast.data ?? [],
    isLoading,
    isError,
    refetchAll,
    // per-section loading states for granular skeletons
    loadingStates: {
      segments: segments.isLoading,
      churn: churn.isLoading,
      clv: clv.isLoading,
      recommendations: recommendations.isLoading,
      affinities: affinities.isLoading,
      forecast: forecast.isLoading,
    }
  }
}
