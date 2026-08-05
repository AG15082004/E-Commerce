import fs from "fs";
import path from "path";

// Establish local file-based database for persistence in project scratch directory
const SCRATCH_DIR = path.resolve("./scratch");
const CONVERSATIONS_FILE = path.join(SCRATCH_DIR, "conversations.json");

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
  chart?: any; // ChartRecommendation
  insights?: any; // BusinessInsights
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

let sessions: ChatSession[] = [];

// Helper: load conversations from scratch file
function loadFromFile() {
  try {
    if (!fs.existsSync(SCRATCH_DIR)) {
      fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    }
    if (fs.existsSync(CONVERSATIONS_FILE)) {
      const data = fs.readFileSync(CONVERSATIONS_FILE, "utf-8");
      sessions = JSON.parse(data);
      console.log(`[Conversation Manager] Loaded ${sessions.length} sessions from ${CONVERSATIONS_FILE}`);
    } else {
      sessions = [];
      saveToFile();
    }
  } catch (err: any) {
    console.error(`[Conversation Manager] Failed to load sessions: ${err.message}`);
    sessions = [];
  }
}

// Helper: save conversations to scratch file
function saveToFile() {
  try {
    if (!fs.existsSync(SCRATCH_DIR)) {
      fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    }
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
  } catch (err: any) {
    console.error(`[Conversation Manager] Failed to save sessions: ${err.message}`);
  }
}

// Initialize on startup
loadFromFile();

export const ConversationManager = {
  getSessions(): { id: string; title: string; createdAt: string }[] {
    // Reload to ensure parity
    loadFromFile();
    return sessions.map(s => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt
    })).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getSession(id: string): ChatSession | null {
    loadFromFile();
    return sessions.find(s => s.id === id) || null;
  },

  createSession(firstQuestion?: string): ChatSession {
    loadFromFile();
    const title = firstQuestion 
      ? (firstQuestion.length > 35 ? firstQuestion.substring(0, 32) + "..." : firstQuestion)
      : "New Analysis Chat";

    const newSession: ChatSession = {
      id: "sess_" + Math.random().toString(36).substring(2, 11),
      title,
      createdAt: new Date().toISOString(),
      messages: []
    };

    sessions.push(newSession);
    saveToFile();
    console.log(`[Conversation Manager] Created new session: ${newSession.id} ("${newSession.title}")`);
    return newSession;
  },

  addMessage(sessionId: string, message: Omit<ChatMessage, "id" | "timestamp">): ChatMessage {
    loadFromFile();
    let session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      // Lazy create
      session = this.createSession(message.sender === "user" ? message.text : undefined);
      // Re-fetch
      session = sessions[sessions.length - 1];
    }

    // Auto-update title if it's the first user message
    if (session.messages.length === 0 && message.sender === "user") {
      session.title = message.text.length > 35 ? message.text.substring(0, 32) + "..." : message.text;
    }

    const fullMessage: ChatMessage = {
      ...message,
      id: "msg_" + Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    session.messages.push(fullMessage);
    saveToFile();
    return fullMessage;
  },

  deleteSession(id: string): boolean {
    loadFromFile();
    const lenBefore = sessions.length;
    sessions = sessions.filter(s => s.id !== id);
    if (sessions.length < lenBefore) {
      saveToFile();
      console.log(`[Conversation Manager] Deleted session: ${id}`);
      return true;
    }
    return false;
  },

  setFeedback(sessionId: string, messageId: string, feedback: "like" | "dislike" | null): boolean {
    loadFromFile();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return false;

    const message = session.messages.find(m => m.id === messageId);
    if (!message) return false;

    message.feedback = feedback;
    saveToFile();
    console.log(`[Conversation Manager] Set feedback to ${feedback} for message ${messageId} in ${sessionId}`);
    return true;
  },

  clearSessions() {
    sessions = [];
    saveToFile();
    console.log("[Conversation Manager] Cleared all chat sessions.");
  }
};
