import type { Request, Response } from "express";
import { ConversationManager } from "../services/conversationManager";
import { routeAgent, AGENTS } from "../services/agentRouter";
import { generateSQL } from "../services/sqlGenerator";
import { executeSQL } from "../services/databricksConnector";
import { recommendChart } from "../services/chartGenerator";
import { generateInsights } from "../services/insightGenerator";

export const GenieController = {
  // GET /api/genie/conversations
  async listSessions(_req: Request, res: Response) {
    try {
      const list = ConversationManager.getSessions();
      return res.json(list);
    } catch (err: any) {
      console.error("[Genie Controller] List sessions failed:", err.message);
      return res.status(500).json({ error: "Failed to retrieve conversation sessions." });
    }
  },
  
  // GET /api/genie/conversations/:id
  async getSession(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      const session = ConversationManager.getSession(id);
      if (session) {
        return res.json(session);
      }
      return res.status(404).json({ error: "Session not found." });
    } catch (err: any) {
      console.error("[Genie Controller] Get session failed:", err.message);
      return res.status(500).json({ error: "Failed to retrieve conversation session details." });
    }
  },

  // POST /api/genie/conversations
  async createSession(req: Request, res: Response) {
    try {
      const { question } = req.body;
      const session = ConversationManager.createSession(question);
      
      return res.json({
        conversation_id: session.id,
        message_id: "init_msg",
        simulated: false
      });
    } catch (err: any) {
      console.error("[Genie Controller] Create session failed:", err.message);
      return res.status(500).json({ error: "Failed to create conversation session." });
    }
  },

  // POST /api/genie/conversations/:id/messages
  async sendMessage(req: Request, res: Response) {
    const sessionId = req.params.id as string;
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question parameter is required." });
    }

    try {
      // 1. Fetch current session or create lazy
      let session = ConversationManager.getSession(sessionId);
      if (!session) {
        session = ConversationManager.createSession(question);
      }

      // Convert history to prompt roles
      const promptHistory = session.messages.map(m => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text
      }));

      // 2. Add user message to session history
      ConversationManager.addMessage(sessionId, {
        sender: "user",
        text: question
      });

      // 3. Agent Selection via Intent Detection
      const agentKey = await routeAgent(question, promptHistory);
      const agent = AGENTS[agentKey];

      // 4. SQL Generation & Validation
      let sqlResponse;
      try {
        sqlResponse = await generateSQL(question, agentKey, promptHistory);
      } catch (sqlErr: any) {
        // Fail SQL generation gracefully
        const errMsg = ConversationManager.addMessage(sessionId, {
          sender: "bot",
          text: `⚠️ **SQL Generation Error**\n\nThe ${agent.name} failed to translate your query: ${sqlErr.message}. Let me know if you would like me to try another way or clarify the request.`,
          agentKey
        });
        return res.json({
          conversation_id: sessionId,
          message_id: errMsg.id,
          status: "FAILED",
          answer: errMsg.text,
          attachments: [],
          simulated: true
        });
      }

      // 5. Databricks SQL Execution (or Simulation Fallback)
      let queryResult;
      try {
        queryResult = await executeSQL(sqlResponse.sql);
      } catch (execErr: any) {
        // Execute SQL failed, insert failure response
        const errMsg = ConversationManager.addMessage(sessionId, {
          sender: "bot",
          text: `⚠️ **Database Query Failure**\n\nFailed to execute the query against Databricks SQL Warehouse: ${execErr.message}.`,
          agentKey,
          sql: sqlResponse.sql
        });
        return res.json({
          conversation_id: sessionId,
          message_id: errMsg.id,
          status: "FAILED",
          answer: errMsg.text,
          attachments: [
            {
              id: "sql_error",
              type: "query",
              query: sqlResponse.sql,
              description: sqlResponse.explanation
            }
          ],
          simulated: true
        });
      }

      // 6. Visualization Recommendation
      const chartRecommendation = recommendChart(
        queryResult.columns,
        queryResult.rows,
        agentKey
      );

      // 7. Business Insights Generation
      const insights = await generateInsights(
        question,
        sqlResponse.sql,
        queryResult.columns,
        queryResult.rows,
        agent.name
      );

      // 8. Compile formatted answer
      // Combining summary + explanation
      const fullAnswer = `### **Executive Summary**\n${insights.summary}\n\n### **Business Analysis**\n${insights.explanation}`;

      // 9. Save bot message to session
      const botMessage = ConversationManager.addMessage(sessionId, {
        sender: "bot",
        text: fullAnswer,
        agentKey,
        sql: sqlResponse.sql,
        tablesUsed: sqlResponse.tables_used,
        columns: queryResult.columns,
        rows: queryResult.rows,
        chart: chartRecommendation,
        insights: insights,
        simulated: queryResult.isSimulated
      });

      // 10. Format and return API response
      // Attachments include query & data tables for backward compatibility
      return res.json({
        conversation_id: sessionId,
        message_id: botMessage.id,
        status: "COMPLETED",
        answer: fullAnswer,
        attachments: [
          {
            id: "query_att_" + botMessage.id,
            type: "query",
            query: sqlResponse.sql,
            description: sqlResponse.explanation,
            results: {
              columns: queryResult.columns,
              rows: queryResult.rows
            }
          }
        ],
        chart: chartRecommendation,
        insights: insights,
        simulated: queryResult.isSimulated
      });

    } catch (err: any) {
      console.error("[Genie Controller] Send message error:", err.message);
      return res.status(500).json({ error: "Failed to process chat message." });
    }
  },

  // GET /api/genie/conversations/:id/messages/:msgId (Status check / fallback)
  async getMessageStatus(req: Request, res: Response) {
    const sessionId = req.params.id as string;
    const msgId = req.params.msgId as string;

    try {
      const session = ConversationManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Conversation session not found." });
      }

      const msg = session.messages.find(m => m.id === msgId);
      if (!msg) {
        return res.status(404).json({ error: "Message not found." });
      }

      return res.json({
        conversation_id: sessionId,
        message_id: msgId,
        status: "COMPLETED",
        answer: msg.text,
        attachments: msg.sql ? [
          {
            id: "query_att_" + msgId,
            type: "query",
            query: msg.sql,
            description: "Executed query detail.",
            results: msg.columns ? { columns: msg.columns, rows: msg.rows || [] } : undefined
          }
        ] : [],
        chart: msg.chart,
        insights: msg.insights,
        simulated: msg.simulated || false
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // POST /api/genie/conversations/:id/messages/:msgId/feedback
  async addFeedback(req: Request, res: Response) {
    const id = req.params.id as string;
    const msgId = req.params.msgId as string;
    const { rating } = req.body; // 'like' | 'dislike' | null

    try {
      const success = ConversationManager.setFeedback(id, msgId, rating);
      if (success) {
        return res.json({ success: true });
      }
      return res.status(404).json({ error: "Session or message not found." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // DELETE /api/genie/conversations/:id
  async deleteSession(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      const success = ConversationManager.deleteSession(id);
      if (success) {
        return res.json({ success: true });
      }
      return res.status(404).json({ error: "Session not found." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  // GET /api/genie/conversations/:id/export
  async exportSession(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      const session = ConversationManager.getSession(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found." });
      }

      // Format as Markdown document
      let output = `# E-Commerce AI Assistant - Analysis Session\n`;
      output += `Date Created: ${new Date(session.createdAt).toLocaleDateString()}\n`;
      output += `Session ID: ${session.id}\n\n`;
      output += `--------------------------------------------------\n\n`;

      session.messages.forEach(m => {
        const senderLabel = m.sender === "user" ? "USER" : "ASSISTANT";
        output += `## [${senderLabel}] - ${m.timestamp}\n\n`;
        output += `${m.text}\n\n`;
        
        if (m.sql) {
          output += `### Generated SQL\n\`\`\`sql\n${m.sql}\n\`\`\`\n\n`;
          if (m.tablesUsed && m.tablesUsed.length > 0) {
            output += `*Tables Qualified:* ${m.tablesUsed.join(", ")}\n\n`;
          }
        }

        if (m.insights && m.insights.key_insights) {
          output += `### Analytical Insights\n`;
          m.insights.key_insights.forEach((ki: string) => {
            output += `- ${ki}\n`;
          });
          output += `\n`;
        }

        if (m.insights && m.insights.recommendations) {
          output += `### Business Recommendations\n`;
          m.insights.recommendations.forEach((rec: string) => {
            output += `- ${rec}\n`;
          });
          output += `\n`;
        }

        output += `--------------------------------------------------\n\n`;
      });

      res.setHeader("Content-Type", "text/markdown");
      res.setHeader("Content-Disposition", `attachment; filename="genie_chat_${id}.md"`);
      return res.send(output);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
};
