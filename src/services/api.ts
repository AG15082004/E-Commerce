import axios from "axios"
import { getAnalyticsData } from "../utils/analyticsEngine"

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
})

export interface GenieConversationResponse {
  conversation_id: string
  message_id: string
  simulated: boolean
}

export interface GenieAttachment {
  id: string
  type: "text" | "query"
  text?: string
  query?: string
  description?: string
  statement_id?: string
  results?: {
    columns: string[]
    rows: any[]
  }
}

export interface GenieMessageResponse {
  conversation_id: string;
  message_id: string;
  status: string;
  answer: string;
  attachments: GenieAttachment[];
  simulated: boolean;
  chart?: any;
  insights?: any;
}

export interface GenieSessionHeader {
  id: string;
  title: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  simulated?: boolean;
  feedback?: "like" | "dislike" | null;
  agentKey?: string;
  sql?: string;
  tablesUsed?: string[];
  columns?: string[];
  rows?: any[];
  chart?: any;
  insights?: any;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export const createGenieConversation = async (question?: string): Promise<GenieConversationResponse> => {
  const res = await api.post<GenieConversationResponse>("/genie/conversations", { question })
  return res.data
}

export const sendGenieMessage = async (conversationId: string, question: string): Promise<GenieMessageResponse> => {
  const res = await api.post<GenieMessageResponse>(`/genie/conversations/${conversationId}/messages`, { question })
  return res.data
}

export const getGenieMessageStatus = async (conversationId: string, messageId: string): Promise<any> => {
  const res = await api.get(`/genie/conversations/${conversationId}/messages/${messageId}`)
  return res.data
}

export const getGenieSession = async (id: string): Promise<ChatSession> => {
  const res = await api.get<ChatSession>(`/genie/conversations/${id}`)
  return res.data
}


export const listGenieConversations = async (): Promise<GenieSessionHeader[]> => {
  const res = await api.get<GenieSessionHeader[]>("/genie/conversations")
  return res.data
}

export const deleteGenieConversation = async (id: string): Promise<{ success: boolean }> => {
  const res = await api.delete<{ success: boolean }>(`/genie/conversations/${id}`)
  return res.data
}

export const submitGenieFeedback = async (
  id: string,
  msgId: string,
  rating: "like" | "dislike" | null
): Promise<{ success: boolean }> => {
  const res = await api.post<{ success: boolean }>(`/genie/conversations/${id}/messages/${msgId}/feedback`, { rating })
  return res.data
}

export const exportGenieConversationUrl = (id: string): string => {
  return `/api/genie/conversations/${id}/export`
}

export default api
export type AnalyticsResponse = ReturnType<typeof getAnalyticsData>

