import React, { useState } from "react"
import { useAnalytics } from "../hooks/useAnalytics"
import { PageHeader } from "../components/layout/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { DashboardSkeleton } from "../components/common/LoadingState"
import { EmptyState } from "../components/common/EmptyState"
import { exportToCSV } from "../utils/export"
import { DateRangePicker } from "../components/ui/date-range-picker"
import { Select } from "../components/ui/select"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  DollarSign,
  ShoppingCart,
  Percent,
  Users,
  Box,
  TrendingUp,
  Activity,
  BookOpen,
} from "lucide-react"

const renderCustomPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name, fill }: any) => {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 14
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={9}
      fontWeight={700}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${name}: ${percent ? (percent * 100).toFixed(1) : "0.0"}%`}
    </text>
  )
}

export const ExecutiveDashboard: React.FC = () => {
  // Local filter states
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [stateFilter, setStateFilter] = useState("All")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")

  const { data, isLoading, refetch } = useAnalytics(startDate, endDate, {
    state: stateFilter,
    category: categoryFilter,
    status: statusFilter,
  })

  const STATES = data?.metadata?.states || []
  const CATEGORIES = data?.metadata?.categories || []
  const STATUSES = ["Completed", "Cancelled", "Returned"]

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleExport = () => {
    if (data?.overview) {
      exportToCSV(
        [
          { Metric: "Total Revenue", Value: data.overview.totalRevenue },
          { Metric: "Total Profit", Value: data.overview.totalProfit },
          { Metric: "Orders Count", Value: data.overview.orderCount },
          { Metric: "Registered Customers", Value: data.overview.totalCustomers },
          { Metric: "Average Order Value", Value: data.overview.avgOrderValue },
          { Metric: "Profit Margin", Value: `${data.overview.profitMargin}%` },
        ],
        "executive-overview.csv"
      )
    }
  }

  // Revenue by Category donut palette & general chart colors
  const COLORS = ["#2563EB", "#10B981", "#D97706", "#C084FC", "#E11D48", "#6EE7B7"]

  return (
    <div className="space-y-6 animation-fade-in">
      <PageHeader
        title="Executive Performance Summary"
        description="High-level enterprise indicators. Blends sales, marketing, support and logistics summary tables."
        onExport={handleExport}
        onRefresh={refetch}
        isLoading={isLoading}
      />

      {/* Filters Bar Card */}
      <Card className="p-4 bg-slate-50/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start)
              setEndDate(end)
            }}
          />

          <div className="w-32">
            <Select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="dark:bg-slate-900"
            >
              <option value="All">All States</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-36">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="dark:bg-slate-900"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-36">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="dark:bg-slate-900"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Main dashboard contents container */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : !data || !data.overview ? (
        <EmptyState title="No executive data matches these filters" />
      ) : (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Revenue */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:shadow-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Revenue</CardTitle>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-1.5 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                  <DollarSign size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {formatCurrency(data.overview.totalRevenue)}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Gross transaction value</p>
              </CardContent>
            </Card>

            {/* Total Profit */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:shadow-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Profit</CardTitle>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-1.5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                  <TrendingUp size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {formatCurrency(data.overview.totalProfit)}
                </div>
                <p className="text-[10px] text-emerald-650 dark:text-emerald-450 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded inline-block mt-1">
                  Margin: {data.overview.profitMargin}%
                </p>
              </CardContent>
            </Card>

            {/* Orders count */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:shadow-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Orders Count</CardTitle>
                <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-1.5 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/50">
                  <ShoppingCart size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {data.overview.orderCount.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Completed retail transactions</p>
              </CardContent>
            </Card>

            {/* Registered customers */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:shadow-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Registered Customers</CardTitle>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-1.5 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50">
                  <Users size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {data.overview.totalCustomers.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Unique customer catalog nodes</p>
              </CardContent>
            </Card>

            {/* Average Order Value */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:shadow-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Average Order Value (AOV)</CardTitle>
                <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 p-1.5 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800/50">
                  <Activity size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {formatCurrency(data.overview.avgOrderValue)}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Average cart ticket size</p>
              </CardContent>
            </Card>

            {/* Profit margin */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:shadow-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Profit Margin %</CardTitle>
                <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 p-1.5 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50">
                  <Percent size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {data.overview.profitMargin}%
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Aggregate yield percentage</p>
              </CardContent>
            </Card>

            {/* Active Customers */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:shadow-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Customers (30d)</CardTitle>
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-1.5 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                  <Users size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {data.overview.activeCustomers.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Users with &gt;1 checkout</p>
              </CardContent>
            </Card>

            {/* Total Products Sold */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:shadow-premium">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Products Sold</CardTitle>
                <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-700">
                  <Box size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {data.overview.totalProductsSold.toLocaleString()} Units
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Total items fulfilling shipping</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue and Profit Trend charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend Over Time</CardTitle>
                <CardDescription>Daily gross transactions trend.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.overview.dailyTrends} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 10000000 ? `${(val / 10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val / 100000).toFixed(0)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Line type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Revenue (?)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit Trend Over Time</CardTitle>
                <CardDescription>Net checkout profit margins trajectory.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.overview.dailyTrends} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 10000000 ? `${(val / 10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val / 100000).toFixed(0)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Area type="monotone" dataKey="Profit" stroke="#22C55E" strokeWidth={2.5} fillOpacity={1} fill="url(#profitGrad)" name="Profit (₹)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Geographical & Category & Orders grid */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Customer State</CardTitle>
                <CardDescription>Sales distribution by state origin.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.overview.revenueByState} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} interval={0} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 10000000 ? `${(val / 10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val / 100000).toFixed(0)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Bar dataKey="value" fill="#38A169" radius={[4, 4, 0, 0]} name="Revenue (₹)" maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
                <CardDescription>Product category revenue shares.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.overview.revenueByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        label={renderCustomPieLabel}
                        labelLine={false}
                      >
                        {data.overview.revenueByCategory.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Orders Volume</CardTitle>
                <CardDescription>Completed checkout counts by month.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.overview.monthlyOrders} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} interval={0} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Bar dataKey="orders" fill="#38A169" radius={[4, 4, 0, 0]} name="Orders" maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Brands horizontal bar chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Selling Brands</CardTitle>
              <CardDescription>Aggregate sales revenue generated by manufacturer label.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.overview.top10Brands} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                    <Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} name="Sales (₹)" maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Insights Panel */}
          <Card className="border border-blue-150/40 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-950/10 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <BookOpen className="text-blue-600 dark:text-blue-400" size={18} />
              <CardTitle className="text-slate-800 dark:text-slate-200 text-sm font-bold">Executive Insights</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-2">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100/50 dark:border-slate-850">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Revenue Projection</h4>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Growth remains positive (+4.8% MoM)</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">July projections track at $4.2M gross run-rate values.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100/50 dark:border-slate-850">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Margin Drivers</h4>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Electronics Lead margins</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Hardware categories represent 45% of total monthly margins.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100/50 dark:border-slate-850">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Retention Score</h4>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">VIP segment counts up 12%</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Repeat customer retention index hit 94.2% satisfaction.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100/50 dark:border-slate-850">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Logistics status</h4>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">OTD stands at 95.8%</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Failed shipping cases dropped 2% compared to June run rates.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
export default ExecutiveDashboard
