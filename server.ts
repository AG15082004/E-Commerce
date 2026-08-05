import express from "express"
import cors from "cors"
import { getAnalyticsData } from "./src/utils/analyticsEngine"
import { loadAllDatabricksData, seedMockAnalyticsData } from "./src/utils/databricksAdapter"
import { loadMLData } from "./src/utils/mlAdapter"

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

// Pre-seed mock data immediately so dashboards work from first request
// even before Databricks finishes connecting (or if it's unavailable)
seedMockAnalyticsData()

// Background startup load — overrides mock data with live Databricks data if available
ensureDataLoaded().then(success => {
  if (success) {
    console.log("\x1b[32m[Databricks Backend] Initial Gold data cache pre-warmed.\x1b[0m")
  } else {
    console.log("\x1b[33m[Databricks Backend] Databricks unavailable — running with mock fallback data.\x1b[0m")
  }
})

app.get("/api/analytics", async (req, res) => {
  const params = req.query as any
  const start = params.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const end = params.end || new Date().toISOString().split("T")[0]
  const forceRefresh = params.refresh === "true"

  console.log(`[API] GET query. Range: ${start} to ${end}. Filters: State=${params.state || "All"}, Category=${params.category || "All"}. Refresh=${forceRefresh}`)

  // Attempt to reload from Databricks if forced or stale
  await ensureDataLoaded(forceRefresh)

  // Always respond — either with live Databricks data or mock fallback
  const dashboardData = getAnalyticsData(start, end, params)
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

interface TokenCache {
  accessToken: string
  expiresAt: number
}

let cachedToken: TokenCache | null = null

const CLIENT_ID = process.env.DATABRICKS_CLIENT_ID || ""
const CLIENT_SECRET = process.env.DATABRICKS_CLIENT_SECRET || ""
const hostUrl = process.env.DATABRICKS_HOST || "https://dbc-76c64d67-a588.cloud.databricks.com"
const HOST = hostUrl.split("?")[0]
const orgId = hostUrl.includes("o=") ? hostUrl.split("o=")[1].split("&")[0] : "1758184392151523"
const ORG_QUERY = `?o=${orgId}`
const GENIE_SPACE_ID = process.env.DATABRICKS_GENIE_SPACE_ID || "01f18fcd9940115ea585f97f637e086a"

async function getAccessToken(): Promise<string> {
  if (process.env.DATABRICKS_TOKEN) {
    return process.env.DATABRICKS_TOKEN
  }
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 300 * 1000) {
    return cachedToken.accessToken
  }

  console.log("[Databricks OAuth] Exchanging Client Credentials for Access Token...")
  const tokenUrl = `${HOST}/oidc/v1/token`
  const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials&scope=all-apis"
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Databricks OAuth token fetch failed (${res.status}): ${errText}`)
  }

  const data = await res.json() as any
  const expiresIn = data.expires_in || 3600

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + (expiresIn * 1000)
  }

  console.log(`[Databricks OAuth] Token exchange completed. Valid for ${expiresIn}s.`)
  return cachedToken.accessToken
}

async function fetchQueryResult(
  token: string,
  conversationId: string,
  messageId: string,
  attachmentId: string
) {
  try {
    const res = await fetch(
      `${HOST}/api/2.0/genie/spaces/${GENIE_SPACE_ID}/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}/query-result${ORG_QUERY}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    )
    if (!res.ok) {
      console.warn(`[Databricks Genie] Query result fetch failed: ${res.statusText}`)
      return null
    }
    const data = await res.json() as any
    const columns = data.statement_response?.manifest?.schema?.columns?.map((c: any) => c.name) || []
    let rows: any[] = []

    const dataArray = data.statement_response?.result?.data_array
    if (Array.isArray(dataArray)) {
      rows = dataArray.map((row: any[]) => {
        const obj: any = {}
        columns.forEach((col: string, idx: number) => {
          obj[col] = row[idx]
        })
        return obj
      })
    }
    return { columns, rows }
  } catch (err: any) {
    console.warn(`[Databricks Genie Error] fetchQueryResult failed: ${err.message}`)
    return null
  }
}

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


