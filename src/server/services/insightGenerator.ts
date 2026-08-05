import { queryLLM } from "./llmService";

export interface BusinessInsights {
  summary: string;
  explanation: string;
  key_insights: string[];
  recommendations: string[];
  follow_up_questions: string[];
}

export async function generateInsights(
  question: string,
  sqlQuery: string,
  columns: string[],
  rows: any[],
  agentName: string
): Promise<BusinessInsights> {
  console.log(`[Insight Generator] Generating insights for agent: "${agentName}" with row count: ${rows.length}`);

  // Limit rows in the prompt to prevent context overflow (take first 50 rows)
  const slicedRows = rows.slice(0, 50);

  const systemPrompt = `You are a Principal Business Intelligence & Enterprise Analytics Consultant.
Your task is to analyze the results of a Databricks SQL query and generate high-value, actionable business insights.

Analyze the query output for any of the following patterns:
1. Growth & Decline: Upward/downward trajectories.
2. Seasonality & Trends: Periodicity or recurring events.
3. Outliers & Anomalies: Strange spikes, drop-offs, or logistics delays.
4. Business Opportunities: Revenue opportunities, profit margins, cross-sell/upsell categories, customer lifetime value enhancements.
5. Risk Factors: Churn threats, high-risk customer segments, carrier bottlenecks, support satisfaction dips.

Your response MUST be a valid JSON object with the following keys. Do not include any markdown format wrapper like \`\`\`json. Return only raw JSON.

{
  "summary": "1-2 sentence high-level executive summary of the core finding.",
  "explanation": "Detailed professional business explanation explaining what the data represents in layperson terms, referencing metrics (always use Indian Rupee currency format ₹ for money, and percentage formats where applicable).",
  "key_insights": [
    "Outlier/Trend bullet point 1: Specific detail containing data numbers.",
    "Outlier/Trend bullet point 2: Another trend or anomaly noticed."
  ],
  "recommendations": [
    "Actionable recommendations 1: Clear tactical business recommendation.",
    "Actionable recommendations 2: Focus on customer retention, cross-sell, or cost-saving."
  ],
  "follow_up_questions": [
    "Follow-up question 1?",
    "Follow-up question 2?",
    "Follow-up question 3?"
  ]
}`;

  const userPrompt = `Context:
- User Question: "${question}"
- Selected Analytics Agent: "${agentName}"
- Executed SQL Query: "${sqlQuery}"
- Query Columns: ${JSON.stringify(columns)}
- Query Data Output (Sample): ${JSON.stringify(slicedRows, null, 2)}

Please generate the business insights JSON object. Ensure all numbers and currency amounts are accurately represented from the data sample.`;

  try {
    const rawResponse = await queryLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      { temperature: 0.2 }
    );

    // Strip markdown formatting if present
    let cleanJson = rawResponse.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const insights: BusinessInsights = JSON.parse(cleanJson);

    // Provide default fallback values if any properties are missing
    return {
      summary: insights.summary || "Analysis completed successfully.",
      explanation: insights.explanation || "No detailed explanation was generated.",
      key_insights: insights.key_insights || ["Data audit finished with no notable outliers."],
      recommendations: insights.recommendations || ["No immediate business recommendations are necessary."],
      follow_up_questions: insights.follow_up_questions || [
        "Can we break this down by category?",
        "What is the forecast for next month?",
        "Show the top performing customers."
      ]
    };

  } catch (err: any) {
    console.error(`[Insight Generator] Failed to generate LLM insights: ${err.message}. Falling back to default heuristics.`);
    
    // Static fallback if LLM insight generation fails
    return {
      summary: "Data query completed successfully.",
      explanation: `Successfully retrieved ${rows.length} rows from Unity Catalog schemas using Databricks.`,
      key_insights: [
        `Query columns: ${columns.join(", ")}.`,
        `Row count: ${rows.length} entries retrieved.`
      ],
      recommendations: [
        "Examine the query output table for specific records.",
        "Refine the filters or range to check historical performance."
      ],
      follow_up_questions: [
        "What are the top categories?",
        "How does this compare to last month?",
        "Are there any churned customers?"
      ]
    };
  }
}
