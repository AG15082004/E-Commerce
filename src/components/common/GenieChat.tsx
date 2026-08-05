import React, { useState, useRef, useEffect } from "react"
import {
  Send, X, Sparkles, Loader2,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft,
  ThumbsUp, ThumbsDown, Trash2, Download, Copy, Check, Plus
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import {
  createGenieConversation,
  sendGenieMessage,
  getGenieSession,
  listGenieConversations,
  deleteGenieConversation,
  submitGenieFeedback,
  exportGenieConversationUrl
} from "../../services/api"
import type { ChatMessage, GenieSessionHeader } from "../../services/api"
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid,
  XAxis, YAxis, Tooltip, Legend
} from "recharts"

interface GenieChatProps {
  isOpen: boolean
  onClose: () => void
}

export const GenieChat: React.FC<GenieChatProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<GenieSessionHeader[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Track active tab for each bot message ID: "insight" | "chart" | "table" | "sql"
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({})
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const sampleQuestions = [
    "What is the sales forecast for next month?",
    "How many customers are at High Risk of churn?",
    "Show the customer segments distribution",
    "What are the top categories by product ratings?",
    "Show delivery transit time statistics"
  ]

  // 1. Initial Load: Retrieve sessions list
  const loadSessionsList = async (selectLatest = false) => {
    try {
      const headers = await listGenieConversations()
      setSessions(headers)
      if (selectLatest && headers.length > 0) {
        handleSelectSession(headers[0].id)
      }
    } catch (e) {
      console.warn("Failed to load chat sessions:", e)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadSessionsList(true)
    }
  }, [isOpen])

  // 2. Select a Session
  const handleSelectSession = async (id: string) => {
    try {
      setActiveSessionId(id)
      setLoading(true)
      const sessionDetails = await getGenieSession(id)
      setMessages(sessionDetails.messages)
      
      // Initialize active tabs for bot messages
      const tabs: Record<string, string> = {}
      sessionDetails.messages.forEach(m => {
        if (m.sender === "bot") {
          tabs[m.id] = "insight"
        }
      })
      setActiveTabs(tabs)
    } catch (e) {
      console.warn("Failed to load session details:", e)
    } finally {
      setLoading(false)
    }
  }

  // 3. Create a New Session
  const handleNewSession = async () => {
    try {
      setLoading(true)
      const res = await createGenieConversation()
      if (res.conversation_id) {
        await loadSessionsList(false)
        setActiveSessionId(res.conversation_id)
        setMessages([])
      }
    } catch (e) {
      console.warn("Failed to start new conversation session:", e)
    } finally {
      setLoading(false)
    }
  }

  // 4. Delete a Session
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteGenieConversation(id)
      const remainingHeaders = sessions.filter(s => s.id !== id)
      setSessions(remainingHeaders)
      
      if (activeSessionId === id) {
        if (remainingHeaders.length > 0) {
          handleSelectSession(remainingHeaders[0].id)
        } else {
          setActiveSessionId(null)
          setMessages([])
        }
      }
    } catch (err) {
      console.warn("Failed to delete session:", err)
    }
  }

  // 5. Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100)
    }
  }, [messages, loading, isOpen])

  // 6. Send Message
  const handleSend = async (questionText: string) => {
    if (!questionText.trim()) return

    let currentSessionId = activeSessionId
    setLoading(true)
    setInput("")

    try {
      // Lazy initialize session if none is active
      if (!currentSessionId) {
        const sessionRes = await createGenieConversation(questionText)
        currentSessionId = sessionRes.conversation_id
        setActiveSessionId(currentSessionId)
      }

      // 1. Add user message locally for responsive UI
      const userMsg: ChatMessage = {
        id: "usr_" + Math.random().toString(36).substring(2, 9),
        sender: "user",
        text: questionText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
      setMessages(prev => [...prev, userMsg])

      // 2. Fetch bot reply from backend
      const response = await sendGenieMessage(currentSessionId, questionText)
      
      const botMsg: ChatMessage = {
        id: response.message_id,
        sender: "bot",
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        agentKey: response.insights?.agentKey,
        sql: response.chart?.data ? response.attachments[0]?.query : undefined,
        tablesUsed: response.insights?.tables_used,
        columns: response.chart?.data ? response.attachments[0]?.results?.columns : undefined,
        rows: response.chart?.data ? response.attachments[0]?.results?.rows : undefined,
        chart: response.chart,
        insights: response.insights,
        simulated: response.simulated
      }

      setMessages(prev => [...prev, botMsg])
      
      // Default new message tab to "insight"
      setActiveTabs(prev => ({ ...prev, [botMsg.id]: "insight" }))

      // Reload sidebar sessions list to fetch updated titles
      await loadSessionsList(false)
    } catch (e: any) {
      console.error("[Genie Chat Error]", e)
      const errorMsg: ChatMessage = {
        id: "err_" + Math.random().toString(36).substring(2, 9),
        sender: "bot",
        text: "⚠️ **Connection Error**\n\nI failed to reach the analytics processing engine. Please ensure the backend server is running and database configuration is set in your `.env`.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  // 7. Handle Feedback
  const handleFeedback = async (msgId: string, rating: "like" | "dislike") => {
    if (!activeSessionId) return
    try {
      await submitGenieFeedback(activeSessionId, msgId, rating)
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: rating } : m))
    } catch (e) {
      console.warn("Failed to save message feedback:", e)
    }
  }

  // 8. Copy to Clipboard
  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedMsgId(msgId)
    setTimeout(() => setCopiedMsgId(null), 2000)
  }

  // 9. Export Chat Log
  const handleExport = () => {
    if (!activeSessionId) return
    const exportUrl = exportGenieConversationUrl(activeSessionId)
    window.open(exportUrl, "_blank")
  }

  const renderTableCellValue = (col: string, val: any) => {
    if (typeof val === "number") {
      const lowerCol = col.toLowerCase()
      if (
        lowerCol.includes("sales") ||
        lowerCol.includes("revenue") ||
        lowerCol.includes("clv") ||
        lowerCol.includes("price") ||
        lowerCol.includes("amount") ||
        lowerCol.includes("cost") ||
        lowerCol.includes("profit") ||
        lowerCol.includes("spent")
      ) {
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0
        }).format(val)
      }
      if (lowerCol.includes("probability") || lowerCol.includes("rate") || lowerCol.includes("percent")) {
        // format values <= 1.0 as percentage if it's probability
        if (val <= 1.0 && lowerCol.includes("probability")) {
          return `${(val * 100).toFixed(1)}%`
        }
        return `${val.toFixed(1)}%`
      }
      return val.toLocaleString("en-IN")
    }
    return String(val ?? "-")
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed top-0 bottom-0 right-0 z-50 flex h-screen border-l shadow-fluent-lg bg-[#F8F9FA] dark:bg-[#201F1E] border-[#E1DFDD] dark:border-[#3B3A39] transition-all duration-200 ease-out ${
        isExpanded ? "w-[90vw] md:w-[940px]" : "w-[480px] sm:w-[540px]"
      }`}
      style={{
        fontFamily: "'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ─── Sidebar Panel ─── */}
      {sidebarOpen && (
        <div className="w-[220px] flex flex-col bg-white dark:bg-[#252423] border-r border-[#E1DFDD] dark:border-[#3B3A39] shrink-0 h-full">
          <div className="flex h-14 items-center justify-between px-4 border-b border-[#E1DFDD] dark:border-[#3B3A39] bg-[#FAF9F8] dark:bg-[#2D2C2B]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#605E5C] dark:text-[#A19F9D]">
              Analysis Chats
            </h3>
            <button
              onClick={handleNewSession}
              disabled={loading}
              title="Start New Analysis"
              className="flex h-7 w-7 items-center justify-center rounded border border-[#E1DFDD] dark:border-[#3B3A39] bg-white dark:bg-[#2F2F2F] text-[#0078D4] dark:text-[#60CDFF] hover:bg-[#F3F2F1] dark:hover:bg-[#3B3A39] transition-colors disabled:opacity-50"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => handleSelectSession(s.id)}
                className={`group flex items-center justify-between rounded p-2 text-xs font-semibold cursor-pointer transition-colors ${
                  activeSessionId === s.id
                    ? "bg-[#E1F5FE] dark:bg-[#1D3544] text-[#005A9E] dark:text-[#60CDFF]"
                    : "text-[#242424] dark:text-[#F3F2F1] hover:bg-[#F3F2F1] dark:hover:bg-[#323130]"
                }`}
              >
                <span className="truncate pr-2 select-none flex-1">
                  {s.title}
                </span>
                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  title="Delete Chat"
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 rounded p-0.5 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-[11px] text-[#8A8886] dark:text-[#A19F9D] p-3 text-center italic">
                No active histories.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Main Chat Interface ─── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#F3F2F1] dark:bg-[#201F1E]">
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-[#E1DFDD] dark:border-[#3B3A39] bg-[#FAF9F8] dark:bg-[#2D2C2B] shrink-0">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
              className="text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#EDEBE9] dark:hover:bg-[#3B3A39] p-1.5 rounded transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-[#0078D4] to-[#00A4EF] text-white">
              <Sparkles size={14} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#242424] dark:text-[#F3F2F1] leading-none">
                AI Analytics Assistant
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#107C41] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#107C41]"></span>
                </span>
                <span className="text-[8px] font-bold text-[#107C41] dark:text-[#34D399] uppercase tracking-wider">
                  Databricks SQL Connected
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Expand / Narrow width toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Narrow View" : "Widen View"}
              className="rounded p-1.5 text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#EDEBE9] dark:hover:bg-[#3B3A39] transition-colors"
            >
              {isExpanded ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            
            {/* Export Chat Button */}
            {activeSessionId && (
              <button
                onClick={handleExport}
                title="Export Markdown Report"
                className="rounded p-1.5 text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#EDEBE9] dark:hover:bg-[#3B3A39] transition-colors"
              >
                <Download size={16} />
              </button>
            )}

            <button
              onClick={onClose}
              title="Close Panel"
              className="rounded p-1.5 text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#EDEBE9] dark:hover:bg-[#3B3A39] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Message Panel Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin">
          {messages.map((m, idx) => (
            <div key={m.id || idx} className={`flex gap-3 ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
              {m.sender === "bot" && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full shrink-0 bg-gradient-to-br from-[#0078D4] to-[#00A4EF] text-white mt-1 shadow-sm">
                  <Sparkles size={11} />
                </div>
              )}

              <div className={`flex flex-col ${m.sender === "user" ? "items-end max-w-[80%]" : "items-start w-[88%]"}`}>
                {/* User Message Bubble */}
                {m.sender === "user" ? (
                  <div className="rounded-lg rounded-br-sm px-4 py-2.5 text-xs font-semibold bg-[#0078D4] text-white border border-[#005A9E] shadow-sm select-text">
                    {m.text}
                  </div>
                ) : (
                  /* Bot Message Bubble with Multi-Tabs */
                  <div className="w-full rounded-lg rounded-bl-sm border bg-white dark:bg-[#252423] border-[#E1DFDD] dark:border-[#3B3A39] shadow-sm overflow-hidden flex flex-col">
                    {/* Tab Selection Bar */}
                    {m.insights && (
                      <div className="flex border-b border-[#E1DFDD] dark:border-[#3B3A39] bg-[#FAF9F8] dark:bg-[#2D2C2B] p-1 gap-1 shrink-0">
                        {["insight", "chart", "table", "sql"].map(tab => {
                          const isActive = (activeTabs[m.id] || "insight") === tab
                          // Skip chart/table tabs if no dataset is returned
                          if ((tab === "chart" || tab === "table") && (!m.rows || m.rows.length === 0)) return null
                          if (tab === "sql" && !m.sql) return null

                          return (
                            <button
                              key={tab}
                              onClick={() => setActiveTabs(prev => ({ ...prev, [m.id]: tab }))}
                              className={`rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                isActive
                                  ? "bg-white dark:bg-[#3B3A39] text-[#0078D4] dark:text-[#60CDFF] shadow-sm border border-[#E1DFDD] dark:border-[#4B4A49]"
                                  : "text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#EDEBE9] dark:hover:bg-[#323130]"
                              }`}
                            >
                              {tab}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Tab Content Rendering */}
                    <div className="p-4 flex-1 overflow-x-hidden text-[13px] leading-relaxed">
                      {/* 1. INSIGHTS TAB */}
                      {(!m.insights || (activeTabs[m.id] || "insight") === "insight") && (
                        <div className="genie-markdown space-y-3">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => <h1 className="text-sm font-bold text-[#242424] dark:text-[#F3F2F1] mb-2 mt-1 border-b pb-1 border-[#E1DFDD] dark:border-[#3B3A39]">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-xs font-bold text-[#242424] dark:text-[#F3F2F1] mb-1.5 mt-3">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-[11px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wide mb-1 mt-2">{children}</h3>,
                              p: ({ children }) => <p className="mb-2 last:mb-0 text-[12px] leading-relaxed text-[#242424] dark:text-[#F3F2F1]">{children}</p>,
                              strong: ({ children }) => <strong className="font-bold text-[#242424] dark:text-[#F3F2F1]">{children}</strong>,
                              ul: ({ children }) => <ul className="list-none space-y-1 my-2 ml-1">{children}</ul>,
                              li: ({ children }) => (
                                <li className="text-[12px] leading-relaxed flex items-start gap-2">
                                  <span className="text-[#0078D4] dark:text-[#60CDFF] mt-1 shrink-0">•</span>
                                  <span>{children}</span>
                                </li>
                              ),
                              code: ({ children }) => <code className="bg-[#F3F2F1] dark:bg-[#2F2F2F] rounded px-1.5 py-0.5 text-[11px] font-mono text-[#A80000] dark:text-[#FF6B6B]">{children}</code>
                            }}
                          >
                            {m.text}
                          </ReactMarkdown>

                          {/* Actionable Recommendations lists */}
                          {m.insights && m.insights.recommendations && m.insights.recommendations.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-[#E1DFDD] dark:border-[#3B3A39] space-y-2">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#605E5C] dark:text-[#A19F9D]">
                                Recommendations
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                {m.insights.recommendations.map((rec: string, rIdx: number) => (
                                  <div key={rIdx} className="rounded border bg-[#FAF9F8] dark:bg-[#2A2928] border-[#E1DFDD] dark:border-[#3B3A39] p-2.5 text-xs text-[#242424] dark:text-[#F3F2F1] flex items-start gap-2 shadow-sm">
                                    <Check size={13} className="text-[#107C41] mt-0.5 shrink-0" />
                                    <span>{rec}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. CHART TAB */}
                      {m.chart && (activeTabs[m.id] || "insight") === "chart" && (
                        <div className="w-full min-h-[260px] flex items-center justify-center p-2">
                          <ChartRenderer chart={m.chart} agentKey={m.agentKey || "sales"} />
                        </div>
                      )}

                      {/* 3. TABLE DATA TAB */}
                      {m.rows && m.columns && (activeTabs[m.id] || "insight") === "table" && (
                        <div className="w-full overflow-hidden border border-[#E1DFDD] dark:border-[#3B3A39] rounded">
                          <TableRenderer columns={m.columns} rows={m.rows} renderCell={renderTableCellValue} />
                        </div>
                      )}

                      {/* 4. SQL QUERY TAB */}
                      {m.sql && (activeTabs[m.id] || "insight") === "sql" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between bg-[#FAF9F8] dark:bg-[#2D2C2B] px-3 py-1.5 border border-[#E1DFDD] dark:border-[#3B3A39] rounded">
                            <span className="text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wide">
                              Synthesized Databricks SQL
                            </span>
                            <button
                              onClick={() => handleCopy(m.sql || "", m.id)}
                              className="flex items-center gap-1 text-[10px] font-bold text-[#0078D4] dark:text-[#60CDFF] hover:underline"
                            >
                              {copiedMsgId === m.id ? (
                                <>
                                  <Check size={11} /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={11} /> Copy Query
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="bg-[#FAF9F8] dark:bg-[#1A1918] border border-[#E1DFDD] dark:border-[#3B3A39] rounded p-3 overflow-x-auto text-[11px] font-mono text-[#242424] dark:text-[#E1DFDD] whitespace-pre-wrap break-all leading-normal">
                            <code>{m.sql}</code>
                          </pre>
                          {m.tablesUsed && m.tablesUsed.length > 0 && (
                            <p className="text-[10px] font-semibold text-[#8A8886] dark:text-[#A19F9D]">
                              Qualified tables audited: {m.tablesUsed.join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Toolbar details: Feedback, timestamp, simulated badge */}
                    <div className="h-10 px-4 border-t border-[#E1DFDD] dark:border-[#3B3A39] bg-[#FAF9F8] dark:bg-[#2D2C2B] flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-[#8A8886] dark:text-[#A19F9D] tracking-wide uppercase">
                          {m.timestamp}
                        </span>
                        {m.simulated && (
                          <span className="text-[8px] font-bold text-[#A05A00] dark:text-[#FFB900] bg-[#FFF9E6] dark:bg-[#3D2C1B] border border-[#FFE299] dark:border-[#5C4524] px-1.5 py-0.5 rounded tracking-wide uppercase leading-none">
                            Simulated
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleFeedback(m.id, "like")}
                          title="This helped me"
                          className={`hover:text-[#0078D4] transition-colors ${
                            m.feedback === "like" ? "text-[#0078D4] dark:text-[#60CDFF]" : "text-[#8A8886] dark:text-[#A19F9D]"
                          }`}
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button
                          onClick={() => handleFeedback(m.id, "dislike")}
                          title="This didn't help"
                          className={`hover:text-red-500 transition-colors ${
                            m.feedback === "dislike" ? "text-red-500" : "text-[#8A8886] dark:text-[#A19F9D]"
                          }`}
                        >
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing/Analysis Indicator */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#0078D4] to-[#00A4EF] text-white animate-pulse mt-1 shrink-0">
                <Sparkles size={11} />
              </div>
              <div className="flex flex-col items-start w-[240px]">
                <div className="rounded-lg rounded-bl-sm px-4 py-2.5 bg-white dark:bg-[#252423] border border-[#E1DFDD] dark:border-[#3B3A39] shadow-sm flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-[#0078D4] dark:text-[#60CDFF]" />
                  <span className="text-xs font-semibold text-[#605E5C] dark:text-[#A19F9D]">
                    Genie is auditing Catalog...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick-Prompt Recommendation chips */}
          {messages.length === 0 && !loading && (
            <div className="pt-4 space-y-2">
              <p className="text-[10px] font-bold text-[#8A8886] dark:text-[#A19F9D] uppercase tracking-wider px-1">
                Suggested Queries
              </p>
              <div className="flex flex-col gap-2">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="w-full text-left rounded border px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-[#252423] text-[#242424] dark:text-[#F3F2F1] border-[#E1DFDD] dark:border-[#3B3A39] hover:bg-[#E1F5FE] dark:hover:bg-[#1D3544] hover:text-[#005A9E] dark:hover:text-[#60CDFF] hover:border-[#B3E5FC] dark:hover:border-[#203746] transition-all shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inline Follow-Up Suggestion Chips */}
          {messages.length > 0 && !loading && messages[messages.length - 1].sender === "bot" && messages[messages.length - 1].insights?.follow_up_questions && (
            <div className="flex flex-wrap gap-2 pt-2 justify-start max-w-[95%]">
              {messages[messages.length - 1].insights.follow_up_questions.map((q: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="rounded-full border px-3.5 py-1.5 text-[11px] font-bold bg-[#E1F5FE] dark:bg-[#1D3544] text-[#005A9E] dark:text-[#60CDFF] border-[#B3E5FC] dark:border-[#203746] hover:bg-[#0078D4] hover:text-white hover:border-[#005A9E] dark:hover:bg-[#60CDFF] dark:hover:text-[#242424] transition-all cursor-pointer shadow-sm select-none"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Form */}
        <form
          onSubmit={e => {
            e.preventDefault()
            handleSend(input)
          }}
          className="p-4 border-t border-[#E1DFDD] dark:border-[#3B3A39] bg-[#FAF9F8] dark:bg-[#2D2C2B] shrink-0 flex items-center gap-3"
        >
          <input
            id="genie-chat-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Genie about sales forecasts, churn predictions, or logs..."
            disabled={loading}
            className="flex-1 h-10 rounded border px-4 text-xs font-semibold bg-white dark:bg-[#252423] text-[#242424] dark:text-[#F3F2F1] border-[#E1DFDD] dark:border-[#3B3A39] focus:outline-none focus:border-[#0078D4] dark:focus:border-[#60CDFF] focus:ring-1 focus:ring-[#0078D4] dark:focus:ring-[#60CDFF] disabled:opacity-60 placeholder:text-[#A19F9D]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded bg-[#0078D4] text-white hover:bg-[#005A9E] disabled:bg-[#E1DFDD] dark:disabled:bg-[#3B3A39] disabled:text-[#A19F9D] transition-colors shrink-0 cursor-pointer shadow-sm"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Chart Renderer Component ───
const ChartRenderer: React.FC<{ chart: any; agentKey: string }> = ({ chart }) => {
  const isDark = document.documentElement.classList.contains("dark")
  const gridColor = isDark ? "#2D2C2B" : "#EDEBE9"
  const textColor = isDark ? "#A19F9D" : "#323130"
  
  // Clean configurations
  const type = chart.type
  const config = chart.config
  const data = chart.data

  const COLORS = ["#0078D4", "#00B7C3", "#87A9FF", "#50E6FF", "#005A9E", "#107C41", "#FFB900"]

  if (!data || data.length === 0) {
    return <div className="text-xs text-[#8A8886] italic">No chart data payload loaded.</div>
  }

  const xAxisKey = config.xAxisKey || Object.keys(data[0])[0]
  const yAxisKeys = config.yAxisKeys || Object.keys(data[0]).filter(k => typeof data[0][k] === "number")

  // For currency chart labels
  const formatYAxis = (tick: any) => {
    if (typeof tick === "number") {
      if (tick >= 10000000) return `₹${(tick / 10000000).toFixed(1)}Cr`
      if (tick >= 100000) return `₹${(tick / 100000).toFixed(1)}L`
      if (tick >= 1000) return `₹${(tick / 1000).toFixed(0)}K`
      return `₹${tick}`
    }
    return tick
  }

  const formatTooltip = (val: any, name: any) => {
    const isCurrency = String(name).toLowerCase().includes("revenue") ||
                       String(name).toLowerCase().includes("spent") ||
                       String(name).toLowerCase().includes("sales") ||
                       String(name).toLowerCase().includes("clv") ||
                       String(name).toLowerCase().includes("amount") ||
                       String(name).toLowerCase().includes("profit") ||
                       String(name).toLowerCase().includes("cost");
    if (isCurrency && typeof val === "number") {
      return [new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val), name]
    }
    return [val, name]
  }

  // 1. Line / Forecast charts
  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey={xAxisKey} stroke={textColor} style={{ fontSize: 10, fontWeight: 600 }} />
          <YAxis stroke={textColor} tickFormatter={formatYAxis} style={{ fontSize: 10, fontWeight: 600 }} />
          <Tooltip formatter={formatTooltip} />
          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
          {yAxisKeys.map((key: string, idx: number) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  // 2. Area Chart
  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0078D4" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0078D4" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey={xAxisKey} stroke={textColor} style={{ fontSize: 10, fontWeight: 600 }} />
          <YAxis stroke={textColor} tickFormatter={formatYAxis} style={{ fontSize: 10, fontWeight: 600 }} />
          <Tooltip formatter={formatTooltip} />
          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
          {yAxisKeys.map((key: string) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke="#0078D4"
              fillOpacity={1}
              fill="url(#areaColor)"
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // 3. Bar Chart
  if (type === "bar" || type === "stacked-bar") {
    const isStacked = type === "stacked-bar"
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey={xAxisKey} stroke={textColor} style={{ fontSize: 10, fontWeight: 600 }} />
          <YAxis stroke={textColor} tickFormatter={formatYAxis} style={{ fontSize: 10, fontWeight: 600 }} />
          <Tooltip formatter={formatTooltip} />
          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
          {yAxisKeys.map((key: string, idx: number) => (
            <Bar
              key={key}
              dataKey={key}
              fill={COLORS[idx % COLORS.length]}
              stackId={isStacked ? "a" : undefined}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // 4. Donut Chart / Pie Chart
  if (type === "donut" || type === "pie") {
    const nameKey = config.nameKey || Object.keys(data[0])[0]
    const valueKey = config.valueKey || yAxisKeys[0]
    const isDonut = type === "donut"

    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            nameKey={nameKey}
            dataKey={valueKey}
            cx="50%"
            cy="50%"
            innerRadius={isDonut ? 50 : 0}
            outerRadius={80}
            paddingAngle={2}
            label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={{ stroke: textColor, strokeWidth: 1 }}
          >
            {data.map((_: any, idx: number) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={formatTooltip} />
          <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700, paddingTop: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  // 5. KPIs View
  if (type === "kpis") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full p-2">
        {yAxisKeys.map((key: string) => {
          const val = data[0][key]
          const isCurrency = key.toLowerCase().includes("revenue") ||
                             key.toLowerCase().includes("sales") ||
                             key.toLowerCase().includes("cost") ||
                             key.toLowerCase().includes("spent") ||
                             key.toLowerCase().includes("amount") ||
                             key.toLowerCase().includes("profit");
          return (
            <div key={key} className="rounded border bg-[#FAF9F8] dark:bg-[#2D2C2B] border-[#E1DFDD] dark:border-[#3B3A39] p-3 text-center shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#605E5C] dark:text-[#A19F9D]">
                {key.replace(/_/g, " ")}
              </p>
              <h2 className="text-base font-bold mt-1 text-[#0078D4] dark:text-[#60CDFF] truncate">
                {isCurrency && typeof val === "number"
                  ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val)
                  : typeof val === "number" ? val.toLocaleString("en-IN") : String(val)}
              </h2>
            </div>
          )
        })}
      </div>
    )
  }

  return null
}

// ─── Table Renderer Component with Pagination ───
const TableRenderer: React.FC<{
  columns: string[]
  rows: any[]
  renderCell: (col: string, val: any) => string
}> = ({ columns, rows, renderCell }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState("")
  const pageSize = 5

  const filteredRows = rows.filter(r => 
    columns.some(col => String(r[col] ?? "").toLowerCase().includes(search.toLowerCase()))
  )

  const totalPages = Math.ceil(filteredRows.length / pageSize)
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  return (
    <div className="flex flex-col bg-white dark:bg-[#252423] text-[#242424] dark:text-[#F3F2F1]">
      {/* Table Filter Box */}
      <div className="p-2 border-b border-[#E1DFDD] dark:border-[#3B3A39] flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Filter table rows..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-7 w-48 rounded border border-[#E1DFDD] dark:border-[#3B3A39] bg-white dark:bg-[#1C1A19] px-2 text-[11px] font-semibold focus:outline-none focus:border-[#0078D4] dark:focus:border-[#60CDFF]"
        />
        <span className="text-[10px] font-bold text-[#8A8886] dark:text-[#A19F9D]">
          Showing {filteredRows.length} of {rows.length} rows
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-[11px] border-collapse">
          <thead className="bg-[#FAF9F8] dark:bg-[#2D2C2B] border-b border-[#E1DFDD] dark:border-[#3B3A39]">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-3 py-2 text-left font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider whitespace-nowrap">
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1DFDD] dark:divide-[#3B3A39]">
            {paginatedRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-[#FAF9F8] dark:hover:bg-[#2D2C2B] transition-colors duration-100">
                {columns.map((col, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 font-semibold whitespace-nowrap">
                    {renderCell(col, row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex h-9 items-center justify-between px-3 border-t border-[#E1DFDD] dark:border-[#3B3A39] bg-[#FAF9F8] dark:bg-[#2D2C2B]">
          <span className="text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D]">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2 py-0.5 rounded border border-[#E1DFDD] dark:border-[#3B3A39] bg-white dark:bg-[#2D2C2B] text-[10px] font-bold disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-0.5 rounded border border-[#E1DFDD] dark:border-[#3B3A39] bg-white dark:bg-[#2D2C2B] text-[10px] font-bold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export default GenieChat
