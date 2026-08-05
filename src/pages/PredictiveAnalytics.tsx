import React, { useState, useMemo } from "react"
import { usePredictiveAnalytics } from "../hooks/usePredictiveAnalytics"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { DashboardSkeleton } from "../components/common/LoadingState"
import { Select } from "../components/ui/select"
import { Button } from "../components/ui/button"
import { exportToCSV } from "../utils/export"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart,
} from "recharts"
import {
  Users, Brain, AlertTriangle, TrendingUp, DollarSign, Target,
  Sparkles, ShoppingCart, Download, Printer, RefreshCw,
  Star, Zap, Shield, BarChart2,
} from "lucide-react"

// ─── Constants (Microsoft Fluent Themed) ──────────────────────────────────────

const SEGMENT_COLORS: Record<string, string> = {
  VIP: "#0078D4",       // Office Blue
  Regular: "#00A4EF",   // Microsoft Azure Blue
  New: "#87A9FF",       // Ice Accent Blue
  "At Risk": "#A80000",  // Fluent Dark Red
}

const RISK_COLORS: Record<string, string> = {
  High: "#A80000",      // Fluent Red
  Medium: "#A05A00",    // Fluent Orange/Amber
  Low: "#107C41",       // Excel Green
}

const CLV_TIER_COLORS: Record<string, string> = {
  Platinum: "#004578",  // Deep Azure
  Gold: "#0078D4",      // Office Blue
  Silver: "#00A4EF",     // Azure Blue
  Bronze: "#C7E0F4",     // Light Tint
}

const DONUT_PALETTE = ["#004578", "#0078D4", "#00A4EF", "#87A9FF", "#C7E0F4", "#E1F5FE"]

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#FFFFFF",
  borderColor: "#D2D0CE",
  borderRadius: "4px",
  color: "#242424",
  fontSize: "11px",
}

const SEGMENTS = ["VIP", "Regular", "New", "At Risk"]
const RISK_LEVELS = ["High", "Medium", "Low"]
const CATEGORIES = ["Electronics", "Home Appliances", "Computers", "Audio", "Smart Home", "Furniture", "Kitchen", "Cameras", "Storage", "Tablets"]
const BRANDS = ["Samsung", "Sony", "Apple", "LG", "Philips", "Bosch", "JBL", "Dell", "HP", "Xiaomi"]
const STATES = ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Gujarat", "Rajasthan", "West Bengal", "Telangana"]
const FORECAST_PERIODS = ["7", "14", "30", "60", "90"]

// ─── Custom Pie Label Renderer ───────────────────────────────────────────────
const renderCustomPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 14
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#323130"
      fontSize={9}
      fontWeight={600}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
    </text>
  )
}

// ─── Reusable Sub-components ──────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  badge?: string
}
const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, subtitle, badge }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="flex h-9 w-9 items-center justify-center rounded bg-[#E1F5FE] text-[#0078D4] border border-[#B3E5FC] shrink-0">
      {icon}
    </div>
    <div>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-[#242424] tracking-tight">{title}</h3>
        {badge && (
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#E1F5FE] text-[#005A9E] border border-[#B3E5FC]">
            {badge}
          </span>
        )}
      </div>
      <p className="text-[10px] text-[#605E5C] mt-0.5">{subtitle}</p>
    </div>
  </div>
)

interface AIRecommendationCardProps {
  icon: React.ReactNode
  title: string
  metric: string
  description: string
  action: string
  color: "red" | "blue" | "emerald" | "amber" | "violet"
}
const AI_CARD_STYLES = {
  red: {
    bg: "bg-[#FDF3F3]",
    border: "border-[#F1C5C5]",
    icon: "text-[#A80000] bg-[#FCDCDC]",
    metric: "text-[#A80000]",
    badge: "bg-[#FCDCDC] text-[#A80000]"
  },
  blue: {
    bg: "bg-[#F3F9FD]",
    border: "border-[#D2E9F9]",
    icon: "text-[#0078D4] bg-[#E1F5FE]",
    metric: "text-[#0078D4]",
    badge: "bg-[#E1F5FE] text-[#0078D4]"
  },
  emerald: {
    bg: "bg-[#F0FDF4]",
    border: "border-[#C6F6D5]",
    icon: "text-[#107C41] bg-[#DCFCE7]",
    metric: "text-[#107C41]",
    badge: "bg-[#DCFCE7] text-[#107C41]"
  },
  amber: {
    bg: "bg-[#FFF9E6]",
    border: "border-[#FFE29A]",
    icon: "text-[#A05A00] bg-[#FEF3C7]",
    metric: "text-[#A05A00]",
    badge: "bg-[#FEF3C7] text-[#A05A00]"
  },
  violet: {
    bg: "bg-[#F5F3FF]",
    border: "border-[#DDD6FE]",
    icon: "text-[#5C2D91] bg-[#EDE9FE]",
    metric: "text-[#5C2D91]",
    badge: "bg-[#EDE9FE] text-[#5C2D91]"
  },
}
const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({ icon, title, metric, description, action, color }) => {
  const s = AI_CARD_STYLES[color] || AI_CARD_STYLES.blue
  return (
    <div className={`rounded border p-4 ${s.bg} ${s.border} flex flex-col gap-2 transition-all duration-150 hover:shadow-premium`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${s.icon}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#242424]">{title}</p>
          <p className={`text-lg font-black mt-0.5 leading-none ${s.metric}`}>{metric}</p>
        </div>
      </div>
      <p className="text-[11px] text-[#242424]/80 leading-relaxed">{description}</p>
      <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded self-start ${s.badge}`}>
        <Zap size={10} />
        {action}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const PredictiveAnalytics: React.FC = () => {
  // Filter states
  const [segmentFilter, setSegmentFilter] = useState("All")
  const [riskFilter, setRiskFilter] = useState("All")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [brandFilter, setBrandFilter] = useState("All")
  const [stateFilter, setStateFilter] = useState("All")
  const [forecastPeriod, setForecastPeriod] = useState("30")
  const filters = useMemo(() => ({
    segment: segmentFilter !== "All" ? segmentFilter : undefined,
    risk_level: riskFilter !== "All" ? riskFilter : undefined,
    category: categoryFilter !== "All" ? categoryFilter : undefined,
    brand: brandFilter !== "All" ? brandFilter : undefined,
    state: stateFilter !== "All" ? stateFilter : undefined,
    forecast_period: forecastPeriod,
  }), [segmentFilter, riskFilter, categoryFilter, brandFilter, stateFilter, forecastPeriod])

  const { segments, churn, clv, recommendations, affinities, forecast, isLoading, refetchAll } = usePredictiveAnalytics(filters)

  // ── KPI Computations ──────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const totalCustomers = segments.length
    const vipCustomers = segments.filter(s => s.segment === "VIP").length
    const highRisk = churn.filter(c => c.risk_level === "High").length
    const avgChurnProb = churn.length > 0
      ? (churn.reduce((acc, c) => acc + c.churn_probability, 0) / churn.length * 100).toFixed(1)
      : "0.0"
    const highCLV = clv.filter(c => c.clv_tier === "Platinum" || c.clv_tier === "Gold").length
    const forecastRevenue = forecast.slice(0, 30).reduce((acc, f) => acc + f.predicted_revenue, 0)
    const recAccuracy = recommendations.length > 0
      ? (recommendations.reduce((acc, r) => acc + r.recommendation_score, 0) / recommendations.length * 100).toFixed(1)
      : "0.0"
    const crossSell = affinities.filter(a => a.affinity_score >= 0.7).length

    return { totalCustomers, vipCustomers, highRisk, avgChurnProb, highCLV, forecastRevenue, recAccuracy, crossSell }
  }, [segments, churn, clv, recommendations, affinities, forecast])

  // ── Chart Data Computations ───────────────────────────────────────────────

  const segmentDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    segments.forEach(s => { counts[s.segment] = (counts[s.segment] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [segments])

  const top20VIP = useMemo(() =>
    segments.filter(s => s.segment === "VIP")
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 20),
    [segments]
  )

  const riskDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    churn.forEach(c => { counts[c.risk_level] = (counts[c.risk_level] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [churn])

  const topHighRisk = useMemo(() =>
    churn.filter(c => c.risk_level === "High")
      .sort((a, b) => b.churn_probability - a.churn_probability)
      .slice(0, 10),
    [churn]
  )

  const churnHistogram = useMemo(() => {
    const buckets: Record<string, number> = {
      "0-10%": 0, "10-20%": 0, "20-30%": 0, "30-40%": 0,
      "40-50%": 0, "50-60%": 0, "60-70%": 0, "70-80%": 0, "80-90%": 0, "90-100%": 0,
    }
    churn.forEach(c => {
      const pct = c.churn_probability * 100
      if (pct < 10) buckets["0-10%"]++
      else if (pct < 20) buckets["10-20%"]++
      else if (pct < 30) buckets["20-30%"]++
      else if (pct < 40) buckets["30-40%"]++
      else if (pct < 50) buckets["40-50%"]++
      else if (pct < 60) buckets["50-60%"]++
      else if (pct < 70) buckets["60-70%"]++
      else if (pct < 80) buckets["70-80%"]++
      else if (pct < 90) buckets["80-90%"]++
      else buckets["90-100%"]++
    })
    return Object.entries(buckets).map(([range, count]) => ({ range, count }))
  }, [churn])

  const clvTierDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    clv.forEach(c => { counts[c.clv_tier] = (counts[c.clv_tier] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [clv])

  const topCLVCustomers = useMemo(() =>
    clv.sort((a, b) => b.predicted_clv - a.predicted_clv).slice(0, 10),
    [clv]
  )

  const topRecommendedCategories = useMemo(() => {
    const counts: Record<string, number> = {}
    recommendations.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))
  }, [recommendations])

  const sortedAndFilteredAffinities = useMemo(() => {
    let result = affinities
    if (categoryFilter !== "All") {
      result = result.filter(a => a.source_category === categoryFilter || a.recommended_category === categoryFilter)
    }
    return [...result].sort((a, b) => b.co_purchase_count - a.co_purchase_count).slice(0, 10)
  }, [affinities, categoryFilter])

  const chartForecastData = useMemo(() => {
    const period = Number(forecastPeriod) || 30
    return forecast.slice(0, period)
  }, [forecast, forecastPeriod])

  // ── Dynamic AI recommendations based on computed KPIs ─────────────────────
  const aiRecs = useMemo(() => [
    {
      icon: <AlertTriangle size={16} />,
      title: "High Churn Alert",
      metric: `${kpis.highRisk.toLocaleString()} Customers`,
      description: `${kpis.highRisk} customers show churn risks above 70%. Deploy focused retention sequences before the next purchase window.`,
      action: "Launch Retention Campaign",
      color: "red" as const,
    },
    {
      icon: <Star size={16} />,
      title: "VIP Loyalty Activation",
      metric: `${kpis.vipCustomers.toLocaleString()} VIP Members`,
      description: `${kpis.vipCustomers} customers contribute a significant share of revenue. Activate targeted premium loyalty rewards.`,
      action: "Activate Premium Offers",
      color: "blue" as const,
    },
    {
      icon: <ShoppingCart size={16} />,
      title: "Cross-Sell Bundle Opportunity",
      metric: `${kpis.crossSell.toLocaleString()} High-Affinity Pairs`,
      description: `${kpis.crossSell} product pairs exhibit strong affinity. Cross-sell complementary category pairings to grow average order values.`,
      action: "Create Product Bundles",
      color: "blue" as const,
    },
  ], [kpis])

  // ── Export handlers ───────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const rows = [
      ...segments.map(s => ({ Type: "Segment", ...s })),
      ...churn.slice(0, 100).map(c => ({ Type: "Churn", ...c })),
    ]
    exportToCSV(rows, "predictive-analytics-export.csv")
  }

  const handlePrint = () => window.print()

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)

  const formatLakhCrore = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`
    return `₹${val}`
  }

  const riskBadge = (level: string) => {
    const cls = level === "High"
      ? "bg-red-50 border border-red-150 text-[#A80000]"
      : level === "Medium"
        ? "bg-amber-50 border border-amber-150 text-[#A05A00]"
        : "bg-[#F0FDF4] border border-emerald-150 text-[#107C41]"
    return <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${cls}`}>{level}</span>
  }

  return (
    <div className="space-y-6 animation-fade-in-up">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E1DFDD] pb-5 transition-colors duration-150">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#00A4EF] text-white shadow-sm">
              <Brain size={16} />
            </div>
            <h2 className="text-[#242424] text-xl font-bold tracking-tight leading-none" style={{ fontFamily: "'Segoe UI Variable', 'Segoe UI', sans-serif" }}>
              Predictive Analytics
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-[#E1F5FE] text-[#005A9E] border border-[#B3E5FC]">
              <Sparkles size={9} /> AI Powered
            </span>
          </div>
          <p className="text-xs text-[#605E5C]" style={{ fontFamily: "'Segoe UI Variable', 'Segoe UI', sans-serif" }}>
            ML-powered business growth insights and predictions.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 h-8 text-xs">
            <Download size={13} className="text-[#00A4EF]" />
            <span>Export CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 h-8 text-xs">
            <Printer size={13} className="text-[#00A4EF]" />
            <span>Print</span>
          </Button>
          <Button variant="outline" size="icon" onClick={refetchAll} disabled={isLoading} className="h-8 w-8" title="Refresh ML data">
            <RefreshCw size={13} className={`text-[#00A4EF] ${isLoading ? "animate-spin text-[#0078D4]" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Global Filters (CLV Tier Filter Removed) ─────────────────────────── */}
      <Card className="p-4 bg-white border border-[#E1DFDD] shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-32">
            <Select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)}>
              <option value="All">All Segments</option>
              {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="w-32">
            <Select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
              <option value="All">All Risk Levels</option>
              {RISK_LEVELS.map(r => <option key={r} value={r}>{r} Risk</option>)}
            </Select>
          </div>
          <div className="w-36">
            <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="w-28">
            <Select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
              <option value="All">All Brands</option>
              {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </Select>
          </div>
          <div className="w-32">
            <Select value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
              <option value="All">All States</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="w-36">
            <Select value={forecastPeriod} onChange={e => setForecastPeriod(e.target.value)}>
              {FORECAST_PERIODS.map(p => <option key={p} value={p}>{p}-Day Forecast</option>)}
            </Select>
          </div>
          {/* Recommendation Rank filter removed */}
        </div>
      </Card>

      {/* ── Loading skeleton ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-8 stagger-fade">

          {/* ════════════════════════════════════════════════════════════════════
              KPI CARDS
          ════════════════════════════════════════════════════════════════════ */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Customers */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] uppercase tracking-wider">Total Customers</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <Users size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-[#242424]">{kpis.totalCustomers.toLocaleString()}</div>
                <p className="text-[10px] text-[#605E5C] mt-1 font-semibold">Profiled customers</p>
              </CardContent>
            </Card>

            {/* VIP Customers */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] uppercase tracking-wider">VIP Customers</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <Star size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-[#0078D4]">{kpis.vipCustomers.toLocaleString()}</div>
                <p className="text-[10px] text-[#605E5C] mt-1 font-semibold">Premium members</p>
              </CardContent>
            </Card>

            {/* High Risk */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] uppercase tracking-wider">High Churn Risk</CardTitle>
                <div className="rounded bg-[#FCDCDC] p-1.5 text-[#A80000] border border-[#F1C5C5]">
                  <AlertTriangle size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-[#A80000]">{kpis.highRisk.toLocaleString()}</div>
                <p className="text-[10px] text-[#605E5C] mt-1 font-semibold">High probability churn</p>
              </CardContent>
            </Card>

            {/* Avg Churn Probability */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] uppercase tracking-wider">Avg Churn Probability</CardTitle>
                <div className="rounded bg-[#FEF3C7] p-1.5 text-[#A05A00] border border-[#FFE29A]">
                  <Shield size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-[#A05A00]">{kpis.avgChurnProb}%</div>
                <p className="text-[10px] text-[#605E5C] mt-1 font-semibold">Average churn score</p>
              </CardContent>
            </Card>

            {/* High CLV */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] uppercase tracking-wider">High CLV Customers</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <DollarSign size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-[#0078D4]">{kpis.highCLV.toLocaleString()}</div>
                <p className="text-[10px] text-[#605E5C] mt-1 font-semibold">High predicted value</p>
              </CardContent>
            </Card>

            {/* Forecast Revenue */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] uppercase tracking-wider">Forecast Revenue (30D)</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <TrendingUp size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-[#0078D4]">{formatLakhCrore(kpis.forecastRevenue)}</div>
                <p className="text-[10px] text-[#605E5C] mt-1 font-semibold">Forecasted growth</p>
              </CardContent>
            </Card>

            {/* Recommendation Accuracy */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] uppercase tracking-wider">Rec Engine Accuracy</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <Target size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-[#0078D4]">{kpis.recAccuracy}%</div>
                <p className="text-[10px] text-[#605E5C] mt-1 font-semibold">Average matches score</p>
              </CardContent>
            </Card>

            {/* Cross-Sell Opportunities */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] uppercase tracking-wider">Cross-Sell Leads</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <ShoppingCart size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-[#242424]">{kpis.crossSell.toLocaleString()}</div>
                <p className="text-[10px] text-[#605E5C] mt-1 font-semibold">High affinity product pairs</p>
              </CardContent>
            </Card>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 1 — CUSTOMER INTELLIGENCE
          ════════════════════════════════════════════════════════════════════ */}
          <div>
            <SectionHeader
              icon={<Users size={16} />}
              title="Customer Intelligence"
              subtitle="Machine learning segmentation based on purchase behavior, frequency, and order values."
              badge="Segment Analysis"
            />
            <div className="grid gap-6 md:grid-cols-2">
              {/* Segment Donut */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Segment Distribution</CardTitle>
                  <CardDescription>VIP · Regular · New · At Risk breakdown</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={segmentDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={renderCustomPieLabel} labelLine={false}>
                          {segmentDistribution.map((entry, i) => (
                            <Cell key={i} fill={SEGMENT_COLORS[entry.name] || DONUT_PALETTE[i % DONUT_PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} itemStyle={{ color: "var(--chart-tooltip-text)" }} labelStyle={{ color: "var(--chart-text)" }} formatter={(v: any) => [v.toLocaleString(), "Customers"]} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} formatter={(value) => <span className="text-[#0078D4] font-semibold">{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top 20 VIP Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 20 VIP Customers</CardTitle>
                  <CardDescription>Highest-revenue VIP segment members by predicted lifetime value</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[280px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Avg OV</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {top20VIP.slice(0, 20).map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-semibold text-[#242424]">{c.customer_name}</TableCell>
                            <TableCell className="text-right">{c.total_orders}</TableCell>
                            <TableCell className="text-right font-black text-[#0078D4]">{formatLakhCrore(c.total_revenue)}</TableCell>
                            <TableCell className="text-right text-[#0078D4] font-semibold">{formatCurrency(c.avg_order_value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 2 — CHURN INTELLIGENCE
          ════════════════════════════════════════════════════════════════════ */}
          <div>
            <SectionHeader
              icon={<AlertTriangle size={16} />}
              title="Churn Intelligence"
              subtitle="AI-driven churn prediction model highlighting high-risk customer profiles requiring engagement."
              badge="Churn Risk Analysis"
            />
            <div className="grid gap-6 md:grid-cols-3">
              {/* Risk Distribution Donut */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                  <CardDescription>Customer churn risk categorization</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={renderCustomPieLabel} labelLine={false}>
                          {riskDistribution.map((entry, i) => (
                            <Cell key={i} fill={RISK_COLORS[entry.name] || DONUT_PALETTE[i]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} itemStyle={{ color: "var(--chart-tooltip-text)" }} labelStyle={{ color: "var(--chart-text)" }} formatter={(v: any) => [v.toLocaleString(), "Customers"]} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} formatter={(value) => <span className="text-[#0078D4] font-semibold">{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Churn Probability Histogram */}
              <Card>
                <CardHeader>
                  <CardTitle>Churn Probability Distribution</CardTitle>
                  <CardDescription>Histogram of predicted churn probabilities across all customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={churnHistogram} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                        <XAxis dataKey="range" stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)" }} fontSize={9} tickLine={false} angle={-30} textAnchor="end" height={40} interval={0} />
                        <YAxis stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)" }} fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} itemStyle={{ color: "var(--chart-tooltip-text)" }} labelStyle={{ color: "var(--chart-text)" }} formatter={(v: any) => [v, "Customers"]} />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]} name="Customers" maxBarSize={35}>
                          {churnHistogram.map((entry, i) => {
                            const pct = parseInt(entry.range)
                            const fill = pct >= 70 ? "#A80000" : pct >= 40 ? "#A05A00" : "#107C41"
                            return <Cell key={i} fill={fill} />
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top High Risk Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Top High Risk Customers</CardTitle>
                  <CardDescription>Customers with highest churn probability requiring immediate action</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[280px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Prob.</TableHead>
                          <TableHead>Risk</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topHighRisk.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="font-semibold text-[#242424] text-xs">{c.customer_name}</div>
                            </TableCell>
                            <TableCell className="text-right font-black text-[#A80000]">{(c.churn_probability * 100).toFixed(1)}%</TableCell>
                            <TableCell>{riskBadge(c.risk_level)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 3 — CUSTOMER LIFETIME VALUE
          ════════════════════════════════════════════════════════════════════ */}
          <div>
            <SectionHeader
              icon={<DollarSign size={16} />}
              title="Customer Lifetime Value (CLV)"
              subtitle="Long-term customer value projections calculated from historical order recency and frequency."
              badge="CLV Forecast"
            />
            <div className="grid gap-6 md:grid-cols-2">
              {/* CLV Tier Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>CLV Tier Distribution</CardTitle>
                  <CardDescription>Platinum · Gold · Silver · Bronze tier breakdown</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={clvTierDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={renderCustomPieLabel} labelLine={false}>
                          {clvTierDistribution.map((entry, i) => (
                            <Cell key={i} fill={CLV_TIER_COLORS[entry.name] || DONUT_PALETTE[i]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} itemStyle={{ color: "var(--chart-tooltip-text)" }} labelStyle={{ color: "var(--chart-text)" }} formatter={(v: any) => [v.toLocaleString(), "Customers"]} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} formatter={(value) => <span className="text-[#0078D4] font-semibold">{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Predicted CLV Customers Horizontal Bar */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Predicted CLV Customers</CardTitle>
                  <CardDescription>Highest predicted LTV customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topCLVCustomers.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 30, left: 15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                        <XAxis type="number" stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)" }} fontSize={9} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="customer_name" stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)" }} fontSize={9} tickLine={false} width={80} interval={0} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} itemStyle={{ color: "var(--chart-tooltip-text)" }} labelStyle={{ color: "var(--chart-text)" }} formatter={(v: any) => [formatCurrency(v), "Predicted CLV"]} />
                        <Bar dataKey="predicted_clv" fill="#00A4EF" radius={[0, 4, 4, 0]} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 4 — RECOMMENDATION ENGINE
          ════════════════════════════════════════════════════════════════════ */}
          <div>
            <SectionHeader
              icon={<Target size={16} />}
              title="Recommendation Engine"
              subtitle="Personalized recommendations matching customer purchasing preferences with high-scoring items."
              badge="Product Recommendations"
            />
            <div className="grid gap-6 md:grid-cols-2">
              {/* Top Recommended Products Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Recommended Products</CardTitle>
                  <CardDescription>Personalized product recommendations by customer and score</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[320px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead className="text-center">Rank</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recommendations.slice(0, 15).map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-semibold text-[#242424]">{r.customer_name}</TableCell>
                            <TableCell>
                              <div className="text-xs font-semibold text-[#0078D4] max-w-[120px] truncate">{r.product_name}</div>
                              <div className="text-[10px] text-[#605E5C] font-semibold">{r.brand}</div>
                            </TableCell>
                            <TableCell>
                              <span className="text-[10px] font-bold text-[#0078D4] bg-[#E1F5FE] px-1.5 py-0.5 rounded border border-[#B3E5FC]">{r.category}</span>
                            </TableCell>
                            <TableCell className="text-right font-black text-[#0078D4]">{(r.recommendation_score * 100).toFixed(0)}%</TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#E1F5FE] text-[10px] font-bold text-[#005A9E]">
                                {r.recommendation_rank}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Top Recommended Categories Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Recommended Categories</CardTitle>
                  <CardDescription>Categories most frequently recommended</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topRecommendedCategories} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                        <XAxis dataKey="name" stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)" }} fontSize={9} tickLine={false} angle={-20} textAnchor="end" height={50} interval={0} />
                        <YAxis stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)" }} fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} itemStyle={{ color: "var(--chart-tooltip-text)" }} labelStyle={{ color: "var(--chart-text)" }} formatter={(v: any) => [v, "Recommendations"]} />
                        <Bar dataKey="value" fill="#00A4EF" radius={[4, 4, 0, 0]} name="Recommendations" maxBarSize={45} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 5 — CROSS-SELL INTELLIGENCE (AFFINITY HEATMAP)
          ════════════════════════════════════════════════════════════════════ */}
          <div>
            <SectionHeader
              icon={<ShoppingCart size={16} />}
              title="Cross-Sell Intelligence"
              subtitle="Co-purchase affinity analysis mapping items frequently bought together to discover bundle opportunities."
              badge="Cross-Sell Analysis"
            />
            <Card>
              <CardHeader>
                <CardTitle>Top Cross-Sell Recommendations</CardTitle>
                <CardDescription>Product pairs frequently purchased together sorted by co-purchase count</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[350px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source Product</TableHead>
                        <TableHead>Recommended Product</TableHead>
                        <TableHead>Source Category</TableHead>
                        <TableHead>Recommended Category</TableHead>
                        <TableHead className="text-right">Co-Purchases</TableHead>
                        <TableHead className="text-right">Affinity Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAndFilteredAffinities.map((aff, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-semibold text-[#242424]">{aff.source_product}</TableCell>
                          <TableCell className="font-semibold text-[#0078D4]">{aff.recommended_product}</TableCell>
                          <TableCell>
                            <span className="text-[10px] font-bold text-[#0078D4] bg-[#E1F5FE] px-1.5 py-0.5 rounded border border-[#B3E5FC]">
                              {aff.source_category}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px] font-bold text-[#0078D4] bg-[#E1F5FE] px-1.5 py-0.5 rounded border border-[#B3E5FC]">
                              {aff.recommended_category}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-[#242424]">
                            {aff.co_purchase_count.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-black text-[#0078D4]">
                              {(aff.affinity_score * 100).toFixed(0)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {sortedAndFilteredAffinities.length === 0 && (
                        <TableRow>
                          <td colSpan={6} className="text-center py-8 text-[#605E5C]">No cross-sell recommendations available for this category</td>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 6 — SALES FORECAST
          ════════════════════════════════════════════════════════════════════ */}
          <div>
            <SectionHeader
              icon={<BarChart2 size={16} />}
              title="Sales Forecast"
              subtitle="Future revenue projections derived from seasonal transaction patterns."
              badge="Sales Forecast"
            />
            <div>
              {/* Forecast Line Chart (Full Width) */}
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>{forecastPeriod}-Day Revenue Forecast</CardTitle>
                  <CardDescription>Predicted revenue projections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartForecastData} margin={{ top: 10, right: 20, left: 15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0078D4" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#0078D4" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                        <XAxis dataKey="forecast_date" stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)" }} fontSize={9} tickLine={false} tickFormatter={d => d?.slice(5) || ""} />
                        <YAxis stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)" }} fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} itemStyle={{ color: "var(--chart-tooltip-text)" }} labelStyle={{ color: "var(--chart-text)" }} formatter={(v: any) => [formatCurrency(v), "Predicted Revenue"]} labelFormatter={l => `Date: ${l}`} />
                        <Area type="monotone" dataKey="predicted_revenue" stroke="#0078D4" strokeWidth={2.5} fill="url(#forecastGradient)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} name="predicted_revenue" />
                        <Legend wrapperStyle={{ fontSize: "11px" }} formatter={() => "Predicted Revenue"} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              SECTION 7 — AI BUSINESS RECOMMENDATIONS
          ════════════════════════════════════════════════════════════════════ */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-[#E1F5FE] text-[#0078D4] border border-[#B3E5FC] shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#242424] tracking-tight">AI Business Recommendations</h3>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#E1F5FE] text-[#005A9E] border border-[#B3E5FC]">
                    Generative AI
                  </span>
                </div>
                <p className="text-[10px] text-[#605E5C] mt-0.5">
                  Actionable business decisions synthesized from predictive analytics insights. Priority-ranked by expected revenue impact.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {aiRecs.map((rec, i) => (
                <AIRecommendationCard key={i} {...rec} />
              ))}
            </div>

            {/* Summary bar */}
            <div className="mt-6 p-4 rounded bg-[#E1F5FE] border border-[#B3E5FC] flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#00A4EF] text-white shadow-sm">
                <Brain size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-[#242424]">AI Analysis Complete — {aiRecs.length} Actionable Recommendations Generated</p>
                <p className="text-[11px] text-[#605E5C] mt-0.5 font-semibold">
                  All recommendations are derived from live predictive intelligence models. Data freshness: <span className="text-[#0078D4] font-bold">Real-time</span>. Next model refresh: <span className="text-[#0078D4] font-bold">Automated daily</span>.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="h-2 w-2 rounded-full bg-[#107C41] animate-pulse" />
                <span className="text-[10px] font-bold text-[#107C41] uppercase tracking-wider">Predictive Pipeline Active</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

export default PredictiveAnalytics
