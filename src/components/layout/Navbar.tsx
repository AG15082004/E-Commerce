import React, { useState, useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Menu,
  Search,
  ChevronRight,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  HelpCircle,
  Sparkles,
} from "lucide-react"
import { Button } from "../ui/button"

interface NavbarProps {
  onMenuOpen: () => void
  onGenieToggle: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuOpen, onGenieToggle }) => {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen]   = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery]   = useState("")
  const [theme, setTheme]               = useState<"light" | "dark">("light")

  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef  = useRef<HTMLDivElement>(null)

  // Sync theme state on mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark")
    setTheme(isDark ? "dark" : "light")
  }, [])

  // Auto-close dropdowns on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node))   setSearchFocused(false)
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  const getPageTitle = (path: string) => {
    switch (path) {
      case "/":           return "Executive Dashboard"
      case "/customers":  return "Customer Analytics"
      case "/sales":      return "Sales Analytics"
      case "/products":   return "Product Performance"
      case "/marketing":  return "Marketing Analytics"
      case "/delivery":   return "Delivery Analytics"
      case "/support":    return "Support & Clickstream"
      case "/predictive": return "Predictive Analytics"
      default:            return "Analytics Dashboard"
    }
  }

  const searchEntities = [
    { title: "Revenue, NPS & CR Metrics",        category: "Dashboards", path: "/" },
    { title: "Customer CLV & Acquisition",       category: "Dashboards", path: "/customers" },
    { title: "Net Revenue & Orders",             category: "Dashboards", path: "/sales" },
    { title: "Inventory & Stock Levels",         category: "Dashboards", path: "/products" },
    { title: "Campaign ROI & Impressions",       category: "Dashboards", path: "/marketing" },
    { title: "Carrier Transit & Delivery",       category: "Dashboards", path: "/delivery" },
    { title: "CSAT, Funnel & Sessions",          category: "Dashboards", path: "/support" },
    { title: "AI Predictions & Churn Forecasts", category: "Dashboards", path: "/predictive" },
  ]

  const filteredResults = searchQuery
    ? searchEntities.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    const root = window.document.documentElement
    if (next === "dark") {
      root.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      root.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b px-6 shadow-sm bg-white dark:bg-[#252423] border-[#E1DFDD] dark:border-[#3B3A39] transition-colors duration-150"
      style={{
        fontFamily: "'Segoe UI Variable', 'Segoe UI', sans-serif",
      }}
    >
      {/* Left: Mobile toggle + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="rounded p-1.5 text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#F3F2F1] dark:hover:bg-[#2D2C2B] hover:text-[#242424] dark:hover:text-[#F3F2F1] lg:hidden transition-all duration-120"
        >
          <Menu size={20} />
        </button>

        <nav className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[#605E5C] dark:text-[#A19F9D]">
          <span
            className="hover:text-[#0078D4] dark:hover:text-[#60CDFF] cursor-pointer transition-colors duration-120"
            onClick={() => navigate("/")}
          >
            ApexCommerce
          </span>
          <ChevronRight size={14} className="text-[#8A8886] dark:text-[#A19F9D]" />
          <span className="text-[#242424] dark:text-[#F3F2F1] font-bold">{getPageTitle(pathname)}</span>
        </nav>
      </div>

      {/* Right: Search + Theme Toggle + User */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        {/* Global Search */}
        <div ref={searchRef} className="relative w-full max-w-[260px] sm:max-w-[300px]">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#605E5C] dark:text-[#A19F9D]">
            <Search size={14} />
          </div>
          <input
            id="global-search"
            type="text"
            placeholder="Search dashboards, metrics..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            className={[
              "w-full h-9 rounded border pl-9 pr-3 text-xs font-semibold",
              "transition-all duration-120",
              "bg-[#FAF9F8] dark:bg-[#2D2C2B] text-[#242424] dark:text-[#F3F2F1] placeholder-[#A19F9D]",
              "border-[#E1DFDD] dark:border-[#3B3A39] focus:border-[#00A4EF] dark:focus:border-[#60CDFF] focus:ring-1 focus:ring-[#00A4EF] focus:bg-white dark:focus:bg-[#252423] focus:outline-none",
              "hover:border-[#C8C6C4] dark:hover:border-[#484644] hover:bg-[#F3F2F1] dark:hover:bg-[#201F1E]",
            ].join(" ")}
          />

          {/* Search Dropdown */}
          {searchFocused && (
            <div className="absolute right-0 top-11 z-50 w-[310px] rounded border border-[#E1DFDD] dark:border-[#3B3A39] bg-white dark:bg-[#252423] p-2 shadow-fluent-md">
              {filteredResults.length > 0 ? (
                <div className="space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider">
                    Search Results
                  </div>
                  {filteredResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => { navigate(r.path); setSearchQuery(""); setSearchFocused(false) }}
                      className="w-full flex justify-between items-center text-left rounded px-2 py-2 text-xs text-[#242424] dark:text-[#F3F2F1] hover:bg-[#E1F5FE] dark:hover:bg-[#2D2C2B] hover:text-[#005A9E] dark:hover:text-[#60CDFF] transition-colors duration-120"
                    >
                      <span className="font-semibold">{r.title}</span>
                      <span className="text-[10px] text-[#005A9E] bg-[#E1F5FE] dark:bg-[#1D3544] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        {r.category}
                      </span>
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="p-4 text-center text-xs text-[#605E5C] dark:text-[#A19F9D]">
                  No results for "{searchQuery}"
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider">
                    Quick Navigation
                  </div>
                  {searchEntities.slice(0, 5).map((r, i) => (
                    <button
                      key={i}
                      onClick={() => { navigate(r.path); setSearchFocused(false) }}
                      className="w-full flex justify-between items-center text-left rounded px-2 py-2 text-xs text-[#242424] dark:text-[#F3F2F1] hover:bg-[#E1F5FE] dark:hover:bg-[#2D2C2B] hover:text-[#005A9E] dark:hover:text-[#60CDFF] transition-colors duration-120"
                    >
                      <span>{getPageTitle(r.path)}</span>
                      <ChevronRight size={12} className="text-[#8A8886] dark:text-[#A19F9D]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title="Switch theme"
          id="theme-toggle"
          className="h-9 w-9 text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#F3F2F1] dark:hover:bg-[#2D2C2B] hover:text-[#242424] dark:hover:text-[#F3F2F1] transition-all duration-120"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </Button>

        <div className="h-5 w-px bg-[#E1DFDD] dark:bg-[#3B3A39]" />

        {/* Genie Chat Trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onGenieToggle}
          title="Open Genie AI Assistant"
          className="h-9 w-9 text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#F3F2F1] dark:hover:bg-[#2D2C2B] hover:text-[#0078D4] dark:hover:text-[#60CDFF] transition-all duration-120 relative"
        >
          <Sparkles size={16} className="text-[#0078D4] dark:text-[#60CDFF]" />
          <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A4EF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0078D4]"></span>
          </span>
        </Button>

        <div className="h-5 w-px bg-[#E1DFDD] dark:bg-[#3B3A39]" />

        {/* User Account */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#E1F5FE] dark:bg-[#1D3544] text-[#005A9E] dark:text-[#60CDFF] text-xs font-bold border border-[#B3E5FC] dark:border-[#203746] transition-all duration-120">
              JD
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-bold text-[#242424] dark:text-[#F3F2F1] leading-none">John Doe</span>
              <span className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] font-semibold mt-0.5">Administrator</span>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 z-50 w-52 rounded border border-[#E1DFDD] dark:border-[#3B3A39] bg-white dark:bg-[#252423] p-1.5 shadow-fluent-md">
              <div className="border-b border-[#E1DFDD] dark:border-[#3B3A39] px-3 py-2">
                <p className="text-xs font-bold text-[#242424] dark:text-[#F3F2F1]">John Doe</p>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] truncate font-medium">john.doe@enterprise.com</p>
              </div>
              <div className="py-1">
                <button className="flex w-full items-center gap-2.5 rounded px-3 py-1.5 text-xs text-[#242424] dark:text-[#F3F2F1] hover:bg-[#E1F5FE] dark:hover:bg-[#2D2C2B] hover:text-[#005A9E] dark:hover:text-[#60CDFF] transition-colors duration-125">
                  <User size={13} className="text-[#00A4EF] dark:text-[#60CDFF]" /> Account Settings
                </button>
                <button className="flex w-full items-center gap-2.5 rounded px-3 py-1.5 text-xs text-[#242424] dark:text-[#F3F2F1] hover:bg-[#E1F5FE] dark:hover:bg-[#2D2C2B] hover:text-[#005A9E] dark:hover:text-[#60CDFF] transition-colors duration-125">
                  <Settings size={13} className="text-[#00A4EF] dark:text-[#60CDFF]" /> Platform Config
                </button>
                <button className="flex w-full items-center gap-2.5 rounded px-3 py-1.5 text-xs text-[#242424] dark:text-[#F3F2F1] hover:bg-[#E1F5FE] dark:hover:bg-[#2D2C2B] hover:text-[#005A9E] dark:hover:text-[#60CDFF] transition-colors duration-125">
                  <HelpCircle size={13} className="text-[#00A4EF] dark:text-[#60CDFF]" /> Help Center
                </button>
              </div>
              <div className="border-t border-[#E1DFDD] dark:border-[#3B3A39] pt-1">
                <button className="flex w-full items-center gap-2.5 rounded px-3 py-1.5 text-xs text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors duration-125">
                  <LogOut size={13} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
export default Navbar
