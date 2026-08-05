import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { GenieChat } from "../common/GenieChat";

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [genieOpen, setGenieOpen] = useState(false)

  return (
    <div 
      className="flex h-screen w-screen overflow-hidden bg-[#F3F2F1] text-[#242424] transition-colors duration-150"
      style={{ fontFamily: "'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
    >
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Panel Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <Navbar onMenuOpen={() => setSidebarOpen(true)} onGenieToggle={() => setGenieOpen(!genieOpen)} />

        {/* Scrollable Workspace Pages wrapper */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px] space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Databricks Genie Agent Floating Chat drawer Overlay */}
      <GenieChat isOpen={genieOpen} onClose={() => setGenieOpen(false)} />
    </div>
  )
}
export default Layout
