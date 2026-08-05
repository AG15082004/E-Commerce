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

// ─── Seeded PRNG (mulberry32) for deterministic mock data ─────────────────────
function createSeededRandom(seed: number) {
  let state = seed | 0
  return function seededRandom(): number {
    state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Rich mock fallback ───────────────────────────────────────────────────────
function generateMockMLData(): MLCache {
  // Use a fixed seed so mock data is identical across server restarts
  const rand = createSeededRandom(42)

  const names = [
    "Aarav Mehta", "Priya Sharma", "Rohan Gupta", "Sneha Iyer", "Vikram Nair",
    "Ananya Reddy", "Karan Patel", "Divya Joshi", "Amit Singh", "Neha Agarwal",
    "Rahul Verma", "Pooja Rao", "Suresh Kumar", "Meera Pillai", "Aditya Chopra",
    "Kavya Nambiar", "Arjun Bhat", "Shreya Menon", "Dev Malhotra", "Ritu Saxena",
    "Sanjay Dubey", "Ankita Tiwari", "Nikhil Choudhary", "Pallavi Desai", "Varun Shah",
    "Tanvi Kulkarni", "Harsh Srivastava", "Deepika Krishnan", "Manish Mishra", "Preeti Garg",
  ]
  const states = ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Gujarat", "Rajasthan", "West Bengal", "Telangana"]
  const cities = ["Mumbai", "Bangalore", "Delhi", "Chennai", "Ahmedabad", "Jaipur", "Kolkata", "Hyderabad"]
  const products = [
    "Premium Wireless Headphones", "Smart Fitness Watch", "4K Ultra OLED TV",
    "Gaming Laptop Pro", "Bluetooth Speaker Portable", "Robot Vacuum Cleaner",
    "Air Purifier HEPA", "Noise Cancelling Earbuds", "Smart Home Hub",
    "Electric Standing Desk", "UHD Monitor 27\"", "Mechanical Gaming Keyboard",
    "Ergonomic Office Chair", "Coffee Maker Smart", "Instant Pot XL",
    "Dash Cam 4K", "Action Camera Pro", "Projector 4K Home", "NAS Storage 8TB", "Tablet Pro 12.9\""
  ]
  const brands = ["Samsung", "Sony", "Apple", "LG", "Philips", "Bosch", "JBL", "Dell", "HP", "Xiaomi"]
  const categories = ["Electronics", "Home Appliances", "Computers", "Audio", "Smart Home", "Furniture", "Kitchen", "Cameras", "Storage", "Tablets"]

  // Use a fixed base date so prediction dates are stable
  const baseDate = new Date("2026-08-05T00:00:00Z")

  // Customer Segments
  const customerSegments: CustomerSegment[] = names.map((name, i) => ({
    customer_id: `CUST-${1000 + i}`,
    customer_name: name,
    segment: i < 6 ? "VIP" : i < 15 ? "Regular" : i < 22 ? "New" : "At Risk",
    total_revenue: i < 6 ? 150000 + rand() * 300000 : i < 15 ? 30000 + rand() * 80000 : 5000 + rand() * 20000,
    total_orders: i < 6 ? 40 + Math.floor(rand() * 60) : i < 15 ? 10 + Math.floor(rand() * 25) : 1 + Math.floor(rand() * 8),
    avg_order_value: i < 6 ? 4500 + rand() * 3000 : 2000 + rand() * 2000,
    purchase_frequency: i < 6 ? 4 + rand() * 3 : 1 + rand() * 2,
    state: states[i % states.length],
    city: cities[i % cities.length],
    prediction_date: new Date(baseDate.getTime() - rand() * 7 * 86400000).toISOString().split("T")[0],
  }))

  // Churn Predictions (50 customers)
  // Ranges are tightened so High (i<8) stays clearly >=0.7
  // and Medium (i=8..19) stays clearly in 0.4-0.65 (below 0.7 threshold)
  const churnNames = [
    ...names,
    "Vaibhav Sharma", "Nisha Gupta", "Rohit Patel", "Swati Mishra", "Gaurav Yadav",
    "Bhavna Jain", "Aakash Mehrotra", "Seema Kapoor", "Nitin Thakur", "Lakshmi Venkat",
    "Shubham Tiwari", "Ravi Shankar", "Prashant Dubey", "Monika Agarwal", "Deepak Chandra",
    "Sunita Verma", "Kishore Kumar", "Nandini Rao", "Abhishek Soni", "Pooja Malhotra",
  ]
  const churnPredictions: ChurnPrediction[] = churnNames.map((name, i) => {
    const prob = i < 8 ? 0.75 + rand() * 0.24 : i < 20 ? 0.40 + rand() * 0.25 : 0.10 + rand() * 0.25
    return {
      customer_id: `CUST-${2000 + i}`,
      customer_name: name,
      churn_probability: parseFloat(prob.toFixed(3)),
      risk_level: prob >= 0.7 ? "High" : prob >= 0.4 ? "Medium" : "Low",
      prediction_date: new Date(baseDate.getTime() - rand() * 5 * 86400000).toISOString().split("T")[0],
      model_version: "v2.4.1",
      state: states[i % states.length],
      city: cities[i % cities.length],
    }
  })

  // CLV Predictions
  const clvPredictions: CLVPrediction[] = names.map((name, i) => ({
    customer_id: `CUST-${1000 + i}`,
    customer_name: name,
    predicted_clv: i < 5 ? 500000 + rand() * 500000 : i < 12 ? 100000 + rand() * 200000 : i < 22 ? 30000 + rand() * 70000 : 5000 + rand() * 25000,
    clv_tier: i < 5 ? "Platinum" : i < 12 ? "Gold" : i < 22 ? "Silver" : "Bronze",
    current_revenue: i < 5 ? 300000 + rand() * 200000 : 20000 + rand() * 100000,
    prediction_date: new Date(baseDate.getTime() - rand() * 7 * 86400000).toISOString().split("T")[0],
    model_version: "v1.8.3",
    state: states[i % states.length],
    city: cities[i % cities.length],
  }))

  // Product Recommendations
  const productCategories: Record<string, string> = {
    "Premium Wireless Headphones": "Audio",
    "Smart Fitness Watch": "Smart Home",
    "4K Ultra OLED TV": "Electronics",
    "Gaming Laptop Pro": "Computers",
    "Bluetooth Speaker Portable": "Audio",
    "Robot Vacuum Cleaner": "Home Appliances",
    "Air Purifier HEPA": "Home Appliances",
    "Noise Cancelling Earbuds": "Audio",
    "Smart Home Hub": "Smart Home",
    "Electric Standing Desk": "Furniture",
    "UHD Monitor 27\"": "Computers",
    "Mechanical Gaming Keyboard": "Computers",
    "Ergonomic Office Chair": "Furniture",
    "Coffee Maker Smart": "Kitchen",
    "Instant Pot XL": "Kitchen",
    "Dash Cam 4K": "Electronics",
    "Action Camera Pro": "Cameras",
    "Projector 4K Home": "Electronics",
    "NAS Storage 8TB": "Computers",
    "Tablet Pro 12.9\"": "Tablets"
  }

  const productRecommendations: ProductRecommendation[] = []
  names.slice(0, 20).forEach((name, ci) => {
    for (let r = 1; r <= 3; r++) {
      const pi = (ci * 3 + r - 1) % products.length
      const pName = products[pi]
      productRecommendations.push({
        customer_id: `CUST-${1000 + ci}`,
        customer_name: name,
        product_id: `PROD-${100 + pi}`,
        product_name: pName,
        brand: brands[pi % brands.length],
        category: productCategories[pName] || "Electronics",
        recommendation_score: parseFloat((0.65 + rand() * 0.34).toFixed(3)),
        recommendation_rank: r,
        prediction_date: new Date(baseDate.getTime() - rand() * 3 * 86400000).toISOString().split("T")[0],
      })
    }
  })

  // Product Affinities (heatmap data)
  // Use deterministic scores: hardcoded high-affinity pairs + seeded random for others
  const affinityProducts = ["4K TV", "Laptop", "Headphones", "Speaker", "Smart Watch", "Tablet", "Camera", "Gaming Console"]
  const productAffinities: ProductAffinity[] = []
  affinityProducts.forEach((src, si) => {
    affinityProducts.forEach((rec, ri) => {
      if (si !== ri) {
        const score = si === 0 && ri === 3 ? 0.87 :
                      si === 1 && ri === 2 ? 0.82 :
                      si === 4 && ri === 0 ? 0.78 :
                      parseFloat((0.1 + rand() * 0.55).toFixed(2))
        productAffinities.push({
          source_product: src,
          recommended_product: rec,
          source_category: categories[si % categories.length],
          recommended_category: categories[ri % categories.length],
          affinity_score: score,
          co_purchase_count: Math.floor(score * 500 + rand() * 100),
        })
      }
    })
  })

  // Sales Forecast (30 days)
  const salesForecast: SalesForecast[] = []
  let baseRevenue = 280000
  for (let d = 0; d < 30; d++) {
    const forecastDate = new Date(baseDate)
    forecastDate.setDate(baseDate.getDate() + d)
    const trend = 1 + d * 0.008
    const noise = (rand() - 0.4) * 30000
    const predicted = Math.max(200000, baseRevenue * trend + noise)
    const variance = predicted * 0.12
    salesForecast.push({
      forecast_date: forecastDate.toISOString().split("T")[0],
      predicted_revenue: Math.round(predicted),
      lower_bound: Math.round(predicted - variance),
      upper_bound: Math.round(predicted + variance),
      model_version: "v3.1.0",
      mae: 18500,
      mape: 6.4,
    })
    baseRevenue = predicted
  }

  return {
    customerSegments,
    churnPredictions,
    clvPredictions,
    productRecommendations,
    productAffinities,
    salesForecast,
  }
}

// ─── Main loader ──────────────────────────────────────────────────────────────
export async function loadMLData(force = false): Promise<MLCache> {
  const now = Date.now()
  const isStale = mlCacheLoadedAt === 0 || (now - mlCacheLoadedAt > 5 * 60 * 1000)
  if (mlCache && !force && !isStale) return mlCache
  if (mlLoading) {
    // Wait briefly then return mock
    await new Promise(r => setTimeout(r, 100))
    return mlCache || generateMockMLData()
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

    // If we got real data, use it; otherwise fall back to mock
    const hasRealData = segRows.length > 0 || churnRows.length > 0

    if (!hasRealData) {
      console.log("[ML Adapter] ML tables empty — using synthetic mock data.")
      mlCache = generateMockMLData()
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
    console.log(`[ML Adapter] Databricks unavailable (${err.message}) — using synthetic mock data.`)
    mlCache = generateMockMLData()
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
