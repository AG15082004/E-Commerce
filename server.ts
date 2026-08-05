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
const HOST = "https://dbc-76c64d67-a588.cloud.databricks.com"
const GENIE_SPACE_ID = "01f18fcd9940115ea585f97f637e086a"
const ORG_QUERY = "?o=1758184392151523"

async function getAccessToken(): Promise<string> {
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

// 1. Start Conversation Session
app.post("/api/genie/conversations", async (req, res) => {
  const { question } = req.body

  try {
    const token = await getAccessToken()
    console.log(`[Databricks Genie] Starting conversation session...`)

    const startRes = await fetch(`${HOST}/api/2.0/genie/spaces/${GENIE_SPACE_ID}/start-conversation${ORG_QUERY}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: question || "Hello"
      })
    })

    if (!startRes.ok) {
      const errText = await startRes.text()
      throw new Error(`Start conversation API error (${startRes.status}): ${errText}`)
    }

    const data = await startRes.json() as any
    const conversationId = data.conversation_id || data.message?.conversation_id
    const messageId = data.message_id || data.id || data.message?.id

    return res.json({
      conversation_id: conversationId,
      message_id: messageId,
      simulated: false
    })

  } catch (err: any) {
    console.warn(`[Databricks Genie] Start conversation error: ${err.message}. Falling back to simulation.`)
    return res.json({
      conversation_id: "simulated-session-12345",
      message_id: "simulated-msg-9999",
      simulated: true
    })
  }
})

// 2. Send Message and Poll Response Details
app.post("/api/genie/conversations/:id/messages", async (req, res) => {
  const conversationId = req.params.id
  const { question } = req.body

  if (!question) {
    return res.status(400).json({ error: "question body parameter is required" })
  }

  if (conversationId === "simulated-session-12345") {
    return runSimulatedGenie(question, res)
  }

  try {
    const token = await getAccessToken()
    console.log(`[Databricks Genie] Posting question to session ${conversationId}: "${question}"`)

    const postRes = await fetch(
      `${HOST}/api/2.0/genie/spaces/${GENIE_SPACE_ID}/conversations/${conversationId}/messages${ORG_QUERY}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: question
        })
      }
    )

    if (!postRes.ok) {
      const errText = await postRes.text()
      throw new Error(`Post message error (${postRes.status}): ${errText}`)
    }

    const postData = await postRes.json() as any
    const messageId = postData.id || postData.message_id || postData.message?.id

    // Poll for status completion
    const checkData = await pollGenieMessage(token, conversationId, messageId)
    return res.json(checkData)

  } catch (err: any) {
    console.warn(`[Databricks Genie Error] Proxy messaging failed: ${err.message}. Running simulation.`)
    return runSimulatedGenie(question, res)
  }
})

// 3. Get Specific Response Details / Poll Details Status
app.get("/api/genie/conversations/:id/messages/:msgId", async (req, res) => {
  const conversationId = req.params.id
  const messageId = req.params.msgId

  if (conversationId === "simulated-session-12345") {
    return res.json({ status: "COMPLETED", answer: "Simulated response message detail status" })
  }

  try {
    const token = await getAccessToken()
    const checkRes = await fetch(
      `${HOST}/api/2.0/genie/spaces/${GENIE_SPACE_ID}/conversations/${conversationId}/messages/${messageId}${ORG_QUERY}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    )

    if (!checkRes.ok) {
      return res.status(checkRes.status).json({ error: checkRes.statusText })
    }

    const data = await checkRes.json() as any
    return res.json(data)

  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

async function pollGenieMessage(token: string, conversationId: string, messageId: string) {
  const IN_PROGRESS_STATUSES = new Set([
    "FETCHING_METADATA",
    "FILTERING_CONTEXT",
    "ASKING_AI",
    "PENDING_WAREHOUSE",
    "EXECUTING_QUERY",
    "PENDING"
  ])

  let status = "PENDING"
  let attempts = 0
  let checkData: any = null

  while (IN_PROGRESS_STATUSES.has(status) && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    attempts++

    const checkRes = await fetch(
      `${HOST}/api/2.0/genie/spaces/${GENIE_SPACE_ID}/conversations/${conversationId}/messages/${messageId}${ORG_QUERY}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    )

    if (!checkRes.ok) {
      throw new Error(`Genie polling check failed (${checkRes.status}): ${checkRes.statusText}`)
    }

    checkData = await checkRes.json() as any
    status = checkData.status || checkData.message?.status || "UNKNOWN"
    console.log(`[Databricks Genie] Poll #${attempts}: status=${status}`)

    if (status === "COMPLETED") {
      break
    }
    if (status === "FAILED" || status === "CANCELLED") {
      throw new Error(checkData.error_message || `Genie query execution ${status.toLowerCase()}.`)
    }
  }

  if (status !== "COMPLETED") {
    throw new Error(`Genie message check timeout. Last status: ${status}`)
  }

  // Parse response attachments
  const parts: string[] = []
  if (checkData.content) parts.push(checkData.content)
  if (checkData.message?.content) parts.push(checkData.message.content)

  const attachments = checkData.attachments || checkData.message?.attachments || []
  const attachmentList = []

  for (const att of attachments) {
    const attItem: any = { id: att.attachment_id }

    if (att.text?.content) {
      attItem.type = "text"
      attItem.text = att.text.content
    } else if (att.text) {
      attItem.type = "text"
      attItem.text = typeof att.text === "string" ? att.text : JSON.stringify(att.text)
    }

    if (att.query) {
      attItem.type = "query"
      attItem.query = att.query.query
      attItem.description = att.query.description
      attItem.statement_id = att.query.statement_id

      // Fetch query attachment results dynamically
      const queryResults = await fetchQueryResult(token, conversationId, messageId, att.attachment_id)
      if (queryResults) {
        attItem.results = queryResults
      }
    }
    attachmentList.push(attItem)
  }

  const finalAnswer = parts.filter(Boolean).join("\n\n")

  return {
    conversation_id: conversationId,
    message_id: messageId,
    status: "COMPLETED",
    answer: finalAnswer || "Query execution finished successfully.",
    attachments: attachmentList,
    simulated: false
  }
}

async function runSimulatedGenie(question: string, res: any) {
  console.log(`[Databricks Genie Simulation] Querying local models for: "${question}"`)
  const q = question.toLowerCase()
  let answer = ""
  let query = ""
  let columns: string[] = []
  let rows: any[] = []

  if (q.includes("clv") || q.includes("platinum") || q.includes("gold") || q.includes("lifetime")) {
    answer = "I searched `e_com.gold.customer_360` and the CLV prediction models. I identified 5,000 Platinum & Gold tier customers. Their average predicted Customer Lifetime Value is ₹4,20,000.00, representing a highly valuable cohort of repeat purchasers."
    query = "SELECT COUNT(*), AVG(clv) FROM e_com.gold.customer_360 WHERE clv_tier IN ('Platinum', 'Gold');"
    columns = ["tier_count", "avg_clv"]
    rows = [{ "tier_count": 5000, "avg_clv": 420000 }]
  } else if (q.includes("churn") || q.includes("risk") || q.includes("attrition")) {
    answer = "Analyzing tables `e_com.ml.churn_predictions` and `e_com.gold.customer_360`: I found that 17 customers are classified as 'High Risk'. Churn probability is highly correlated with support tickets (especially email channel complaints) and longer ship times."
    query = "SELECT customer_id, customer_name, churn_probability FROM e_com.ml.churn_predictions WHERE risk_level = 'High' ORDER BY churn_probability DESC;"
    columns = ["customer_id", "customer_name", "churn_probability"]
    rows = [
      { "customer_id": "CUST23392", "customer_name": "Sai Kumar", "churn_probability": 0.7377 },
      { "customer_id": "CUST09695", "customer_name": "Aadhya Sharma", "churn_probability": 0.7363 },
      { "customer_id": "CUST162243", "customer_name": "Anika Roy", "churn_probability": 0.7334 }
    ]
  } else if (q.includes("forecast") || q.includes("revenue") || q.includes("sales") || q.includes("growth")) {
    answer = "Running ARIMA forecast models on `e_com.gold.sales_summary`: The predicted gross revenue for the upcoming 30 days is ₹19,36,000.00. Category metrics suggest Electronic category sales will contribute 38% of total revenue, followed by Appliances at 34%."
    query = "SELECT category, SUM(predicted_revenue) FROM e_com.gold.sales_summary GROUP BY category;"
    columns = ["category", "forecasted_sales"]
    rows = [
      { "category": "Electronics", "forecasted_sales": 735680 },
      { "category": "Appliances", "forecasted_sales": 658240 }
    ]
  } else if (q.includes("delivery") || q.includes("transit") || q.includes("logistics") || q.includes("ship")) {
    answer = "Analyzing table `e_com.gold.delivery_summary`: The average logistics cycle time is 3.1 days. Warehouse Hub 4 (Delhi Center) shows a transit delay threshold spike of 5.2% due to carrier capacity bottlenecks this month."
    query = "SELECT warehouse_id, AVG(transit_time) FROM e_com.gold.delivery_summary GROUP BY warehouse_id;"
    columns = ["warehouse_id", "avg_transit_days"]
    rows = [
      { "warehouse_id": "Hub 4 (Delhi)", "avg_transit_days": 3.1 }
    ]
  } else if (q.includes("product") || q.includes("category") || q.includes("sell") || q.includes("sku")) {
    answer = "Fulfillment catalog audits on `e_com.gold.product_performance` show 'Resistance Bands Set' has the highest review rating (4.8★) with 4,200 SKUs in active stock, while 'Premium Running Shoes' leads in absolute sales volume."
    query = "SELECT product_name, rating, stock FROM e_com.gold.product_performance ORDER BY rating DESC LIMIT 2;"
    columns = ["product_name", "rating", "stock"]
    rows = [
      { "product_name": "Resistance Bands Set", "rating": 4.8, "stock": 4200 },
      { "product_name": "Premium Running Shoes", "rating": 4.6, "stock": 1800 }
    ]
  } else {
    answer = "I am ApexCommerce's Databricks Genie Space AI Assistant. I have read-only access to our Unity Catalog schemas (`e_com.gold.*` and `e_com.ml.*`). I can query sales forecasts, customer churn risks, logistics transit delays, or product ratings. What data would you like me to pull?"
  }

  await new Promise(resolve => setTimeout(resolve, 800))

  return res.json({
    conversation_id: "simulated-session-12345",
    message_id: "simulated-msg-9999",
    status: "COMPLETED",
    answer,
    attachments: query ? [
      {
        type: "query",
        query,
        description: "Generated query for user search.",
        results: { columns, rows }
      }
    ] : [],
    simulated: true
  })
}

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


