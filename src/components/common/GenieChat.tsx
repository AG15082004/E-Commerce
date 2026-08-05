import React, { useState, useRef, useEffect } from "react"
import { Send, X, Sparkles, User, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { createGenieConversation, sendGenieMessage } from "../../services/api"
import type { GenieAttachment } from "../../services/api"

interface Message {
  sender: "user" | "bot"
  text: string
  timestamp: string
  simulated?: boolean
  attachments?: GenieAttachment[]
}

interface GenieChatProps {
  isOpen: boolean
  onClose: () => void
}

export const GenieChat: React.FC<GenieChatProps> = ({ isOpen, onClose }) => {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Hello! I'm your **Databricks Genie Assistant**. I have secure, read-only access to our Unity Catalog schemas (`e_com.gold` and `e_com.ml`).\n\nAsk me anything about:\n- 📊 Sales forecasts & predicted revenue\n- 👥 Churn risk and high risk customer counts\n- 📦 Delivery cycle times & transit delays\n- 🛍️ Top performing product categories",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [expandedSqlId, setExpandedSqlId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const sampleQuestions = [
    "How many High Risk Customers?",
    "What is the sales forecast for next month?",
    "Show top products by revenue",
    "What are the average delivery transit times?",
  ]

  // Persist session and message history across page reloads
  useEffect(() => {
    const savedId = sessionStorage.getItem("genie_conversation_id")
    const savedMsgs = sessionStorage.getItem("genie_chat_messages")
    if (savedId) {
      setConversationId(savedId)
      console.log(`[Genie Chat] Restored session: ${savedId}`)
      if (savedMsgs) {
        try {
          setMessages(JSON.parse(savedMsgs))
          console.log("[Genie Chat] Restored chat message history.")
        } catch (e) {
          console.warn("Failed to parse restored messages.")
        }
      }
    } else {
      console.log("[Genie Chat] Initializing new session on load...")
      createGenieConversation()
        .then(res => {
          if (res.conversation_id) {
            sessionStorage.setItem("genie_conversation_id", res.conversation_id)
            setConversationId(res.conversation_id)
            console.log(`[Genie Chat] Started secure session: ${res.conversation_id}`)
          }
        })
        .catch(err => {
          console.warn("[Genie Chat] Session creation failed. Will lazy-initialize on first message:", err.message)
        })
    }
  }, [])

  // Auto-save messages to sessionStorage
  useEffect(() => {
    if (messages.length > 1) {
      sessionStorage.setItem("genie_chat_messages", JSON.stringify(messages))
    }
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100)
    }
  }, [messages, isOpen])

  const formatCurrencyINR = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num)
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
        lowerCol.includes("value") ||
        lowerCol.includes("probability")
      ) {
        // If it's a probability, format as percentage
        if (lowerCol.includes("probability") && val <= 1.0) {
          return `${(val * 100).toFixed(1)}%`
        }
        return formatCurrencyINR(val)
      }
      return val.toLocaleString("en-IN")
    }
    return String(val)
  }

  const handleSend = async (questionText: string) => {
    if (!questionText.trim()) return

    const userMessage: Message = {
      sender: "user",
      text: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      let activeId = conversationId || sessionStorage.getItem("genie_conversation_id")
      if (!activeId) {
        console.log("[Genie Chat] Lazy instantiating secure session...")
        const sessionRes = await createGenieConversation(questionText)
        activeId = sessionRes.conversation_id
        sessionStorage.setItem("genie_conversation_id", activeId)
        setConversationId(activeId)
      }

      const response = await sendGenieMessage(activeId, questionText)
      const botMessage: Message = {
        sender: "bot",
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        attachments: response.attachments,
        simulated: response.simulated,
      }

      setMessages(prev => [...prev, botMessage])
    } catch (e: any) {
      console.error("[Genie Chat Connection Error]", e)
      const errorMessage: Message = {
        sender: "bot",
        text: "⚠️ **Connection Error**\n\nI experienced an issue communicating with the secure backend proxy. Please verify that your backend server is active and configuration is complete.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const toggleSql = (id: string) => {
    setExpandedSqlId(prev => (prev === id ? null : id))
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed top-0 bottom-0 right-0 z-50 flex h-screen w-[480px] sm:w-[540px] flex-col border-l shadow-fluent-lg bg-white dark:bg-[#252423] border-[#E1DFDD] dark:border-[#3B3A39]"
      style={{
        fontFamily: "'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-5 border-b border-[#E1DFDD] dark:border-[#3B3A39] bg-[#FAF9F8] dark:bg-[#2D2C2B] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0078D4] to-[#00A4EF] text-white">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#242424] dark:text-[#F3F2F1] leading-none">
              E-Commerce Sales & Customer Analytics
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#107C41] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#107C41]"></span>
              </span>
              <span className="text-[9px] font-semibold text-[#107C41] dark:text-[#34D399] uppercase tracking-wider">
                Genie Connected
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1.5 text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#F3F2F1] dark:hover:bg-[#3B3A39] hover:text-[#242424] dark:hover:text-[#F3F2F1] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            {m.sender === "bot" && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full shrink-0 bg-gradient-to-br from-[#0078D4] to-[#00A4EF] text-white mt-0.5">
                <Sparkles size={12} />
              </div>
            )}

            <div className={`max-w-[88%] flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
              {/* Message Bubble */}
              <div
                className={`rounded-lg px-4 py-3 text-[13px] leading-relaxed border ${
                  m.sender === "user"
                    ? "bg-[#0078D4] text-white border-[#005A9E] rounded-br-sm"
                    : "bg-white dark:bg-[#2D2C2B] text-[#242424] dark:text-[#F3F2F1] border-[#E1DFDD] dark:border-[#3B3A39] rounded-bl-sm shadow-sm"
                }`}
              >
                {m.sender === "bot" ? (
                  <div className="genie-markdown space-y-2">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-sm font-bold text-[#242424] dark:text-[#F3F2F1] mb-2 mt-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-[13px] font-bold text-[#242424] dark:text-[#F3F2F1] mb-1.5 mt-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xs font-bold text-[#242424] dark:text-[#F3F2F1] mb-1 mt-1.5">{children}</h3>,
                        p: ({ children }) => <p className="mb-1.5 last:mb-0 text-[13px] leading-relaxed">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold text-[#242424] dark:text-[#F3F2F1]">{children}</strong>,
                        em: ({ children }) => <em className="italic text-[#605E5C] dark:text-[#A19F9D]">{children}</em>,
                        ul: ({ children }) => <ul className="list-none space-y-0.5 my-1.5 ml-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1.5">{children}</ol>,
                        li: ({ children }) => (
                          <li className="text-[13px] leading-relaxed flex items-start gap-1">
                            <span className="text-[#0078D4] dark:text-[#60CDFF] mt-0.5 shrink-0">•</span>
                            <span>{children}</span>
                          </li>
                        ),
                        code: ({ children, className }) => {
                          const isBlock = className?.includes("language-")
                          if (isBlock) {
                            return (
                              <pre className="bg-[#F3F2F1] dark:bg-[#201F1E] rounded p-2.5 my-1.5 overflow-x-auto text-[11px] font-mono border border-[#E1DFDD] dark:border-[#3B3A39]">
                                <code>{children}</code>
                              </pre>
                            )
                          }
                          return <code className="bg-[#F3F2F1] dark:bg-[#201F1E] rounded px-1 py-0.5 text-[11px] font-mono text-[#A80000] dark:text-[#FF6B6B]">{children}</code>
                        },
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-2">
                            <table className="w-full text-[11px] border-collapse">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-[#F3F2F1] dark:bg-[#201F1E]">{children}</thead>,
                        th: ({ children }) => <th className="text-left px-2.5 py-2 font-bold text-[#242424] dark:text-[#F3F2F1] border-b border-[#E1DFDD] dark:border-[#3B3A39]">{children}</th>,
                        td: ({ children }) => <td className="px-2.5 py-1.5 border-b border-[#E1DFDD] dark:border-[#3B3A39] text-[#242424] dark:text-[#F3F2F1]">{children}</td>,
                        hr: () => <hr className="border-[#E1DFDD] dark:border-[#3B3A39] my-2" />,
                        a: ({ children, href }) => <a href={href} className="text-[#0078D4] dark:text-[#60CDFF] underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>

                    {/* Render Attachments (SQL Queries & Tables) */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {m.attachments.map((att, aIdx) => {
                          if (att.type === "query" && att.query) {
                            const isExpanded = expandedSqlId === `${idx}-${aIdx}`
                            return (
                              <div
                                key={aIdx}
                                className="border border-[#E1DFDD] dark:border-[#3B3A39] rounded bg-[#FAF9F8] dark:bg-[#201F1E] overflow-hidden"
                              >
                                <button
                                  onClick={() => toggleSql(`${idx}-${aIdx}`)}
                                  className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#F3F2F1] dark:hover:bg-[#2D2C2B] transition-colors border-b border-[#E1DFDD] dark:border-[#3B3A39]"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Sparkles size={12} className="text-[#0078D4] dark:text-[#60CDFF]" />
                                    Genie SQL Query
                                  </span>
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                                {isExpanded && (
                                  <div className="p-3">
                                    {att.description && (
                                      <p className="text-[11px] text-[#605E5C] dark:text-[#A19F9D] italic mb-2">
                                        {att.description}
                                      </p>
                                    )}
                                    <pre className="bg-white dark:bg-[#111] rounded p-2.5 overflow-x-auto text-[11px] font-mono border border-[#E1DFDD] dark:border-[#3B3A39] text-[#242424] dark:text-[#E1DFDD] whitespace-pre-wrap break-all">
                                      <code>{att.query}</code>
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )
                          }
                          return null
                        })}

                        {/* Render Tabular Results if available */}
                        {m.attachments.map((att, aIdx) => {
                          if (att.type === "query" && att.results && att.results.rows.length > 0) {
                            const cols = att.results.columns
                            const rws = att.results.rows
                            return (
                              <div
                                key={`tbl-${aIdx}`}
                                className="border border-[#E1DFDD] dark:border-[#3B3A39] rounded overflow-hidden shadow-sm"
                              >
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[11px] border-collapse bg-white dark:bg-[#2D2C2B]">
                                    <thead className="bg-[#FAF9F8] dark:bg-[#201F1E] border-b border-[#E1DFDD] dark:border-[#3B3A39]">
                                      <tr>
                                        {cols.map((col, cId) => (
                                          <th
                                            key={cId}
                                            className="px-3 py-2 font-bold text-left text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider whitespace-nowrap"
                                          >
                                            {col.replace(/_/g, " ")}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E1DFDD] dark:divide-[#3B3A39]">
                                      {rws.map((row, rId) => (
                                        <tr key={rId} className="hover:bg-[#FAF9F8] dark:hover:bg-[#201F1E] transition-colors">
                                          {cols.map((col, cId) => (
                                            <td
                                              key={cId}
                                              className="px-3 py-2 text-[#242424] dark:text-[#F3F2F1] font-semibold whitespace-nowrap"
                                            >
                                              {renderTableCellValue(col, row[col])}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )
                          }
                          return null
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="font-semibold">{m.text}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-[#8A8886] dark:text-[#A19F9D] font-semibold">
                  {m.timestamp}
                </span>
                {m.sender === "bot" && m.simulated && (
                  <span className="text-[8px] font-bold text-[#A05A00] dark:text-[#FFB900] bg-[#FFF9E6] dark:bg-[#3D3222] px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Simulated
                  </span>
                )}
              </div>
            </div>

            {m.sender === "user" && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full shrink-0 bg-[#E1F5FE] dark:bg-[#1D3544] text-[#005A9E] dark:text-[#60CDFF] mt-0.5">
                <User size={12} />
              </div>
            )}
          </div>
        ))}

        {/* Loading/Typing Indicator */}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#0078D4] to-[#00A4EF] text-white animate-pulse mt-0.5">
              <Sparkles size={12} />
            </div>
            <div className="flex flex-col items-start">
              <div className="rounded-lg rounded-bl-sm px-3.5 py-2.5 bg-white dark:bg-[#2D2C2B] border border-[#E1DFDD] dark:border-[#3B3A39] shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[#0078D4] dark:text-[#60CDFF]" />
                  <span className="text-xs font-semibold text-[#605E5C] dark:text-[#A19F9D]">
                    Genie is querying Unity Catalog...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Queries */}
        {messages.length === 1 && !loading && (
          <div className="pt-2 space-y-1.5">
            <p className="text-[10px] font-bold text-[#8A8886] dark:text-[#A19F9D] uppercase tracking-wider mb-2 px-1">
              Try asking
            </p>
            {sampleQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="w-full text-left rounded-lg border px-3.5 py-2.5 text-xs font-semibold bg-white dark:bg-[#2D2C2B] text-[#242424] dark:text-[#F3F2F1] border-[#E1DFDD] dark:border-[#3B3A39] hover:bg-[#E1F5FE] dark:hover:bg-[#1D3544] hover:text-[#005A9E] dark:hover:text-[#60CDFF] hover:border-[#B3E5FC] dark:hover:border-[#203746] transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
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
          placeholder="Ask Genie about your retail data..."
          disabled={loading}
          className="flex-1 h-10 rounded-lg border px-4 text-xs font-semibold bg-white dark:bg-[#252423] text-[#242424] dark:text-[#F3F2F1] border-[#E1DFDD] dark:border-[#3B3A39] focus:outline-none focus:border-[#00A4EF] dark:focus:border-[#60CDFF] focus:ring-1 focus:ring-[#00A4EF] dark:focus:ring-[#60CDFF] disabled:opacity-60 placeholder:text-[#A19F9D]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0078D4] text-white hover:bg-[#005A9E] disabled:bg-[#E1DFDD] dark:disabled:bg-[#3B3A39] disabled:text-[#A19F9D] transition-colors shrink-0"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}
export default GenieChat
