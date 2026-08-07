import { DBSQLClient } from "@databricks/sql";
import { queryLLM } from "./llmService";

const DATABRICKS_CONFIG = {
  host: process.env.DATABRICKS_HOST || "dbc-76c64d67-a588.cloud.databricks.com",
  path: process.env.DATABRICKS_SQL_WAREHOUSE_ID || "/sql/1.0/warehouses/da390341c9395502",
  token: process.env.DATABRICKS_TOKEN || ""
};

export interface QueryResult {
  columns: string[];
  rows: any[];
  isSimulated: boolean;
}

// Fetch all chunks from operation
async function fetchAllChunks(op: any): Promise<any[]> {
  const rows: any[] = [];
  while (true) {
    const chunk = await op.fetchChunk({ maxRows: 1000 });
    if (!chunk || chunk.length === 0) break;
    rows.push(...chunk);
  }
  return rows;
}

export async function executeSQL(query: string): Promise<QueryResult> {
  console.log(`[Databricks Connector] Attempting execution of query: "${query}"`);
  
  if (!DATABRICKS_CONFIG.token) {
    console.warn("[Databricks Connector] Token is missing. Falling back to simulation mode.");
    return await runSimulatedQuery(query, "No access token configured.");
  }

  const client = new DBSQLClient();
  let session: any = null;

  try {
    // DBSQLClient expects host without protocol prefix
    const cleanHost = DATABRICKS_CONFIG.host.replace(/^https?:\/\//i, "");
    
    console.log(`[Databricks Connector] Clean Host resolved: ${cleanHost}`);
    const clientInstance = await client.connect({
      host: cleanHost,
      path: DATABRICKS_CONFIG.path,
      token: DATABRICKS_CONFIG.token
    });

    session = await clientInstance.openSession();
    const op = await session.executeStatement(query, { queryTimeout: 60 });
    
    const schema = await op.getSchema();
    const columns = schema?.columns?.map((c: any) => c.columnName) || [];
    
    const rawRows = await fetchAllChunks(op);
    await op.close();
    await session.close();
    await clientInstance.close();

    console.log(`[Databricks Connector] Query executed successfully. Returned ${rawRows.length} rows.`);

    // Map rows to standard objects if they are returned as arrays or custom formats
    const rows = rawRows.map((r: any) => {
      // DBSQLClient row returns are objects where keys are column names, but let's ensure compatibility
      if (Array.isArray(r)) {
        const obj: any = {};
        columns.forEach((col: string, idx: number) => {
          obj[col] = r[idx];
        });
        return obj;
      }
      return r;
    });

    return {
      columns,
      rows,
      isSimulated: false
    };

  } catch (err: any) {
    console.error(`[Databricks Connector] Execution failed: ${err.message}. Falling back to simulation mode.`);
    return await runSimulatedQuery(query, err.message);
  } finally {
    try {
      if (session) await session.close();
    } catch (_) {}
  }
}

async function runSimulatedQuery(query: string, reason: string): Promise<QueryResult> {
  console.log(`[SQL Simulator] Simulating query response (Reason: ${reason})`);
  
  const systemPrompt = `You are a Databricks SQL query simulator. The E-Commerce analytics system needs to query databases e_com.gold.* and e_com.ml.*.
If the SQL query is run, you must return the output as a valid JSON object matching the SELECT query results.
Your response MUST be a JSON object containing:
1. "columns": string[] (uppercase/lowercase array of column names returned in the query select clause)
2. "rows": Record<string, any>[] (array of row objects where keys are column names, populated with 3 to 20 rows of realistic, statistically coherent retail metrics corresponding to the query)

Database Schema & Mappings:
1. e_com.gold.sales_summary
   - Columns: order_id (string), customer_id (string), order_date (date), revenue (double), product_cost (double), profit_amount (double), profit_margin (double), quantity (int), order_status (string), delivery_days (int), delivery_status (string), shipping_charge (double), payment_method (string), state (string), city (string), product_category (string), brand (string), warehouse (string), discount_percent (double), tax_amount (double), product_subcategory (string), unit_price (double), total_amount (double), product_rating (double)
2. e_com.gold.customer_360
    - Columns: customer_id (string), customer_name (string), state (string), city (string), registration_date (date), last_purchase_date (date), total_revenue (double), total_orders (int), total_loyalty_points (int), avg_satisfaction_score (double), customer_tenure_days (int), age (int), gender (string), customer_profile (string like vip customer/new customer/regular customer/premium customer), churn_flag (boolean), avg_order_value (double), total_profit (double)
3. e_com.gold.product_performance
   - Columns: product_id (string), product_details (string), brand (string), product_category (string), product_subcategory (string), avg_profit_margin (double), total_quantity_sold (int), total_orders (int), total_revenue (double), return_count (int), return_rate_percent (double), avg_rating (double), total_profit (double)
4. e_com.gold.marketing_summary
   - Columns: customer_id, order_id, order_date, product_category, brand, final_bill_amount
5. e_com.gold.delivery_summary
   - Columns: order_id, customer_id, order_date, warehouse, delivery_status, delivery_days, city, state, product_category
6. e_com.gold.clickstream_summary
   - Columns: customer_id, order_date, product_category, cart_abandoned
7. e_com.gold.support_summary
   - Columns: customer_id, order_id, order_date, customer_support_interactions, customer_satisfaction_score, product_category
8. e_com.ml.churn_predictions
   - Columns: customer_id, customer_name, churn_probability (0-1), risk_level (High/Medium/Low), prediction_date, model_version
9. e_com.ml.clv_predictions
   - Columns: customer_id, customer_name, predicted_clv_12m, clv_tier (Platinum/Gold/Silver/Bronze), total_revenue (current_revenue), prediction_date, model_version
10. e_com.ml.product_recommendations
    - Columns: customer_id, product_id, product_details, brand, product_category, score, recommendation_rank, recommendation_date
11. e_com.ml.product_affinities
    - Columns: source_product, recommended_product, source_category, recommended_category, affinity_score
12. e_com.ml.sales_forecast
    - Columns: forecast_date (string/date), predicted_revenue (double), lower_bound (double), upper_bound (double), model_version, mae_dollars, mape_percent

Return ONLY raw JSON, with no markdown formatting. Do not wrap in \`\`\`json. Ensure proper syntax.`;

  const userPrompt = `Simulate this Databricks SQL query:
${query}

Return the query results JSON object containing "columns" and "rows".`;

  try {
    const rawResponse = await queryLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      { temperature: 0.1 }
    );

    // Clean JSON response from LLM if it wraps in markdown blocks
    let cleanJson = rawResponse.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const data = JSON.parse(cleanJson);
    return {
      columns: data.columns || [],
      rows: data.rows || [],
      isSimulated: true
    };
  } catch (err: any) {
    console.error("[SQL Simulator] LLM simulation failed, falling back to static empty mock objects.", err.message);
    // Ultimate fallback if LLM query fails
    return {
      columns: ["Status", "Message"],
      rows: [{ "Status": "Simulation Offline", "Message": "Failed to run simulation. Please check LLM connection." }],
      isSimulated: true
    };
  }
}
