import { queryLLM } from "./llmService";
import type { Message } from "./llmService";

export interface AgentDetails {
  name: string;
  table: string;
  purpose: string;
  description: string;
}

export const AGENTS: Record<string, AgentDetails> = {
  sales: {
    name: "Sales Intelligence Agent",
    table: "e_com.gold.sales_summary",
    purpose: "Analyze Sales KPIs, orders, revenue, profit, regional performance, payment methods, and sales trends.",
    description: "Best for: current sales, monthly revenues, state/city sales, average order value, payment statistics."
  },
  customer: {
    name: "Customer Intelligence Agent",
    table: "e_com.gold.customer_360",
    purpose: "Evaluate customer profiles, loyalty, purchase history, metrics (AOV, order count), tenure, and satisfaction.",
    description: "Best for: age/gender distributions, registrations, customer profiles (VIP vs Regular), customer satisfaction score."
  },
  marketing: {
    name: "Marketing Intelligence Agent",
    table: "e_com.gold.marketing_summary",
    purpose: "Evaluate marketing summaries, billing totals, order conversions by category/brand.",
    description: "Best for: marketing summaries, billing totals, campaign conversions by channel (Facebook, Google Ads, Email, organic)."
  },
  product: {
    name: "Product Intelligence Agent",
    table: "e_com.gold.product_performance",
    purpose: "Audit product metrics, quantities sold, return counts/rates, ratings, and category profitability.",
    description: "Best for: product ratings, popular categories, worst-performing items, return rates by brand."
  },
  delivery: {
    name: "Delivery Intelligence Agent",
    table: "e_com.gold.delivery_summary",
    purpose: "Track shipping status, carrier transit performance, warehouse logistics, and delivery delays.",
    description: "Best for: delivery times, warehouse distribution, late shipping ratios, courier performance."
  },
  support: {
    name: "Support Intelligence Agent",
    table: "e_com.gold.support_summary",
    purpose: "Examine customer support ticket frequencies, interactions, and customer satisfaction scores.",
    description: "Best for: support interactions counts, support tickets, customer service satisfaction rates."
  },
  clickstream: {
    name: "Clickstream Intelligence Agent",
    table: "e_com.gold.clickstream_summary",
    purpose: "Audit website sessions, devices, browsers, bounce behaviors, page visits, and checkout funnels.",
    description: "Best for: checkout bounce rates, mobile vs desktop sessions, cart abandonments, page traffic."
  },
  forecast: {
    name: "Forecasting Agent",
    table: "e_com.ml.sales_forecast",
    purpose: "Deliver future sales forecasts, next month predictions, revenue trends, and forecast bounds.",
    description: "Best for: next 30 days revenue, 90-day projections, expected future sales trends."
  },
  recommendation: {
    name: "Recommendation Agent",
    table: "e_com.ml.product_recommendations, e_com.ml.product_affinities",
    purpose: "Generate product upsell/cross-sell affinities, co-purchase scoring, and customized item recommendations.",
    description: "Best for: product recommendations, items bought together, cross-selling/upselling analysis."
  },
  churn: {
    name: "Customer Churn Agent",
    table: "e_com.ml.churn_predictions",
    purpose: "Identify customer churn risks, high-risk flags, retention metrics, and churn probabilities.",
    description: "Best for: churn risk, customers likely to leave, retention opportunities."
  },
  clv: {
    name: "CLV Intelligence Agent",
    table: "e_com.ml.clv_predictions",
    purpose: "Predict 12-month Customer Lifetime Value, high-value tiers (Platinum, Gold), and future revenues.",
    description: "Best for: predicted clv, high-value tier counts, customer tier revenue opportunities."
  }
};

export async function routeAgent(question: string, history: Message[]): Promise<string> {
  console.log(`[Agent Router] Routing intent for question: "${question}"`);

  const agentsDescription = Object.entries(AGENTS)
    .map(([key, a]) => `- "${key}": ${a.name} (Primary Table: ${a.table}). Purpose: ${a.purpose} ${a.description}`)
    .join("\n");

  const systemPrompt = `You are an Enterprise AI Agent Router. Your task is to classify a business analytics query into exactly ONE of the following specialist agent keys:
${agentsDescription}

Rules:
1. Respond with ONLY the matching key: "sales", "customer", "marketing", "product", "delivery", "support", "clickstream", "forecast", "recommendation", "churn", or "clv".
2. If the user question is a follow-up question (context dependent), look at the conversation history to understand the subject and classify it based on the ongoing thread context.
3. If a question is generic or unrelated to these tables, select the best fitting agent. Defaults to "sales" if ambiguous.
4. Do not include quotes, formatting, or explanations. Respond with just the single word key.`;

  const messages: Message[] = [
    { role: "system", content: systemPrompt }
  ];

  // Include last 6 message turns from history to build context
  if (history && history.length > 0) {
    messages.push(...history.slice(-6));
  }

  messages.push({ role: "user", content: `Route this query: "${question}"` });

  try {
    const rawChoice = await queryLLM(messages, { temperature: 0.0, max_tokens: 10 });
    const selectedKey = rawChoice.trim().toLowerCase().replace(/[^a-z]/g, "");
    
    if (AGENTS[selectedKey]) {
      console.log(`[Agent Router] Routed successfully to agent key: "${selectedKey}" (${AGENTS[selectedKey].name})`);
      return selectedKey;
    }
    
    console.warn(`[Agent Router] Unrecognized router classification: "${rawChoice}". Defaulting to "sales".`);
    return "sales";
  } catch (err: any) {
    console.error(`[Agent Router] Agent routing failed: ${err.message}. Defaulting to "sales".`);
    return "sales";
  }
}
