import { queryLLM } from "./llmService";
import type { Message } from "./llmService";
import { buildAgentPrompt } from "./promptBuilder";
import { validateSQL } from "./sqlValidator";

export interface GeneratedSQLResponse {
  sql: string;
  explanation: string;
  tables_used: string[];
}

export async function generateSQL(
  question: string,
  agentKey: string,
  history: Message[]
): Promise<GeneratedSQLResponse> {
  console.log(`[SQL Generator] Generating SQL for agent: "${agentKey}"`);

  const systemInstructions = buildAgentPrompt(agentKey);

  const messages: Message[] = [
    { role: "system", content: systemInstructions }
  ];

  // Append history to let the model resolve follow-up references
  if (history && history.length > 0) {
    messages.push(...history.slice(-6));
  }

  messages.push({
    role: "user",
    content: `Write a Databricks SQL query for this question: "${question}"`
  });

  try {
    const rawResponse = await queryLLM(messages, { temperature: 0.1 });
    
    // Strip markdown formatting if any
    let cleanJson = rawResponse.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    let parsed: GeneratedSQLResponse;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn("[SQL Generator] Response was not valid JSON, trying to extract SQL regex-wise...", cleanJson);
      // Fallback parser if JSON parse fails (e.g. if the LLM adds text)
      const sqlMatch = rawResponse.match(/select[\s\S]+?;/i) || rawResponse.match(/with[\s\S]+?;/i);
      if (sqlMatch) {
        parsed = {
          sql: sqlMatch[0],
          explanation: "Query extracted from conversational output.",
          tables_used: []
        };
      } else {
        throw new Error("Could not parse SQL query from LLM response.");
      }
    }

    // Ensure SQL is populated
    if (!parsed.sql) {
      throw new Error("Generated SQL query is empty.");
    }

    // Run SQL Validator
    const validation = validateSQL(parsed.sql);
    if (!validation.isValid) {
      console.error(`[SQL Generator] Generated SQL failed validation: ${validation.error}`);
      throw new Error(validation.error || "Generated SQL failed safety checks.");
    }

    console.log(`[SQL Generator] SQL validation passed: "${parsed.sql}"`);
    return parsed;

  } catch (err: any) {
    console.error(`[SQL Generator] SQL generation failed: ${err.message}`);
    throw err;
  }
}
