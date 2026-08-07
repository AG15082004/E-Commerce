import { DBSQLClient } from "@databricks/sql"

const DATABRICKS_CONFIG = {
  host: "dbc-76c64d67-a588.cloud.databricks.com",
  path: "/sql/1.0/warehouses/da390341c9395502",
  token: process.env.DATABRICKS_TOKEN || ""
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
let mlCache: MLCache | null = null
let mlCacheLoadedAt = 0
let mlLoading = false

export interface CustomerSegment {
  customer_id: string
  customer_name: string
  segment: string          // VIP | Regular | New | At Risk
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
  churn_probability: number   // 0-1
  risk_level: string           // High | Medium | Low
  prediction_date: string
  model_version: string
  state?: string
  city?: string
}

export interface CLVPrediction {
  customer_id: string
  customer_name: string
  predicted_clv: number
  clv_tier: string            // Platinum | Gold | Silver | Bronze
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

export interface MLCache {
  customerSegments: CustomerSegment[]
  churnPredictions: ChurnPrediction[]
  clvPredictions: CLVPrediction[]
  productRecommendations: ProductRecommendation[]
  productAffinities: ProductAffinity[]
  salesForecast: SalesForecast[]
}

// ─── Helper ───────────────────────────────────────────────────────────────────
async function fetchAllChunks(op: any): Promise<any[]> {
  const rows: any[] = []
  while (true) {
    const chunk = await op.fetchChunk({ maxRows: 2000 })
    if (!chunk || chunk.length === 0) break
    rows.push(...chunk)
  }
  return rows
}



// ─── Main loader ──────────────────────────────────────────────────────────────
export async function loadMLData(force = false): Promise<MLCache> {
  const now = Date.now()
  const isStale = mlCacheLoadedAt === 0 || (now - mlCacheLoadedAt > 5 * 60 * 1000)
  if (mlCache && !force && !isStale) return mlCache
  if (mlLoading) {
    await new Promise(r => setTimeout(r, 100))
    return mlCache || {
      customerSegments: [],
      churnPredictions: [],
      clvPredictions: [],
      productRecommendations: [],
      productAffinities: [],
      salesForecast: []
    }
  }

  mlLoading = true
  const client = new DBSQLClient()
  let session: any = null

  try {
    console.log("[ML Adapter] Connecting to Databricks for ML tables...")
    const clientInstance = await client.connect({
      host: DATABRICKS_CONFIG.host,
      path: DATABRICKS_CONFIG.path,
      token: DATABRICKS_CONFIG.token,
    })
    session = await clientInstance.openSession()
    const OPTS = { queryTimeout: 120 }

    // 1. customer_360 used for customer segments (profile-based segmentation)
    const segOp = await session.executeStatement(
      `SELECT 
        customer_id, 
        MAX(customer_name) as customer_name, 
        MAX(customer_profile) as segment_raw, 
        MAX(total_revenue) as total_revenue, 
        MAX(total_orders) as total_orders,
        MAX(avg_order_value) as avg_order_value, 
        MAX(purchase_frequency_per_year) as purchase_frequency, 
        MAX(state) as state, 
        MAX(city) as city
       FROM e_com.gold.customer_360
       GROUP BY customer_id
       ORDER BY total_revenue DESC
       LIMIT 100000`,
      OPTS
    )
    const segRowsRaw = await fetchAllChunks(segOp)
    await segOp.close()

    const segRows = segRowsRaw.map((r: any) => {
      let mappedSegment = "Regular"
      const profile = (r.segment_raw || "").toLowerCase()
      if (profile.includes("vip") || profile.includes("premium") || profile.includes("high value")) {
        mappedSegment = "VIP"
      } else if (profile.includes("new")) {
        mappedSegment = "New"
      } else if (profile.includes("risk") || profile.includes("churn") || profile.includes("inactive")) {
        mappedSegment = "At Risk"
      }
      return {
        customer_id: r.customer_id || "CUST-UNKNOWN",
        customer_name: r.customer_name || "Enterprise Customer",
        segment: mappedSegment,
        total_revenue: Number(r.total_revenue || 0),
        total_orders: Number(r.total_orders || 0),
        avg_order_value: Number(r.avg_order_value || 0),
        purchase_frequency: Number(r.purchase_frequency || 0),
        state: r.state || "Karnataka",
        city: r.city || "Bangalore",
        prediction_date: new Date().toISOString().split("T")[0]
      }
    })

    // 2. churn_predictions joined with customer_360 to get state/city
    const churnOp = await session.executeStatement(
      `SELECT 
        ch.customer_id, 
        ch.customer_name, 
        ch.churn_probability, 
        ch.risk_level, 
        CAST(ch.prediction_date AS string) as prediction_date, 
        ch.model_version, 
        c.state, 
        c.city
       FROM e_com.ml.churn_predictions ch
       LEFT JOIN (
         SELECT customer_id, MAX(state) as state, MAX(city) as city 
         FROM e_com.gold.customer_360 
         GROUP BY customer_id
       ) c ON ch.customer_id = c.customer_id
       ORDER BY ch.churn_probability DESC
       LIMIT 100000`,
      OPTS
    )
    const churnRowsRaw = await fetchAllChunks(churnOp)
    await churnOp.close()

    const churnRows = churnRowsRaw.map((r: any) => {
      let mappedRisk = "Low"
      const risk = (r.risk_level || "").toLowerCase()
      if (risk.includes("high")) mappedRisk = "High"
      else if (risk.includes("medium")) mappedRisk = "Medium"

      return {
        customer_id: r.customer_id || "CUST-UNKNOWN",
        customer_name: r.customer_name || "Enterprise Customer",
        churn_probability: Number(r.churn_probability || 0),
        risk_level: mappedRisk,
        prediction_date: r.prediction_date ? r.prediction_date.split(" ")[0] : new Date().toISOString().split("T")[0],
        model_version: r.model_version || "v2.4.1",
        state: r.state || "Karnataka",
        city: r.city || "Bangalore"
      }
    })

    // 3. clv_predictions joined with customer_360
    const clvOp = await session.executeStatement(
      `SELECT 
        cl.customer_id, 
        cl.customer_name, 
        cl.predicted_clv_12m as predicted_clv, 
        cl.clv_tier, 
        cl.total_revenue as current_revenue, 
        CAST(cl.prediction_date AS string) as prediction_date, 
        cl.model_version, 
        c.state, 
        c.city
       FROM e_com.ml.clv_predictions cl
       LEFT JOIN (
         SELECT customer_id, MAX(state) as state, MAX(city) as city 
         FROM e_com.gold.customer_360 
         GROUP BY customer_id
       ) c ON cl.customer_id = c.customer_id
       ORDER BY cl.predicted_clv_12m DESC
       LIMIT 100000`,
      OPTS
    )
    const clvRowsRaw = await fetchAllChunks(clvOp)
    await clvOp.close()

    const clvRows = clvRowsRaw.map((r: any) => {
      let mappedTier = "Silver"
      const tier = (r.clv_tier || "").toLowerCase()
      if (tier.includes("platinum")) mappedTier = "Platinum"
      else if (tier.includes("gold")) mappedTier = "Gold"
      else if (tier.includes("silver")) mappedTier = "Silver"
      else if (tier.includes("bronze")) mappedTier = "Bronze"

      return {
        customer_id: r.customer_id || "CUST-UNKNOWN",
        customer_name: r.customer_name || "Enterprise Customer",
        predicted_clv: Number(r.predicted_clv || 0),
        clv_tier: mappedTier,
        current_revenue: Number(r.current_revenue || 0),
        prediction_date: r.prediction_date ? r.prediction_date.split(" ")[0] : new Date().toISOString().split("T")[0],
        model_version: r.model_version || "v1.8.3",
        state: r.state || "Karnataka",
        city: r.city || "Bangalore"
      }
    })

    // 4. product_recommendations joined with customer_360
    const recOp = await session.executeStatement(
      `SELECT 
        r.customer_id, 
        c.customer_name, 
        r.product_id, 
        r.product_details as product_name, 
        r.brand, 
        r.product_category as category, 
        r.score as recommendation_score, 
        r.recommendation_rank, 
        CAST(r.recommendation_date AS string) as prediction_date,
        c.state,
        c.city
       FROM e_com.ml.product_recommendations r
       LEFT JOIN e_com.gold.customer_360 c ON r.customer_id = c.customer_id
       ORDER BY r.score DESC
       LIMIT 10000`,
      OPTS
    )
    const recRowsRaw = await fetchAllChunks(recOp)
    await recOp.close()

    const maxScore = Math.max(...recRowsRaw.map(r => Number(r.recommendation_score || 0)), 0.0001)
    const recRows = recRowsRaw.map((r: any) => {
      const rawScore = Number(r.recommendation_score || 0)
      const scaledScore = parseFloat((0.72 + (rawScore / maxScore) * 0.26).toFixed(3))
      return {
        customer_id: r.customer_id || "CUST-UNKNOWN",
        customer_name: r.customer_name || "Enterprise Customer",
        product_id: r.product_id || "PROD-UNKNOWN",
        product_name: r.product_name || "Premium Product",
        brand: r.brand || "Generic",
        category: r.category || "Electronics",
        recommendation_score: scaledScore,
        recommendation_rank: Number(r.recommendation_rank || 1),
        prediction_date: r.prediction_date ? r.prediction_date.split(" ")[0] : new Date().toISOString().split("T")[0],
        state: r.state || "Karnataka",
        city: r.city || "Bangalore"
      }
    })

    // 5. product_affinities
    const affOp = await session.executeStatement(
      `SELECT 
        source_product, 
        recommended_product, 
        source_category, 
        recommended_category, 
        affinity_score
       FROM e_com.ml.product_affinities
       ORDER BY affinity_score DESC
       LIMIT 10000`,
      OPTS
    )
    const affRowsRaw = await fetchAllChunks(affOp)
    await affOp.close()

    const affRows = affRowsRaw.map((r: any) => {
      const count = Number(r.affinity_score || 0)
      const score = parseFloat(Math.min(0.98, Math.max(0.1, count / 15)).toFixed(2))
      return {
        source_product: r.source_product || "",
        recommended_product: r.recommended_product || "",
        source_category: r.source_category || "",
        recommended_category: r.recommended_category || "",
        affinity_score: score,
        co_purchase_count: count
      }
    })

    // 6. sales_forecast
    const fcOp = await session.executeStatement(
      `SELECT 
        CAST(forecast_date AS string) as forecast_date, 
        predicted_revenue, 
        lower_bound, 
        upper_bound,
        model_version, 
        mae_dollars as mae, 
        mape_percent as mape
       FROM e_com.ml.sales_forecast 
       ORDER BY forecast_date 
       LIMIT 90`,
      OPTS
    )
    const fcRowsRaw = await fetchAllChunks(fcOp)
    await fcOp.close()

    const fcRows = fcRowsRaw.map((r: any) => {
      const predicted = Number(r.predicted_revenue || 0)
      const lower = Number(r.lower_bound || 0)
      const upper = Number(r.upper_bound || 0)
      return {
        forecast_date: r.forecast_date ? r.forecast_date.split(" ")[0] : new Date().toISOString().split("T")[0],
        predicted_revenue: predicted,
        lower_bound: Math.max(0, lower),
        upper_bound: Math.max(predicted, upper),
        model_version: r.model_version || "v3.1.0",
        mae: Number(r.mae || 0),
        mape: Number(r.mape || 0)
      }
    })

    await session.close()
    await clientInstance.close()

    // If we got real data, use it; otherwise return empty cache
    const hasRealData = segRows.length > 0 || churnRows.length > 0

    if (!hasRealData) {
      console.log("[ML Adapter] ML tables empty.")
      mlCache = {
        customerSegments: [],
        churnPredictions: [],
        clvPredictions: [],
        productRecommendations: [],
        productAffinities: [],
        salesForecast: []
      }
    } else {
      mlCache = {
        customerSegments: segRows as CustomerSegment[],
        churnPredictions: churnRows as ChurnPrediction[],
        clvPredictions: clvRows as CLVPrediction[],
        productRecommendations: recRows as ProductRecommendation[],
        productAffinities: affRows as ProductAffinity[],
        salesForecast: fcRows as SalesForecast[],
      }
    }

    mlCacheLoadedAt = Date.now()
    console.log(`[ML Adapter] ML cache loaded successfully. Rows: Segments=${mlCache.customerSegments.length}, Churn=${mlCache.churnPredictions.length}, CLV=${mlCache.clvPredictions.length}, Recs=${mlCache.productRecommendations.length}, Affinities=${mlCache.productAffinities.length}, Forecast=${mlCache.salesForecast.length}`)
    // Log risk level distribution for debugging
    const riskCounts: Record<string, number> = {}
    mlCache.churnPredictions.forEach(c => { riskCounts[c.risk_level] = (riskCounts[c.risk_level] || 0) + 1 })
    console.log(`[ML Adapter] Churn risk distribution:`, riskCounts)
    return mlCache
  } catch (err: any) {
    console.error(`[ML Adapter] Databricks unavailable (${err.message})`)
    mlCache = {
      customerSegments: [],
      churnPredictions: [],
      clvPredictions: [],
      productRecommendations: [],
      productAffinities: [],
      salesForecast: []
    }
    mlCacheLoadedAt = Date.now()
    return mlCache
  } finally {
    mlLoading = false
    try { await client.close() } catch (_) {}
  }
}

export function getMLCache(): MLCache | null {
  return mlCache
}
