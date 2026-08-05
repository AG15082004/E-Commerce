const host = process.env.DATABRICKS_HOST || "https://dbc-76c64d67-a588.cloud.databricks.com";
const token = process.env.DATABRICKS_TOKEN || "";
const DEFAULT_MODEL = "databricks-meta-llama-3-3-70b-instruct";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

export async function queryLLM(messages: Message[], options: CompletionOptions = {}): Promise<string> {
  const model = options.model || DEFAULT_MODEL;
  const url = `${host.replace(/\/$/, "")}/serving-endpoints/${model}/invocations`;
  
  if (!token) {
    throw new Error("DATABRICKS_TOKEN is missing in the environment variables.");
  }

  const payload: any = {
    messages,
    max_tokens: options.max_tokens || 2048,
    temperature: options.temperature !== undefined ? options.temperature : 0.1
  };

  // Some models support response_format, check if needed
  if (options.response_format) {
    payload.response_format = options.response_format;
  }

  const maxRetries = 5;
  let attempt = 0;
  let delay = 500; // start with 500ms delay

  while (attempt < maxRetries) {
    try {
      attempt++;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 429) {
        if (attempt < maxRetries) {
          const jitter = Math.random() * 150;
          const waitTime = delay + jitter;
          console.warn(`[LLM Service] 429 Rate Limit Exceeded. Retrying in ${Math.round(waitTime)}ms... (Attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          delay *= 2.5; // Backoff multiplier
          continue;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Databricks LLM serving endpoint failed (${response.status}): ${errorText}`);
      }

      const result = (await response.json()) as any;
      if (result.choices && result.choices[0] && result.choices[0].message) {
        return result.choices[0].message.content || "";
      }
      
      throw new Error("Invalid response format from Databricks LLM endpoint: " + JSON.stringify(result));
    } catch (error: any) {
      if (attempt >= maxRetries) {
        throw error;
      }
      const jitter = Math.random() * 150;
      const waitTime = delay + jitter;
      console.warn(`[LLM Service] Request failed: ${error.message}. Retrying in ${Math.round(waitTime)}ms... (Attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      delay *= 2.5;
    }
  }

  throw new Error(`Databricks LLM request failed after ${maxRetries} attempts.`);
}
