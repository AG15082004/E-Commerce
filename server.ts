import express from "express"
import cors from "cors"
import { getAnalyticsData } from "./src/utils/analyticsEngine"
import { loadAllDatabricksData } from "./src/utils/databricksAdapter"
import { loadMLData } from "./src/utils/mlAdapter"
import { executeSQL } from "./src/server/services/databricksConnector"

const app = express()
app.use(cors())
app.use(express.json())

const port = process.env.PORT || 5000

let lastLoadedTime = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // Cache for 5 minutes to prevent spamming Databricks
let activeLoadPromise: Promise<boolean> | null = null

async function ensureDataLoaded(force = false): Promise<boolean> {
  const now = Date.now()

  // If there's already a loading request in progress, await it to prevent concurrent loads
  if (activeLoadPromise) {
    console.log("[Databricks Server] Awaiting existing loader promise...")
    return activeLoadPromise
  }

  const isStale = lastLoadedTime === 0 || (now - lastLoadedTime > CACHE_TTL_MS)
  if (force || isStale) {
    console.log(`[Databricks Server] Triggering Databricks load (force=${force}, stale=${isStale})...`)
    activeLoadPromise = (async () => {
      try {
        const success = await loadAllDatabricksData()
        if (success) {
          lastLoadedTime = Date.now()
          console.log(`\x1b[32m[Databricks Server] Data cache updated successfully at ${new Date().toLocaleTimeString()}\x1b[0m`)
          return true
        }
        return false
      } catch (e: any) {
        console.error(`[Databricks Server] Failed background reload: ${e.message}`)
        return false
      } finally {
        activeLoadPromise = null
      }
    })()
    return activeLoadPromise
  }
  return false
}



// Background startup load — overrides mock data with live Databricks data if available
ensureDataLoaded().then(success => {
  if (success) {
    console.log("\x1b[32m[Databricks Backend] Initial Gold data cache pre-warmed.\x1b[0m")
  } else {
    console.log("\x1b[33m[Databricks Backend] Databricks unavailable — running with mock fallback data.\x1b[0m")
  }
})

async function fetchDynamicTotals(start: string, end: string, filters: any) {
  let query = `
    SELECT 
      COUNT(DISTINCT order_id) AS total_orders,
      COUNT(DISTINCT customer_id) AS total_customers,
      SUM(revenue) AS total_revenue,
      SUM(profit_amount) AS total_profit,
      SUM(quantity) AS total_quantity
    FROM e_com.gold.sales_summary
    WHERE 1=1
  `;

  const isAllTime = start === "All" || end === "All";
  if (!isAllTime) {
    query += ` AND order_date >= '${start}' AND order_date <= '${end}'`;
  }
  if (filters.state && filters.state !== "All") {
    query += ` AND state = '${filters.state}'`;
  }
  if (filters.city && filters.city !== "All") {
    query += ` AND city = '${filters.city}'`;
  }
  if (filters.category && filters.category !== "All") {
    query += ` AND product_category = '${filters.category}'`;
  }
  if (filters.brand && filters.brand !== "All") {
    query += ` AND brand = '${filters.brand}'`;
  }
  if (filters.status && filters.status !== "All") {
    query += ` AND order_status = '${filters.status}'`;
  }
  if (filters.warehouse && filters.warehouse !== "All") {
    query += ` AND warehouse = '${filters.warehouse}'`;
  }
  if (filters.paymentMethod && filters.paymentMethod !== "All") {
    query += ` AND payment_method = '${filters.paymentMethod}'`;
  }

  const res = await executeSQL(query);
  if (res && res.rows && res.rows.length > 0) {
    const row = res.rows[0];
    const tr = Number(row.total_revenue || 0);
    const tp = Number(row.total_profit || 0);
    const to = Number(row.total_orders || 0);
    const tc = Number(row.total_customers || 0);
    const tq = Number(row.total_quantity || 0);

    return {
      totalRevenue: tr,
      totalProfit: tp,
      orderCount: to,
      totalCustomers: tc,
      avgOrderValue: to > 0 ? tr / to : 0,
      profitMargin: tr > 0 ? (tp / tr) * 100 : 0,
      activeCustomers: tc,
      totalProductsSold: tq
    };
  }
  return null;
}

app.get("/api/analytics", async (req, res) => {
  const params = req.query as any
  const start = params.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const end = params.end || new Date().toISOString().split("T")[0]
  const forceRefresh = params.refresh === "true"

  console.log(`[API] GET query. Range: ${start} to ${end}. Filters: State=${params.state || "All"}, Category=${params.category || "All"}. Refresh=${forceRefresh}`)

  // Attempt to reload from Databricks if forced or stale
  await ensureDataLoaded(forceRefresh)

  // 1. Fetch dynamic, database-wide totals matching the active filters
  let dbTotals = null
  try {
    dbTotals = await fetchDynamicTotals(start, end, params)
    console.log(`[API] Successfully retrieved dynamic DB totals:`, dbTotals)
  } catch (err: any) {
    console.error(`[API] Failed to fetch dynamic database totals, falling back:`, err.message)
  }

  // 2. Respond — compiler combines sample charts with true dynamic dbTotals overrides
  const dashboardData = getAnalyticsData(start, end, params, dbTotals)
  res.json(dashboardData)
})

// ─── ML Predictive Analytics Endpoints ───────────────────────────────────────

async function getMLData(force = false) {
  return await loadMLData(force)
}

// Helper: apply common filters to an array
function applyMLFilters<T extends Record<string, any>>(rows: T[], params: any): T[] {
  let result = rows
  if (params.segment && params.segment !== "All") {
    result = result.filter(r => r.segment === undefined || r.segment === params.segment)
  }
  if (params.risk_level && params.risk_level !== "All") {
    result = result.filter(r => r.risk_level === undefined || r.risk_level === params.risk_level)
  }
  if (params.category && params.category !== "All") {
    result = result.filter(r => r.category === undefined || r.category === params.category)
  }
  if (params.brand && params.brand !== "All") {
    result = result.filter(r => r.brand === undefined || r.brand === params.brand)
  }
  if (params.state && params.state !== "All") {
    result = result.filter(r => r.state === undefined || r.state === params.state)
  }
  if (params.city && params.city !== "All") {
    result = result.filter(r => r.city === undefined || r.city === params.city)
  }
  if (params.recommendation_rank && params.recommendation_rank !== "All") {
    const rank = Number(params.recommendation_rank)
    result = result.filter(r => r.recommendation_rank === undefined || r.recommendation_rank <= rank)
  }
  return result
}

app.get("/api/ml/customer-segments", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true"
    const ml = await getMLData(forceRefresh)
    const filtered = applyMLFilters(ml.customerSegments, req.query)
    res.json(filtered)
  } catch (e: any) {
    res.status(503).json({ error: `ML customer-segments unavailable: ${e.message}` })
  }
})

app.get("/api/ml/churn-predictions", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true"
    const ml = await getMLData(forceRefresh)
    const filtered = applyMLFilters(ml.churnPredictions, req.query)
    res.json(filtered)
  } catch (e: any) {
    res.status(503).json({ error: `ML churn-predictions unavailable: ${e.message}` })
  }
})

app.get("/api/ml/clv-predictions", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true"
    const ml = await getMLData(forceRefresh)
    const filtered = applyMLFilters(ml.clvPredictions, req.query)
    res.json(filtered)
  } catch (e: any) {
    res.status(503).json({ error: `ML clv-predictions unavailable: ${e.message}` })
  }
})

app.get("/api/ml/product-recommendations", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true"
    const ml = await getMLData(forceRefresh)
    const filtered = applyMLFilters(ml.productRecommendations, req.query)
    res.json(filtered)
  } catch (e: any) {
    res.status(503).json({ error: `ML product-recommendations unavailable: ${e.message}` })
  }
})

app.get("/api/ml/product-affinities", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true"
    const ml = await getMLData(forceRefresh)
    res.json(ml.productAffinities)
  } catch (e: any) {
    res.status(503).json({ error: `ML product-affinities unavailable: ${e.message}` })
  }
})

app.get("/api/ml/sales-forecast", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true"
    const ml = await getMLData(forceRefresh)
    // Always return all forecast days to allow client-side full 30-day KPI computation
    res.json(ml.salesForecast)
  } catch (e: any) {
    res.status(503).json({ error: `ML sales-forecast unavailable: ${e.message}` })
  }
})

// ─── Databricks Genie Agent Secure Proxy Architecture ───────────────────────



import { GenieController } from "./src/server/controllers/genieController"

// ─── Databricks Genie Agent Secure Proxy Architecture ───────────────────────
// Mapped to modular agentic LLM routing, SQL generation, validation, execution, and insight compiler pipeline

// 1. List active conversation sessions
app.get("/api/genie/conversations", GenieController.listSessions)

// 1b. Get specific session details
app.get("/api/genie/conversations/:id", GenieController.getSession)

// 2. Start Conversation Session
app.post("/api/genie/conversations", GenieController.createSession)

// 3. Send Message and process intent, SQL validation, Databricks connection, and insights
app.post("/api/genie/conversations/:id/messages", GenieController.sendMessage)

// 4. Get Specific Response Details / Status Check
app.get("/api/genie/conversations/:id/messages/:msgId", GenieController.getMessageStatus)

// 5. Submit Thumbs-up/down User Feedback for responses
app.post("/api/genie/conversations/:id/messages/:msgId/feedback", GenieController.addFeedback)

// 6. Delete a conversation session from records
app.delete("/api/genie/conversations/:id", GenieController.deleteSession)

// 7. Export chat log transcript as standard Markdown download
app.get("/api/genie/conversations/:id/export", GenieController.exportSession)


app.listen(port, () => {
  console.log(`\x1b[32m[Databricks Backend] Running on http://localhost:${port}\x1b[0m`)
})

app.get("/api/ml/product-recommendations", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true"
    const ml = await getMLData(forceRefresh)
    const filtered = applyMLFilters(ml.productRecommendations, req.query)
    res.json(filtered)
  } catch (e: any) {
    res.status(503).json({ error: `ML product-recommendations unavailable: ${e.message}` })
  }
})

app.get("/api/ml/product-affinities", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true"
    const ml = await getMLData(forceRefresh)
    res.json(ml.productAffinities)
  } catch (e: any) {
    res.status(503).json({ error: `ML product-affinities unavailable: ${e.message}` })
  }
})

app.get("/api/ml/sales-forecast", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true"
    const ml = await getMLData(forceRefresh)
    // Always return all forecast days to allow client-side full 30-day KPI computation
    res.json(ml.salesForecast)
  } catch (e: any) {
    res.status(503).json({ error: `ML sales-forecast unavailable: ${e.message}` })
  }
})


