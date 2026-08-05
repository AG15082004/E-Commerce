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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Megaphone,
  TrendingUp,
  ShoppingCart,
  Users,
  Award,
  Layers,
  BookOpen,
} from "lucide-react"

export const MarketingAnalytics: React.FC = () => {
  // Local filter states
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [sourceFilter, setSourceFilter] = useState("All")
  const { data, isLoading, refetch } = useAnalytics(startDate, endDate, {
    campaignSource: sourceFilter,
    device: "All",
    conversionStatus: "All",
    cartAbandoned: "All",
  })

  const SOURCES = ["Affiliate", "Email", "Facebook Ads", "Google Ads", "Instagram Ads", "Organic", "Referral"]

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleExport = () => {
    if (data?.marketing?.campaignsRanking) {
      exportToCSV(data.marketing.campaignsRanking, "campaigns-performance-ranking.csv")
    }
  }

  const COLORS = ["#2563EB", "#10B981", "#D97706", "#C084FC", "#E11D48", "#6EE7B7"]

  return (
    <div className="space-y-6 animation-fade-in">
      <PageHeader
        title="Marketing Analytics & Campaigns ROAS"
        description="Fulfillment marketing audits and campaign performance metrics."
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

          <div className="w-40">
            <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="dark:bg-slate-900">
              <option value="All">All Sources</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>


        </div>
      </Card>

      {/* Main Content */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : !data || !data.marketing ? (
        <EmptyState title="No campaign activities match these criteria" />
      ) : (
        <div className="space-y-6">
          {/* 6 KPI Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Total Campaigns */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Campaigns</CardTitle>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-1.5 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                  <Megaphone size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">{data.marketing.totalCampaigns} Campaigns</div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Active marketing pushes</p>
              </CardContent>
            </Card>

            {/* Revenue Generated */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Revenue Generated</CardTitle>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-1.5 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                  <TrendingUp size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(data.marketing.revenueGenerated)}</div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Gross sales attributed to ads</p>
              </CardContent>
            </Card>

            {/* Orders Generated */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Orders Generated</CardTitle>
                <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-1.5 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/50">
                  <ShoppingCart size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">{data.marketing.ordersGenerated.toLocaleString()} Orders</div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Conversions triggered by ad click events</p>
              </CardContent>
            </Card>

            {/* Customers Acquired */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Customers Acquired</CardTitle>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-1.5 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50">
                  <Users size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">{data.marketing.customersAcquired.toLocaleString()} Users</div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">New accounts attributed to campaigns</p>
              </CardContent>
            </Card>

            {/* Average Campaign Revenue */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Campaign Revenue</CardTitle>
                <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 p-1.5 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800/50">
                  <Award size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(data.marketing.avgCampaignRevenue)}</div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Average yield value per campaign run</p>
              </CardContent>
            </Card>

            {/* Conversion Rate */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/60 border-slate-200/80 dark:border-slate-800/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Conversion Rate</CardTitle>
                <div className="rounded-lg bg-slate-100 dark:bg-slate-850 p-1.5 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-800">
                  <Layers size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100">{data.marketing.conversionRate.toFixed(2)}%</div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Percentage of clicks converting to purchases</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Campaign & Revenue by Source */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Campaign</CardTitle>
                <CardDescription>Generated sales compared across active runs.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.marketing.campaignsRanking} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} interval={0} angle={-15} textAnchor="end" height={45} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 10000000 ? `${(val / 10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val / 100000).toFixed(0)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Bar dataKey="revenue" fill="#38A169" radius={[4, 4, 0, 0]} name="Revenue (₹)" maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Campaign Source</CardTitle>
                <CardDescription>Share of sales driven by ad platform.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.marketing.campaignSalesSplit}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {data.marketing.campaignSalesSplit.map((_: any, index: number) => (
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
          </div>

          {/* Orders by Campaign & ROIs & Campaign Trends */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Orders by Campaign</CardTitle>
                <CardDescription>Attributed checkout quantities.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.marketing.campaignsRanking} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} interval={0} angle={-15} textAnchor="end" height={45} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Bar dataKey="spend" fill="#2563EB" radius={[4, 4, 0, 0]} name="Spend (₹)" maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign ROI Performance Ranking</CardTitle>
                <CardDescription>ROI index rankings.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.marketing.campaignsRanking} layout="vertical" margin={{ top: 10, right: 10, left: 15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(val) => val >= 10000000 ? `${(val / 10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val / 100000).toFixed(0)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} width={80} interval={0} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Bar dataKey="revenue" fill="#D97706" radius={[0, 4, 4, 0]} name="Yield (₹)" maxBarSize={15} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Trend Over Time</CardTitle>
                <CardDescription>Ad click conversions trajectory.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.marketing.dailyTrends} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 10000000 ? `${(val / 10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val / 100000).toFixed(0)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f1f5f9" }} />
                      <Line type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2} dot={false} name="Sales ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Marketing Insights Panel */}
          <Card className="border border-blue-100 dark:border-slate-800 bg-blue-50/20 dark:bg-blue-950/10 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <BookOpen className="text-blue-600 dark:text-blue-400" size={18} />
              <CardTitle className="text-slate-800 dark:text-slate-200 text-sm font-bold">Marketing & ROI Insights</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-2">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100/50 dark:border-slate-855">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Highest Yield Campaign</h4>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Google Search Campaign 3</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Google Search generated the highest absolute profit, yielding 5.2x ROAS.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100/50 dark:border-slate-855">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Best Performing Source</h4>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Google Ads Channels</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Google campaigns represent 36% of all attributed order conversions.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100/50 dark:border-slate-855">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Highest Conversion Rate</h4>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Email Newsletter Drops (4.8% CR)</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Email marketing leads conversion percentages due to target client list matches.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100/50 dark:border-slate-855">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Campaign Discontinuations</h4>
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-450 mt-1">TikTok Campaign 4</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">TikTok runs experienced high CPC and low ROAS (1.1x), and should be paused.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
export default MarketingAnalytics
