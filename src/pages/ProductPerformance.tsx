import React, { useState, useEffect } from "react"
import { useAnalytics } from "../hooks/useAnalytics"
import { PageHeader } from "../components/layout/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { DashboardSkeleton } from "../components/common/LoadingState"
import { EmptyState } from "../components/common/EmptyState"
import { exportToCSV } from "../utils/export"
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
  ResponsiveContainer,
} from "recharts"
import {
  Box,
  TrendingUp,
  Award,
  Star,
  DollarSign,
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

export const ProductPerformance: React.FC = () => {
  // Local filter states
  const [analysisPeriod, setAnalysisPeriod] = useState<string>("30")
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [subcategoryFilter, setSubcategoryFilter] = useState("All")
  const [brandFilter, setBrandFilter] = useState("All")
  const [ratingRangeFilter, setRatingRangeFilter] = useState("All")
  const [returnRateFilter, setReturnRateFilter] = useState("All")

  // Synchronize startDate when analysisPeriod changes
  useEffect(() => {
    if (analysisPeriod !== "All") {
      const d = new Date()
      d.setDate(d.getDate() - Number(analysisPeriod))
      setStartDate(d.toISOString().split("T")[0])
      setEndDate(new Date().toISOString().split("T")[0])
    } else {
      setStartDate("All")
      setEndDate("All")
    }
  }, [analysisPeriod])

  const { data, isLoading, refetch } = useAnalytics(startDate, endDate, {
    category: categoryFilter,
    subcategory: subcategoryFilter,
    brand: brandFilter,
    ratingRange: ratingRangeFilter,
    returnRateRange: returnRateFilter,
  })

  const CATEGORIES = data?.metadata?.categories || []
  const SUBCATEGORIES = data?.metadata?.subcategories || []
  const BRANDS = data?.metadata?.brands || []
  const RATING_RANGES = ["5★", "4-5★", "3-4★", "2-3★", "1-2★"]
  const RETURN_RATE_RANGES = ["0%", "0-5%", "5-10%", "10-20%", "20%+"]

  const CASCADING_SUBCATS: { [cat: string]: string[] } = {
    Accessories: ["Accessories", "Gear"],
    Appliances: ["Furniture", "Appliances"],
    Electronics: ["Accessories", "Gear"],
    Fashion: ["Apparel", "Skincare"]
  }
  const subcategoryOptions = categoryFilter !== "All"
    ? CASCADING_SUBCATS[categoryFilter] || SUBCATEGORIES
    : SUBCATEGORIES;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleExport = () => {
    if (data?.products?.topProductsRevenue) {
      exportToCSV(data.products.topProductsRevenue, "product-performance-revenue.csv")
    }
  }

  const COLORS = ["#0078D4", "#00A4EF", "#87A9FF", "#C7E0F4", "#50E6FF", "#005A9E"]

  const CHART_TOOLTIP_STYLE = {
    backgroundColor: "var(--chart-tooltip-bg)",
    borderColor: "var(--chart-tooltip-border)",
    borderRadius: "4px",
    color: "var(--chart-tooltip-text)",
    fontSize: "11px",
  }

  return (
    <div className="space-y-6 animation-fade-in">
      <PageHeader
        title="Product Performance & Inventory Catalog"
        description="Fulfillment catalog audits and inventory performance indicators."
        onExport={handleExport}
        onRefresh={refetch}
        isLoading={isLoading}
      />

      {/* Local Filter Bar Card */}
      <Card className="p-4 bg-white border border-[#E1DFDD] shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40">
            <Select value={analysisPeriod} onChange={(e) => setAnalysisPeriod(e.target.value)}>
              <option value="All">All Time Period</option>
              <option value="30">Last 30 Days</option>
              <option value="60">Last 60 Days</option>
              <option value="90">Last 90 Days</option>
            </Select>
          </div>

          <div className="w-36">
            <Select value={categoryFilter} onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSubcategoryFilter("All");
            }}>
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>

          <div className="w-36">
            <Select value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)}>
              <option value="All">All Subcategories</option>
              {subcategoryOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>

          <div className="w-32">
            <Select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
              <option value="All">All Brands</option>
              {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </Select>
          </div>

          <div className="w-32">
            <Select value={ratingRangeFilter} onChange={(e) => setRatingRangeFilter(e.target.value)}>
              <option value="All">All Ratings</option>
              {RATING_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>

          <div className="w-36">
            <Select value={returnRateFilter} onChange={(e) => setReturnRateFilter(e.target.value)}>
              <option value="All">All Return Rates</option>
              {RETURN_RATE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : !data || !data.products ? (
        <EmptyState title="No products matches these filter rules" />
      ) : (
        <div className="space-y-6">
          {/* 5 KPI Cards Grid (balanced cols) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Total Products */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider">Total Products</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <Box size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-[#242424] dark:text-[#F3F2F1]">{data.products.totalProducts} SKUs</div>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-1 font-semibold">Active catalog index</p>
              </CardContent>
            </Card>

            {/* Best Selling Product */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider">Best Seller</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <Award size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs font-bold text-[#242424] dark:text-[#F3F2F1] truncate" title={data.products.bestSellingProduct}>
                  {data.products.bestSellingProduct}
                </div>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-1 font-semibold">Highest checkout sales</p>
              </CardContent>
            </Card>

            {/* Highest Profit Product */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider">Highest Margin</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <TrendingUp size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs font-bold text-[#242424] dark:text-[#F3F2F1] truncate" title={data.products.highestProfitProduct}>
                  {data.products.highestProfitProduct}
                </div>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-1 font-semibold">Highest net margin item</p>
              </CardContent>
            </Card>

            {/* Average Product Rating */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider">Avg Catalog Rating</CardTitle>
                <div className="rounded bg-[#FEF3C7] p-1.5 text-[#A05A00] border border-[#FFE29A]">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-[#A05A00]">{data.products.avgRating} / 5.0</div>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-1 font-semibold">Mean review score</p>
              </CardContent>
            </Card>

            {/* Total Revenue */}
            <Card className="bg-white border-[#E1DFDD]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase tracking-wider">Total Revenue</CardTitle>
                <div className="rounded bg-[#E1F5FE] p-1.5 text-[#0078D4] border border-[#B3E5FC]">
                  <DollarSign size={14} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-[#242424] dark:text-[#F3F2F1]">{formatCurrency(data.products.totalRevenue)}</div>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-1 font-semibold">Catalog aggregated revenue</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Products Revenue & Profit */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Products by Revenue</CardTitle>
                <CardDescription>Items driving the highest absolute sales.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.products.topProductsRevenue} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={9} tickLine={false} interval={0} angle={-15} textAnchor="end" height={45} />
                      <YAxis stroke="var(--chart-text)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 10000000 ? `${(val / 10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val / 100000).toFixed(0)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="value" fill="#0078D4" radius={[4, 4, 0, 0]} name="Sales (₹)" maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products by Profit</CardTitle>
                <CardDescription>Items driving the highest gross margins.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.products.topProductsProfit} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={9} tickLine={false} interval={0} angle={-15} textAnchor="end" height={45} />
                      <YAxis stroke="var(--chart-text)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 10000000 ? `${(val / 10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val / 100000).toFixed(0)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="value" fill="#00A4EF" radius={[4, 4, 0, 0]} name="Profit (₹)" maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ratings, Categories, Brands & Return Rates (Restored and laid out in responsive columns) */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Ratings Dist.</CardTitle>
                <CardDescription>Star reviews frequency.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.products.ratingDistribution} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="rating" stroke="var(--chart-text)" fontSize={9} tickLine={false} interval={0} />
                      <YAxis stroke="var(--chart-text)" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="count" fill="#A05A00" radius={[4, 4, 0, 0]} name="SKUs count" maxBarSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Category</CardTitle>
                <CardDescription>Fulfillment splits.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.products.revenueByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                        label={renderCustomPieLabel}
                        labelLine={false}
                      >
                        {data.products.revenueByCategory.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Brand Sales</CardTitle>
                <CardDescription>Units sold by brand.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.products.brandSales.slice(0, 4)} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={9} tickLine={false} interval={0} />
                      <YAxis stroke="var(--chart-text)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="value" fill="#87A9FF" radius={[4, 4, 0, 0]} name="Units Sold" maxBarSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Return Rates</CardTitle>
                <CardDescription>Highest return percentage rate.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={
                        data.products.returnRateByProduct
                          ? [...data.products.returnRateByProduct].sort((a, b) => b.rate - a.rate)
                          : []
                      }
                      margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={8} tickLine={false} interval={0} angle={-15} textAnchor="end" height={35} />
                      <YAxis stroke="var(--chart-text)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="rate" fill="#E81123" radius={[4, 4, 0, 0]} name="Return Rate (%)" maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Insights Panel */}
          <Card className="border border-[#E1DFDD] dark:border-[#3B3A39] bg-white dark:bg-[#252423] shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <BookOpen className="text-[#0078D4]" size={18} />
              <CardTitle className="text-[#242424] dark:text-[#F3F2F1] text-sm font-bold">Product Catalog Insights</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-2">
              <div className="p-3 bg-[#FAF9F8] dark:bg-[#2D2C2B] rounded border border-[#E1DFDD] dark:border-[#3B3A39]">
                <h4 className="text-xs font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase">Promo Recommendations</h4>
                <p className="text-xs font-semibold text-[#242424] dark:text-[#F3F2F1] mt-1">Resistance Bands Set</p>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-0.5">High rating items with low unit revenues should be promoted with discounts.</p>
              </div>
              <div className="p-3 bg-[#FAF9F8] dark:bg-[#2D2C2B] rounded border border-[#E1DFDD] dark:border-[#3B3A39]">
                <h4 className="text-xs font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase">Shortage / Return Risks</h4>
                <p className="text-xs font-semibold text-rose-600 mt-1">Premium Running Shoes</p>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-0.5">Fashion items show high returns (3.8%) due to size fitting issues.</p>
              </div>
              <div className="p-3 bg-[#FAF9F8] dark:bg-[#2D2C2B] rounded border border-[#E1DFDD] dark:border-[#3B3A39]">
                <h4 className="text-xs font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase">Low Rated Slabs</h4>
                <p className="text-xs font-semibold text-[#242424] dark:text-[#F3F2F1] mt-1">Noise Cancelling Earbuds</p>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-0.5">Earbuds averaged 4.1 ratings due to battery lifetime feedback reports.</p>
              </div>
              <div className="p-3 bg-[#FAF9F8] dark:bg-[#2D2C2B] rounded border border-[#E1DFDD] dark:border-[#3B3A39]">
                <h4 className="text-xs font-bold text-[#605E5C] dark:text-[#A19F9D] uppercase">High Profit Manufacturers</h4>
                <p className="text-xs font-semibold text-emerald-600 mt-1">Apple and Dell Hardware</p>
                <p className="text-[10px] text-[#605E5C] dark:text-[#A19F9D] mt-0.5">Electronics hardware margins generate the highest absolute profits.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
export default ProductPerformance
