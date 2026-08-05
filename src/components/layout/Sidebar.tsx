import React from "react"
import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Package,
  Megaphone,
  Truck,
  Activity,
  X,
  TrendingUp,
  Brain,
} from "lucide-react"
import { cn } from "../../utils/cn"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { name: "Executive Dashboard", to: "/",          icon: LayoutDashboard },
    { name: "Customer Analytics",  to: "/customers", icon: Users },
    { name: "Sales Analytics",     to: "/sales",     icon: DollarSign },
    { name: "Product Performance", to: "/products",  icon: Package },
    { name: "Marketing Analytics", to: "/marketing", icon: Megaphone },
    { name: "Delivery Analytics",  to: "/delivery",  icon: Truck },
    { name: "Support & Clickstream", to: "/support", icon: Activity },
    { name: "Predictive Analytics", to: "/predictive", icon: Brain },
  ]

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm lg:hidden transition-opacity duration-200"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r shadow-card lg:shadow-none",
          "transition-transform duration-200 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "bg-white dark:bg-[#252423] border-[#E1DFDD] dark:border-[#3B3A39]"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-[#E1DFDD] dark:border-[#3B3A39]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#00A4EF] text-white shadow-sm">
              <TrendingUp size={16} />
            </div>
            <div>
              <h1
                className="text-sm font-bold tracking-tight leading-none text-[#242424] dark:text-[#F3F2F1]"
                style={{ fontFamily: "'Segoe UI Variable', 'Segoe UI', sans-serif" }}
              >
                ApexCommerce
              </h1>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#605E5C] dark:text-[#A19F9D]">
                Enterprise Portal
              </span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="rounded p-1 text-[#605E5C] hover:bg-[#F3F2F1] hover:text-[#242424] lg:hidden transition-colors duration-150"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-0.5 px-3 py-5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => {
                if (window.innerWidth < 1024) onClose()
              }}
              className={({ isActive }) =>
                cn(
                  "relative group flex items-center gap-3 rounded px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-all duration-150",
                  isActive
                    ? "bg-[#E1F5FE] text-[#004578] dark:bg-[#1D3544] dark:text-[#60CDFF] font-bold"
                    : "text-[#605E5C] dark:text-[#A19F9D] hover:bg-[#F3F2F1] dark:hover:bg-[#2D2C2B] hover:text-[#242424] dark:hover:text-[#F3F2F1]"
                )
              }
              style={{ fontFamily: "'Segoe UI Variable', 'Segoe UI', sans-serif" }}
            >
              {({ isActive }) => {
                const Icon = item.icon
                return (
                  <>
                    {/* Fluent Active Indicator Line on the left */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#00A4EF] rounded-r fluent-active-indicator" />
                    )}
                    <Icon
                      size={15}
                      className={cn(
                        "shrink-0 transition-colors duration-150",
                        isActive
                          ? "text-[#004578] dark:text-[#60CDFF]"
                          : "text-[#8A8886] dark:text-[#A19F9D] group-hover:text-[#242424] dark:group-hover:text-[#F3F2F1]"
                      )}
                    />
                    <span>{item.name}</span>
                  </>
                )
              }}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-[#E1DFDD] dark:border-[#3B3A39] bg-[#FAF9F8] dark:bg-[#201F1E]">
          <div className="rounded border border-[#E1DFDD] dark:border-[#3B3A39] p-3 bg-white dark:bg-[#252423]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#605E5C] dark:text-[#A19F9D]">
                Portal System
              </span>
              <span className="h-2 w-2 rounded-full bg-[#107C41] animate-pulse" />
            </div>
            <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D]">
              Connected to cloud servers
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
export default Sidebar
