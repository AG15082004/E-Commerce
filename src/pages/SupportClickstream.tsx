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
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  LifeBuoy,
  Clock,
  Heart,
  Globe,
  ArrowRightLeft,
  BookOpen,
} from "lucide-react"

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--chart-tooltip-bg)",
  borderColor: "var(--chart-tooltip-border)",
  borderRadius: "4px",
  color: "var(--chart-tooltip-text)",
  fontSize: "11px",
}

// Custom label renderer for showing percentages
const renderCustomPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 14
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="var(--chart-text)"
      fontSize={9}
      fontWeight={600}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export const SupportClickstream: React.FC = () => {
  // Local filter states
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [channelFilter, setChannelFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [resolutionFilter, setResolutionFilter] = useState("All")

  const { data, isLoading, refetch } = useAnalytics(startDate, endDate, {
    channel: channelFilter,
    status: statusFilter,
    resolutionTime: resolutionFilter,
  })

  const CHANNELS = ["Email", "Live Chat", "Phone", "Social Media"]
  const STATUSES = ["Open", "In Progress", "Resolved", "Closed"]
  const RESOLUTION_TIMES = ["<1 Hour", "1-4 Hours", "4-24 Hours", "24 Hours+"]

  const handleExport = () => {
    if (data?.supportClickstream?.topPagesVisited) {
      exportToCSV(data.supportClickstream.topPagesVisited, "top-pages-visited-analytics.csv")
    }
  }

  // Dynamic Support & Website Clickstream Insights
  const sortedChannels = data?.supportClickstream?.ticketsByChannel
    ? [...data.supportClickstream.ticketsByChannel].sort((a, b) => b.value - a.value)
    : [];
  const topChannel = sortedChannels[0] || { name: "N/A", value: 0 };
  const topChannelPercent = data?.supportClickstream?.totalTickets 
    ? ((topChannel.value / data.supportClickstream.totalTickets) * 100).toFixed(0) 
    : "0";

  const topPageVal = data?.supportClickstream?.topPagesVisited?.[0] || { name: "N/A", count: 0 };

  const COLORS = ["#0078D4", "#00A4EF", "#87A9FF", "#C7E0F4", "#50E6FF", "#005A9E"]

  return (
    <div className="space-y-6 animation-fade-in">
      <PageHeader
        title="Support Desk & Site Clickstream"
        description="Fulfillment support logs and client session telemetry."
        onExport={handleExport}
        onRefresh={refetch}
        isLoading={isLoading}
      />

      {/* Local Filter Bar Card */}
      <Card className="p-4 bg-white border border-[#E1DFDD] shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start)
              setEndDate(end)
            }}
          />

          <div className="w-36">
            <Select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
              <option value="All">All Channels</option>
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>

          <div className="w-36">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>

          <div className="w-40">
            <Select value={resolutionFilter} onChange={(e) => setResolutionFilter(e.target.value)}>
              <option value="All">All Resolution Times</option>
              {RESOLUTION_TIMES.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : !data || !data.supportClickstream ? (
        <EmptyState title="No support desk or web logs match these filters" />
      ) : (
        <div className="space-y-6">
          {/* 5 KPI Cards Grid (balanced cols) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Total Support Tickets */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider">Total Tickets</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <LifeBuoy size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-[#242424] dark:text-[#F3F2F1]">{data.supportClickstream.totalTickets} Tickets</div>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-1 font-semibold">Active cases</p>
              </CardContent>
            </Card>

            {/* Average Resolution Time */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider">Avg Resolution</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <Clock size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-[#242424] dark:text-[#F3F2F1]">{data.supportClickstream.avgResolutionTime.toFixed(1)} Hours</div>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-1 font-semibold">Mean ticket time</p>
              </CardContent>
            </Card>

            {/* Average Satisfaction Score */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider">Avg CSAT Score</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <Heart size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-[#242424] dark:text-[#F3F2F1]">{data.supportClickstream.avgSatisfaction.toFixed(1)} / 5.0</div>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-1 font-semibold">Post-resolution client review</p>
              </CardContent>
            </Card>

            {/* Total Website Sessions */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider">Web Sessions</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <Globe size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-[#242424] dark:text-[#F3F2F1]">{data.supportClickstream.totalSessions.toLocaleString()} Visits</div>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-1 font-semibold">Clickstream visits</p>
              </CardContent>
            </Card>

            {/* Cart Abandonment Rate */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider">Cart Abandonment</CardTitle>
                <div className="rounded bg-[#FCDCDC] p-1.5 text-[#A80000] border border-[#F1C5C5]">
                  <ArrowRightLeft size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-[#A80000]">{data.supportClickstream.cartAbandonmentRate.toFixed(1)}%</div>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-1 font-semibold">Drops before checkout</p>
              </CardContent>
            </Card>
          </div>

          {/* Funnel & Event Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Website Behavior Funnel</CardTitle>
                <CardDescription>Drop-off rates from landing views to checkout purchases.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.supportClickstream.websiteBehaviorFunnel} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                      <XAxis type="number" stroke="var(--chart-text)" fontSize={9} tickLine={false} />
                      <YAxis type="category" dataKey="stage" stroke="var(--chart-text)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="count" fill="#0078D4" radius={[0, 4, 4, 0]} name="Sessions count" maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Website Event Distribution</CardTitle>
                <CardDescription>Event types tracked in web sessions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.supportClickstream.eventDistribution} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" height={45} />
                      <YAxis stroke="var(--chart-text)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="count" fill="#00A4EF" radius={[4, 4, 0, 0]} name="Events count" maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Channels & Ticket Status */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Support Tickets by Channel</CardTitle>
                <CardDescription>Breakdown by Email, Live Chat, Phone, and Social.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.supportClickstream.ticketsByChannel}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        label={renderCustomPieLabel}
                        labelLine={false}
                      >
                        {data.supportClickstream.ticketsByChannel.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ticket Status Distribution</CardTitle>
                <CardDescription>Support desk queue status counts.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.supportClickstream.ticketStatusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        label={renderCustomPieLabel}
                        labelLine={false}
                      >
                        {data.supportClickstream.ticketStatusDistribution.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Satisfaction & Browsers & Top Pages (Device Share Deleted, cols updated to md:grid-cols-3) */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Satisfaction Scores</CardTitle>
                <CardDescription>CSAT score timelines.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.supportClickstream.satisfactionDistribution} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="score" stroke="var(--chart-text)" fontSize={9} tickLine={false} interval={0} />
                      <YAxis stroke="var(--chart-text)" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="count" fill="#A05A00" radius={[4, 4, 0, 0]} name="Tickets" maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browser Share</CardTitle>
                <CardDescription>Nav sessions.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.supportClickstream.browserUsage}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                        label={renderCustomPieLabel}
                        labelLine={false}
                      >
                        {data.supportClickstream.browserUsage.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
                <CardDescription>Page traffic rankings.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.supportClickstream.topPagesVisited.slice(0, 4)} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
                      <XAxis type="number" stroke="var(--chart-text)" fontSize={9} tickLine={false} />
                      <YAxis type="category" dataKey="name" stroke="var(--chart-text)" fontSize={8} tickLine={false} axisLine={false} width={80} interval={0} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="count" fill="#87A9FF" radius={[0, 4, 4, 0]} name="Hits" maxBarSize={15} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Website & Support Insights Panel (Device insights deleted) */}
          <Card className="border border-[#E1DFDD] dark:border-[#3B3A39] bg-white dark:bg-[#252423] shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <BookOpen className="text-[#0078D4]" size={18} />
              <CardTitle className="text-[#242424] dark:text-[#F3F2F1] text-sm font-bold">Support & Website Insights</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3 pt-2">
              <div className="p-3 bg-[#FAF9F8] dark:bg-[#2D2C2B] rounded border border-[#E1DFDD] dark:border-[#3B3A39]">
                <h4 className="text-xs font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase">Top Support Channel</h4>
                <p className="text-xs font-semibold text-[#242424] dark:text-[#F3F2F1] mt-1">{topChannel.name} ({topChannelPercent}% Tickets)</p>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-0.5">Most popular service channel, requiring active agent staffing.</p>
              </div>
              <div className="p-3 bg-[#FAF9F8] dark:bg-[#2D2C2B] rounded border border-[#E1DFDD] dark:border-[#3B3A39]">
                <h4 className="text-xs font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase">Cart Abandonment Node</h4>
                <p className="text-xs font-semibold text-red-650 mt-1">Checkout Init Drops</p>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-0.5">Cart drop-offs peak during Checkout Init; check shipping fees calculations.</p>
              </div>
              <div className="p-3 bg-[#FAF9F8] dark:bg-[#2D2C2B] rounded border border-[#E1DFDD] dark:border-[#3B3A39]">
                <h4 className="text-xs font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase">Top Visited Page</h4>
                <p className="text-xs font-semibold text-[#242424] dark:text-[#F3F2F1] mt-1">{topPageVal.name}</p>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-0.5">The primary landing screen path capturing the most unique traffic visits.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
export default SupportClickstream
