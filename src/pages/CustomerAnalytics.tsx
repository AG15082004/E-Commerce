import React, { useState } from "react"
import { useAnalytics } from "../hooks/useAnalytics"
import { PageHeader } from "../components/layout/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { DashboardSkeleton } from "../components/common/LoadingState"
import { EmptyState } from "../components/common/EmptyState"
import { exportToCSV } from "../utils/export"
import { DateRangePicker } from "../components/ui/date-range-picker"
import { Select } from "../components/ui/select"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Users,
  UserPlus,
  RefreshCw,
  Trophy,
  Heart,
  DollarSign,
  TrendingUp,
  Clock,
  BookOpen,
} from "lucide-react"

export const CustomerAnalytics: React.FC = () => {
  // Local filter states
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [segmentFilter, setSegmentFilter] = useState("All")
  const [ltvFilter, setLtvFilter] = useState("All")
  const [churnFilter, setChurnFilter] = useState("All")
  const [lastPurchasePreset, setLastPurchasePreset] = useState("All")
  const [stateFilter, setStateFilter] = useState("All")
  const [cityFilter, setCityFilter] = useState("All")

  let lastPurchaseStart = "All"
  if (lastPurchasePreset !== "All") {
    const d = new Date()
    d.setDate(d.getDate() - Number(lastPurchasePreset))
    lastPurchaseStart = d.toISOString().split("T")[0]
  }

  const { data, isLoading, refetch } = useAnalytics(startDate, endDate, {
    segment: segmentFilter,
    ltvRange: ltvFilter,
    churnFlag: churnFilter,
    lastPurchaseStart: lastPurchaseStart,
    state: stateFilter,
    city: cityFilter,
  })

  const STATES = data?.metadata?.states || []
  const CITIES_BY_STATE = data?.metadata?.citiesByState || {}
  const SEGMENTS = ["New", "Regular", "Premium", "VIP"]
  const LTV_RANGES = ["₹0-₹1K", "₹1K-₹5K", "₹5K-₹10K", "₹10K+"]
  const CHURN_FLAGS = ["Active", "At Risk", "Churned"]

  const availableCities = stateFilter !== "All" ? CITIES_BY_STATE[stateFilter] || [] : []

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Dynamic Customer Insights
  const sortedProfiles = data?.customers?.segmentRevenue 
    ? [...data.customers.segmentRevenue].sort((a, b) => b.value - a.value)
    : [];
  const topProfile = sortedProfiles[0] || { name: "N/A" };

  const cityCountMap: { [city: string]: number } = {};
  data?.customers?.top20Customers?.forEach((c: any) => {
    cityCountMap[c.city] = (cityCountMap[c.city] || 0) + 1;
  });
  const topCity = Object.entries(cityCountMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const sortedLoyalty = data?.customers?.top20Customers
    ? [...data.customers.top20Customers].sort((a, b) => b.loyaltyPoints - a.loyaltyPoints)
    : [];
  const loyalCustomer = sortedLoyalty[0] || { name: "N/A" };

  const handleExport = () => {
    if (data?.customers?.top20Customers) {
      exportToCSV(data.customers.top20Customers, "customer-profiles-export.csv")
    }
  }

  const COLORS = ["#2563EB", "#22C55E", "#C084FC", "#94A3B8"]

  return (
    <div className="space-y-6 animation-fade-in">
      <PageHeader
        title="Customer Lifecycle & Profiles"
        description="Detailed customer behaviors and profile segmentations."
        onExport={handleExport}
        onRefresh={refetch}
        isLoading={isLoading}
      />

      {/* Local Filter Bar Card */}
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
            <Select value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)} className="dark:bg-slate-900">
              <option value="All">All Segments</option>
              {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>

          <div className="w-36">
            <Select value={ltvFilter} onChange={(e) => setLtvFilter(e.target.value)} className="dark:bg-slate-900">
              <option value="All">All LTV Ranges</option>
              {LTV_RANGES.map(l => <option key={l} value={l}>{l}</option>)}
            </Select>
          </div>

          <div className="w-32">
            <Select value={churnFilter} onChange={(e) => setChurnFilter(e.target.value)} className="dark:bg-slate-900">
              <option value="All">All Churn Flags</option>
              {CHURN_FLAGS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>

          <div className="w-40">
            <Select value={lastPurchasePreset} onChange={(e) => setLastPurchasePreset(e.target.value)} className="dark:bg-slate-900">
              <option value="All">All Last Purchase Dates</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 180 Days</option>
            </Select>
          </div>

          <div className="w-32">
            <Select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value)
                setCityFilter("All")
              }}
              className="dark:bg-slate-900"
            >
              <option value="All">All States</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>

          <div className="w-32">
            <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} disabled={stateFilter === "All"} className="dark:bg-slate-900">
              <option value="All">All Cities</option>
              {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : !data || !data.customers ? (
        <EmptyState title="No customer metrics match these filters" />
      ) : (
        <div className="space-y-6">
          {/* 8 KPI Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Customers */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Customers</CardTitle>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-1.5 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                  <Users size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {data.customers.totalCustomers.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Total registered profiles</p>
              </CardContent>
            </Card>

            {/* New Customers */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">New Customers</CardTitle>
                <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-1.5 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/50">
                  <UserPlus size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {data.customers.newCustomers.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Registered within 30 days</p>
              </CardContent>
            </Card>

            {/* Repeat Customers */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Repeat Customers</CardTitle>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-1.5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                  <RefreshCw size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {data.customers.repeatCustomers.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Customers with &gt;2 orders</p>
              </CardContent>
            </Card>

            {/* Average Tenure */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Customer Tenure</CardTitle>
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-1.5 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                  <Clock size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {data.customers.avgTenure} Months
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Average account lifetime duration</p>
              </CardContent>
            </Card>

            {/* Total Loyalty Points */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Loyalty Points</CardTitle>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-1.5 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50">
                  <Trophy size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {data.customers.totalLoyaltyPoints.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Accumulated loyalty catalog points</p>
              </CardContent>
            </Card>

            {/* Average CSAT */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Customer CSAT</CardTitle>
                <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 p-1.5 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50">
                  <Heart size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {data.customers.avgSatisfaction} / 5.0
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Average customer review rating</p>
              </CardContent>
            </Card>

            {/* Average Revenue Per Customer */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Revenue per Customer</CardTitle>
                <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 p-1.5 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800/50">
                  <DollarSign size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {formatCurrency(data.customers.avgRevenuePerCustomer)}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Total revenue divided by customers count</p>
              </CardContent>
            </Card>

            {/* Repeat Purchase Rate */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Repeat Purchase Rate</CardTitle>
                <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-700">
                  <TrendingUp size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {data.customers.repeatPurchaseRate}%
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Percentage of repeat users</p>
              </CardContent>
            </Card>
          </div>

          {/* Customer Profile & Segment Revenue */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Profile Distribution</CardTitle>
                <CardDescription>Breakdown by VIP, Regular, and Corporate accounts.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.customers.customerProfileDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {data.customers.customerProfileDistribution.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Customer Segment</CardTitle>
                <CardDescription>Sales contributions by customer profiles.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.customers.segmentRevenue} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 10000000 ? `${(val / 10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val / 100000).toFixed(0)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Bar dataKey="value" fill="#38A169" radius={[4, 4, 0, 0]} name="Revenue (₹)" maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Tenure & Loyalty Distribution & Stacked Activities */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Customer Tenure Distribution</CardTitle>
                <CardDescription>Histogram of customer account ages.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.customers.tenureDistribution} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="range" stroke="#94a3b8" fontSize={9} tickLine={false} interval={0} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} name="Customers" maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Loyalty Points Distribution</CardTitle>
                <CardDescription>Customer metrics by loyalty tiers.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.customers.loyaltyDistribution} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="range" stroke="#94a3b8" fontSize={9} tickLine={false} interval={0} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Bar dataKey="count" fill="#D97706" radius={[4, 4, 0, 0]} name="Customers" maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Activity Level</CardTitle>
                <CardDescription>Activity stacks comparing engagement frequency.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.customers.customerActivity} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="High" stackId="a" fill="#22C55E" name="High Eng." />
                      <Bar dataKey="Medium" stackId="a" fill="#2563EB" name="Medium Eng." />
                      <Bar dataKey="Low" stackId="a" fill="#94A3B8" name="Low Eng." />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top 20 Customer Database */}
          <Card>
            <CardHeader>
              <CardTitle>Top 20 Value Customer Database</CardTitle>
              <CardDescription>Individual spend rankings, loyalty points, and location splits.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Account Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Loyalty Points</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead className="text-center">Account Profile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.customers.top20Customers.map((c: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-205">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-400 dark:text-slate-500">{c.email}</TableCell>
                      <TableCell>{c.city}, {c.state}</TableCell>
                      <TableCell className="text-right font-medium">{c.orders}</TableCell>
                      <TableCell className="text-right text-amber-600 dark:text-amber-500 font-bold">{c.loyaltyPoints.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-black text-blue-600 dark:text-blue-400">{formatCurrency(c.spent)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${
                          c.profile === "VIP" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400" : c.profile === "Corporate" ? "bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-400" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400"
                        }`}>
                          {c.profile}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Customer Insights Panel */}
          <Card className="border border-blue-100 dark:border-slate-800 bg-blue-50/20 dark:bg-blue-950/10 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <BookOpen className="text-blue-600 dark:text-blue-400" size={18} />
              <CardTitle className="text-slate-800 dark:text-slate-200 text-sm font-bold">Customer Lifecycle Insights</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-2">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100/50 dark:border-slate-855">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Top Spender Profile</h4>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{topProfile.name} Segment</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{topProfile.name} accounts generate the highest margins and ticket sizes.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100/50 dark:border-slate-855">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">VIP Cities Density</h4>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{topCity}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">This urban area leads active VIP count clusters.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100/50 dark:border-slate-855">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">High Loyalty Customer</h4>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">{loyalCustomer.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Account holds highest accumulated points value.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100/50 dark:border-slate-850">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Repeat Customer Ratio</h4>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-450 mt-1">{data.customers.repeatPurchaseRate}% Repeat Purchase</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Strong catalog repeat rates reflect excellent client retention.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
export default CustomerAnalytics
