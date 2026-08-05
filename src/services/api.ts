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
  conversation_id: string
  message_id: string
  status: string
  answer: string
  attachments: GenieAttachment[]
  simulated: boolean
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

export default api
export type AnalyticsResponse = ReturnType<typeof getAnalyticsData>
