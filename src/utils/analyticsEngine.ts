export interface Product {
  id: string
  name: string
  sku: string
  category: string
  subcategory: string
  brand: string
  price: number
  cost: number
  stock: number
  sales: number
  returns: number
  rating: number
  profitCategory: string
  reviewCategory: string
}

export interface Customer {
  id: string
  name: string
  email: string
  state: string
  city: string
  joinedDate: string
  totalSpent: number
  ordersCount: number
  lastPurchaseDate: string
  loyaltyPoints: number
  satisfactionScore: number
  tenureMonths: number
  ageGroup: string
  gender: string
  segment: string
  profile: string
  revenueCategory: string
  activityLevel: string
  churnFlag: string
}

export interface Order {
  id: string
  customerId: string
  customerName: string
  date: string
  revenue: number
  cost: number
  profit: number
  itemsCount: number
  status: string
  carrier: string
  transitDays: number
  shippingCost: number
  paymentMethod: string
  channel: string
  state: string
  city: string
  category: string
  brand: string
  warehouse: string
  profile: string
  revenueCategory: string
  discount: number
  tax: number
  quantity: number
  sku: string
  ordersCount?: number
}

export interface Campaign {
  id: string
  name: string
  channel: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  date: string
  state: string
}

export interface Ticket {
  id: string
  customerName: string
  issue: string
  channel: string
  priority: string
  status: string
  date: string
  resolutionTimeHrs: number
  satisfactionScore: number
  state: string
  city: string
}

export interface Session {
  id: string
  timestamp: string
  pageName: string
  action: string
  device: string
  browser: string
  duration: number
  bounce: boolean
  state: string
}

// In-Memory Database Cache (Live Data Only)
export let rawProducts: Product[] = [];
export let rawCustomers: Customer[] = [];
export let rawOrders: Order[] = [];
export let rawCampaigns: Campaign[] = [];
export let rawTickets: Ticket[] = [];
export let rawSessions: Session[] = [];
export let rawDeliverySummary: any[] = [];
export let rawClickstreamSummary: any[] = [];

export function updateAnalyticsCache(data: {
  orders?: any[];
  customers?: any[];
  products?: any[];
  campaigns?: any[];
  tickets?: any[];
  sessions?: any[];
  deliverySummary?: any[];
  clickstreamSummary?: any[];
}) {
  if (data.orders) rawOrders = data.orders;
  if (data.customers) rawCustomers = data.customers;
  if (data.products) rawProducts = data.products;
  if (data.campaigns) rawCampaigns = data.campaigns;
  if (data.tickets) rawTickets = data.tickets;
  if (data.sessions) rawSessions = data.sessions;
  if (data.deliverySummary) rawDeliverySummary = data.deliverySummary;
  if (data.clickstreamSummary) rawClickstreamSummary = data.clickstreamSummary;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getAnalyticsData(startDateStr: string, endDateStr: string, filters: any = {}) {
  const isAllTime = startDateStr === "All" || endDateStr === "All";
  const start = isAllTime ? new Date(0) : new Date(startDateStr);
  const end = isAllTime ? new Date(32503680000000) : new Date(endDateStr);
  if (!isAllTime) {
    end.setHours(23, 59, 59, 999);
  }

  // Dynamic state/category discovery based on active values
  const uniqueStates = Array.from(new Set(rawOrders.map(o => o.state).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(rawOrders.map(o => o.category).filter(Boolean)));
  const uniqueBrands = Array.from(new Set(rawOrders.map(o => o.brand).filter(Boolean)));
  const uniqueSubcategories = Array.from(new Set(rawProducts.map(p => p.subcategory).filter(Boolean)));
  const uniqueWarehouses = Array.from(new Set(rawOrders.map(o => o.warehouse).filter(Boolean)));
  const uniqueMarketingChannels = Array.from(new Set(rawCampaigns.map(c => c.channel).filter(Boolean)));
  const uniqueSupportChannels = Array.from(new Set(rawTickets.map(t => t.channel).filter(Boolean)));
  const uniqueDevices = Array.from(new Set(rawSessions.map(s => s.device).filter(Boolean)));
  const uniqueBrowsers = Array.from(new Set(rawSessions.map(s => s.browser).filter(Boolean)));
  const uniquePaymentMethods = Array.from(new Set(rawOrders.map(o => o.paymentMethod).filter(Boolean)));
  const uniqueOrderStatuses = Array.from(new Set(rawOrders.map(o => o.status).filter(Boolean)));

  const citiesByState: { [state: string]: string[] } = {};
  rawOrders.forEach(o => {
    if (o.state && o.city) {
      if (!citiesByState[o.state]) citiesByState[o.state] = [];
      if (!citiesByState[o.state].includes(o.city)) citiesByState[o.state].push(o.city);
    }
  });

  const STATES = uniqueStates.length > 0 ? uniqueStates : ["Karnataka", "Tamil Nadu", "Maharashtra", "Delhi", "West Bengal", "Telangana", "Gujarat", "Uttar Pradesh"];
  const CATEGORIES = uniqueCategories.length > 0 ? uniqueCategories : ["Accessories", "Appliances", "Electronics", "Fashion"];
  const BRANDS = uniqueBrands.length > 0 ? uniqueBrands : ["Adidas", "Apple", "Bose", "Dell", "Fastrack", "HP", "Levis", "Nike", "Puma", "Samsung", "Sony", "Titan", "Whirlpool"];

  // Apply filters on collections
  let orders = rawOrders.filter(o => {
    const d = new Date(o.date);
    return d >= start && d <= end;
  });

  let customers = [...rawCustomers];
  let products = [...rawProducts];
  let campaigns = rawCampaigns.filter(c => {
    const d = new Date(c.date);
    return d >= start && d <= end;
  });
  let tickets = rawTickets.filter(t => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });
  let sessions = rawSessions.filter(s => {
    const d = new Date(s.timestamp);
    return d >= start && d <= end;
  });

  // Apply Global Filters
  if (filters) {
    if (filters.state && filters.state !== "All") {
      orders = orders.filter(o => o.state === filters.state);
      customers = customers.filter(c => c.state === filters.state);
      tickets = tickets.filter(t => t.state === filters.state);
      sessions = sessions.filter(s => s.state === filters.state);
      campaigns = campaigns.filter(c => c.state === filters.state);
    }
    if (filters.city && filters.city !== "All") {
      orders = orders.filter(o => o.city === filters.city);
      customers = customers.filter(c => c.city === filters.city);
      tickets = tickets.filter(t => t.city === filters.city);
    }
    if (filters.category && filters.category !== "All") {
      orders = orders.filter(o => o.category === filters.category);
      products = products.filter(p => p.category === filters.category);
    }
    if (filters.brand && filters.brand !== "All") {
      orders = orders.filter(o => o.brand === filters.brand);
      products = products.filter(p => p.brand === filters.brand);
    }
    if (filters.profile && filters.profile !== "All") {
      orders = orders.filter(o => o.profile === filters.profile);
      customers = customers.filter(c => c.profile === filters.profile);
    }
    if (filters.revenueCategory && filters.revenueCategory !== "All") {
      orders = orders.filter(o => o.revenueCategory === filters.revenueCategory);
      customers = customers.filter(c => c.revenueCategory === filters.revenueCategory);
    }

    // Customer specific filters
    if (filters.ageGroup && filters.ageGroup !== "All") {
      customers = customers.filter(c => c.ageGroup === filters.ageGroup);
    }
    if (filters.gender && filters.gender !== "All") {
      customers = customers.filter(c => c.gender === filters.gender);
    }
    if (filters.activityLevel && filters.activityLevel !== "All") {
      customers = customers.filter(c => c.activityLevel === filters.activityLevel);
    }
    if (filters.segment && filters.segment !== "All") {
      customers = customers.filter(c => {
        if (filters.segment === "New") return c.segment === "New Customers";
        if (filters.segment === "VIP") return c.segment === "VIP";
        if (filters.segment === "Premium") return c.segment === "Loyal Customers";
        if (filters.segment === "Regular") return c.segment === "Regular";
        return c.segment === filters.segment || c.profile === filters.segment;
      });
    }
    if (filters.ltvRange && filters.ltvRange !== "All") {
      customers = customers.filter(c => {
        const ltv = c.totalSpent;
        if (filters.ltvRange === "₹0-₹1K") return ltv >= 0 && ltv <= 1000;
        if (filters.ltvRange === "₹1K-₹5K") return ltv > 1000 && ltv <= 5000;
        if (filters.ltvRange === "₹5K-₹10K") return ltv > 5000 && ltv <= 10000;
        if (filters.ltvRange === "₹10K+") return ltv > 10000;
        return true;
      });
    }
    if (filters.churnFlag && filters.churnFlag !== "All") {
      customers = customers.filter(c => c.churnFlag === filters.churnFlag);
    }
    if (filters.lastPurchaseStart && filters.lastPurchaseStart !== "All") {
      customers = customers.filter(c => c.lastPurchaseDate >= filters.lastPurchaseStart!);
    }
    if (filters.lastPurchaseEnd && filters.lastPurchaseEnd !== "All") {
      customers = customers.filter(c => c.lastPurchaseDate <= filters.lastPurchaseEnd!);
    }

    if (
      (filters.ageGroup && filters.ageGroup !== "All") ||
      (filters.gender && filters.gender !== "All") ||
      (filters.activityLevel && filters.activityLevel !== "All") ||
      (filters.segment && filters.segment !== "All") ||
      (filters.ltvRange && filters.ltvRange !== "All") ||
      (filters.churnFlag && filters.churnFlag !== "All") ||
      (filters.lastPurchaseStart && filters.lastPurchaseStart !== "All") ||
      (filters.lastPurchaseEnd && filters.lastPurchaseEnd !== "All")
    ) {
      const customerIds = new Set(customers.map(c => c.id));
      orders = orders.filter(o => customerIds.has(o.customerId));
    }

    // Sales/Delivery specific filters
    if (filters.warehouse && filters.warehouse !== "All") {
      orders = orders.filter(o => o.warehouse === filters.warehouse);
    }
    if (filters.status && filters.status !== "All") {
      orders = orders.filter(o => o.status === filters.status);
    }
    if (filters.paymentMethod && filters.paymentMethod !== "All") {
      orders = orders.filter(o => o.paymentMethod === filters.paymentMethod);
    }

    // Product specific filters
    if (filters.subcategory && filters.subcategory !== "All") {
      products = products.filter(p => p.subcategory === filters.subcategory);
    }
    if (filters.rating && filters.rating !== "All") {
      products = filters.rating === "4.5+" ? products.filter(p => p.rating >= 4.5)
               : filters.rating === "4.0+" ? products.filter(p => p.rating >= 4.0)
               : filters.rating === "3.5+" ? products.filter(p => p.rating >= 3.5)
               : filters.rating === "Under 3.5" ? products.filter(p => p.rating < 3.5)
               : products;
    }
    if (filters.ratingRange && filters.ratingRange !== "All") {
      products = products.filter(p => {
        const r = p.rating;
        if (filters.ratingRange === "5★") return r === 5;
        if (filters.ratingRange === "4-5★") return r >= 4 && r < 5;
        if (filters.ratingRange === "3-4★") return r >= 3 && r < 4;
        if (filters.ratingRange === "2-3★") return r >= 2 && r < 3;
        if (filters.ratingRange === "1-2★") return r >= 1 && r < 2;
        return true;
      });
    }
    if (filters.returnRateRange && filters.returnRateRange !== "All") {
      products = products.filter(p => {
        const rate = p.sales > 0 ? (p.returns / p.sales) * 100 : 0;
        if (filters.returnRateRange === "0%") return rate === 0;
        if (filters.returnRateRange === "0-5%") return rate > 0 && rate <= 5;
        if (filters.returnRateRange === "5-10%") return rate > 5 && rate <= 10;
        if (filters.returnRateRange === "10-20%") return rate > 10 && rate <= 20;
        if (filters.returnRateRange === "20%+") return rate > 20;
        return true;
      });
    }
    if (filters.profitCategory && filters.profitCategory !== "All") {
      products = products.filter(p => p.profitCategory === filters.profitCategory);
    }
    if (
      (filters.subcategory && filters.subcategory !== "All") ||
      (filters.rating && filters.rating !== "All") ||
      (filters.ratingRange && filters.ratingRange !== "All") ||
      (filters.returnRateRange && filters.returnRateRange !== "All") ||
      (filters.profitCategory && filters.profitCategory !== "All")
    ) {
      const productSkus = new Set(products.map(p => p.sku));
      orders = orders.filter(o => productSkus.has(o.sku));
    }

    // Marketing specific filters
    if (filters.channel && filters.channel !== "All") {
      campaigns = campaigns.filter(c => c.channel === filters.channel);
    }
    if (filters.campaignSource && filters.campaignSource !== "All") {
      campaigns = campaigns.filter(c => c.channel === filters.campaignSource);
    }

    // Support specific filters
    if (filters.supportChannel && filters.supportChannel !== "All") {
      tickets = tickets.filter(t => t.channel === filters.supportChannel);
    }
    if (filters.ticketStatus && filters.ticketStatus !== "All") {
      tickets = tickets.filter(t => t.status === filters.ticketStatus);
    }
    if (filters.supportStatus && filters.supportStatus !== "All") {
      tickets = tickets.filter(t => t.status === filters.supportStatus);
    }
    if (filters.resolutionTimeRange && filters.resolutionTimeRange !== "All") {
      tickets = tickets.filter(t => {
        const hrs = t.resolutionTimeHrs;
        if (filters.resolutionTimeRange === "<1hr") return hrs < 1;
        if (filters.resolutionTimeRange === "1-4hr") return hrs >= 1 && hrs <= 4;
        if (filters.resolutionTimeRange === "4-24hr") return hrs > 4 && hrs <= 24;
        if (filters.resolutionTimeRange === "1-3 days") return hrs > 24 && hrs <= 72;
        if (filters.resolutionTimeRange === "3+ days") return hrs > 72;
        return true;
      });
    }

    // Clickstream specific filters
    if (filters.device && filters.device !== "All") {
      sessions = sessions.filter(s => s.device === filters.device);
    }
    if (filters.browser && filters.browser !== "All") {
      sessions = sessions.filter(s => s.browser === filters.browser);
    }
    if (filters.conversionStatus && filters.conversionStatus !== "All") {
      sessions = sessions.filter(s => {
        if (filters.conversionStatus === "Converted") return s.action === "Purchase";
        if (filters.conversionStatus === "Abandoned") return s.action === "Cart Abandonment";
        if (filters.conversionStatus === "Browsing") return s.action === "Page View" || s.action === "Product Click";
        return true;
      });
    }
    if (filters.cartAbandoned && filters.cartAbandoned !== "All") {
      sessions = sessions.filter(s => {
        const isAbandoned = s.action === "Cart Abandonment";
        return filters.cartAbandoned === "Yes" ? isAbandoned : !isAbandoned;
      });
    }

    // Delivery days specific filter
    if (filters.deliveryDaysRange && filters.deliveryDaysRange !== "All") {
      orders = orders.filter(o => {
        const days = o.transitDays;
        if (filters.deliveryDaysRange === "1-2") return days >= 1 && days <= 2;
        if (filters.deliveryDaysRange === "3-5") return days > 2 && days <= 5;
        if (filters.deliveryDaysRange === "6-10") return days > 5 && days <= 10;
        if (filters.deliveryDaysRange === "10+ days") return days > 10;
        return true;
      });
    }
  }

  // --- 1. EXECUTIVE DASHBOARD DATA ---
  const totalRevenue = orders.reduce((sum, o) => sum + o.revenue, 0);
  const totalProfit = orders.reduce((sum, o) => sum + o.profit, 0);
  const totalOrders = new Set(orders.map(o => o.id)).size;
  const totalCustomersCount = customers.length;
  const activeCustomers = new Set(orders.map(o => o.customerId)).size;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const totalProductsSold = orders.reduce((sum, o) => sum + o.quantity, 0);

  // Revenue by state
  const revenueByState = STATES.map(st => {
    const rev = orders.filter(o => o.state === st).reduce((sum, o) => sum + o.revenue, 0);
    return { name: st, value: parseFloat(rev.toFixed(2)) };
  });

  // Revenue by Category
  const revenueByCategory = CATEGORIES.map(cat => {
    const rev = orders.filter(o => o.category === cat).reduce((sum, o) => sum + o.revenue, 0);
    return { name: cat, value: parseFloat(rev.toFixed(2)) };
  });

  // Monthly Orders (Column Chart) grouped dynamically
  const monthMap: { [month: string]: number } = {};
  orders.forEach(o => {
    try {
      const mName = new Date(o.date).toLocaleString('default', { month: 'short' });
      monthMap[mName] = (monthMap[mName] || 0) + (o.ordersCount || 1);
    } catch (e) {
      monthMap["Jan"] = (monthMap["Jan"] || 0) + (o.ordersCount || 1);
    }
  });
  const monthlyOrders = Object.entries(monthMap)
    .map(([name, count]) => ({ name, orders: count }))
    .sort((a, b) => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return months.indexOf(a.name) - months.indexOf(b.name);
    });

  // Top 10 Brands (Horizontal Bar Chart)
  const brandRevenueMap: { [brand: string]: number } = {};
  orders.forEach(o => {
    brandRevenueMap[o.brand] = (brandRevenueMap[o.brand] || 0) + o.revenue;
  });
  const top10Brands = Object.entries(brandRevenueMap)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Executive daily trends for Line/Area Charts
  const dateMap: { [date: string]: { date: string; Revenue: number; Profit: number; Orders: number } } = {};
  
  let chartStart = start;
  let chartEnd = end;
  if (isAllTime && orders.length > 0) {
    chartStart = new Date(orders[0].date);
    chartEnd = new Date(orders[orders.length - 1].date);
  }

  const curr = new Date(chartStart);
  while (curr <= chartEnd) {
    const dStr = formatDate(curr);
    dateMap[dStr] = { date: dStr, Revenue: 0, Profit: 0, Orders: 0 };
    curr.setDate(curr.getDate() + 1);
  }
  orders.forEach(o => {
    if (dateMap[o.date]) {
      dateMap[o.date].Revenue += o.revenue;
      dateMap[o.date].Profit += o.profit;
      dateMap[o.date].Orders += (o.ordersCount || 1);
    }
  });
  const dailyTrends = Object.values(dateMap).map(day => ({
    ...day,
    Revenue: parseFloat(day.Revenue.toFixed(2)),
    Profit: parseFloat(day.Profit.toFixed(2))
  }));

  // --- 2. CUSTOMER ANALYTICS DATA ---
  const repeatCustomersCount = customers.filter(c => c.ordersCount > 2).length;
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);
  const avgSatisfaction = tickets.filter(t => t.satisfactionScore > 0).reduce((sum, t) => sum + t.satisfactionScore, 0) / (tickets.filter(t => t.satisfactionScore > 0).length || 1);
  const avgRevenuePerCustomer = customers.reduce((sum, c) => sum + c.totalSpent, 0) / (totalCustomersCount || 1);
  const repeatPurchaseRate = totalCustomersCount > 0 ? (repeatCustomersCount / totalCustomersCount) * 100 : 0;
  const avgTenure = customers.length > 0 
    ? parseFloat((customers.reduce((sum, c) => sum + c.tenureMonths, 0) / customers.length).toFixed(1)) 
    : 0;

  // Segment allocations
  const segmentRevenue = ["VIP", "Regular", "Corporate"].map(prof => {
    const rev = orders.filter(o => o.profile === prof).reduce((sum, o) => sum + o.revenue, 0);
    return { name: prof, value: parseFloat(rev.toFixed(2)) };
  });

  // customer activities stack calculated dynamically
  const activeCusts = customers.filter(c => ["VIP", "Loyal Customers", "New Customers"].includes(c.segment));
  const inactiveCusts = customers.filter(c => ["At Risk", "Hibernating"].includes(c.segment));

  const customerActivity = [
    {
      name: "Active",
      High: activeCusts.filter(c => c.activityLevel === "High").length,
      Medium: activeCusts.filter(c => c.activityLevel === "Medium").length,
      Low: activeCusts.filter(c => c.activityLevel === "Low").length
    },
    {
      name: "Inactive",
      High: inactiveCusts.filter(c => c.activityLevel === "High").length,
      Medium: inactiveCusts.filter(c => c.activityLevel === "Medium").length,
      Low: inactiveCusts.filter(c => c.activityLevel === "Low").length
    }
  ];

  // tenure ranges (histogram)
  const tenureDistribution = [
    { range: "0-6 Months", count: customers.filter(c => c.tenureMonths <= 6).length },
    { range: "7-12 Months", count: customers.filter(c => c.tenureMonths > 6 && c.tenureMonths <= 12).length },
    { range: "13-24 Months", count: customers.filter(c => c.tenureMonths > 12 && c.tenureMonths <= 24).length },
    { range: "24+ Months", count: customers.filter(c => c.tenureMonths > 24).length }
  ];

  // loyalty ranges
  const loyaltyDistribution = [
    { range: "0-500 Points", count: customers.filter(c => c.loyaltyPoints <= 500).length },
    { range: "501-1500 Points", count: customers.filter(c => c.loyaltyPoints > 500 && c.loyaltyPoints <= 1500).length },
    { range: "1500+ Points", count: customers.filter(c => c.loyaltyPoints > 1500).length }
  ];

  const top20Customers = customers
    .map(c => ({
      name: c.name,
      email: c.email,
      state: c.state,
      city: c.city,
      spent: c.totalSpent,
      orders: c.ordersCount,
      loyaltyPoints: c.loyaltyPoints,
      profile: c.profile
    }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 20);

  // --- 3. SALES ANALYTICS DATA ---
  const totalDiscount = orders.reduce((sum, o) => sum + o.discount, 0);
  const totalTax = orders.reduce((sum, o) => sum + o.tax, 0);
  
  // Warehouse split - dynamically group from actual order data
  const warehouseSalesMap: { [wh: string]: number } = {};
  orders.forEach(o => {
    if (o.warehouse) warehouseSalesMap[o.warehouse] = (warehouseSalesMap[o.warehouse] || 0) + o.revenue;
  });
  const warehouseSales = Object.entries(warehouseSalesMap)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  const categorySales = CATEGORIES.map(cat => {
    const rev = orders.filter(o => o.category === cat).reduce((sum, o) => sum + o.revenue, 0);
    return { name: cat, value: parseFloat(rev.toFixed(2)) };
  });

  const brandSales = BRANDS.map(br => {
    const rev = orders.filter(o => o.brand === br).reduce((sum, o) => sum + o.revenue, 0);
    return { name: br, value: parseFloat(rev.toFixed(2)) };
  });

  // Top selling products: use products[] directly (already filtered) with total_orders as sales count
  const topSellingProducts = [...products]
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10)
    .map(p => ({
      name: p.name,
      sku: p.sku,
      brand: p.brand,
      revenue: parseFloat((p.sales * p.price).toFixed(2)),
      units: p.sales
    }));

  // --- 4. PRODUCT PERFORMANCE DATA ---
  const bestSellingProduct = [...products].sort((a, b) => b.sales - a.sales)[0]?.name || "N/A";
  const highestProfitProduct = [...products].sort((a, b) => (b.price - b.cost) - (a.price - a.cost))[0]?.name || "N/A";
  
  const ratingDistribution = [
    { rating: "5 Stars", count: products.filter(p => p.rating >= 4.5).length },
    { rating: "4 Stars", count: products.filter(p => p.rating >= 3.5 && p.rating < 4.5).length },
    { rating: "3 Stars", count: products.filter(p => p.rating >= 2.5 && p.rating < 3.5).length },
    { rating: "1-2 Stars", count: products.filter(p => p.rating < 2.5).length }
  ];

  const returnRateByProduct = [...products]
    .map(p => ({ name: `${p.brand} ${p.name}`, rate: p.sales > 0 ? parseFloat(((p.returns / p.sales) * 100).toFixed(1)) : 0 }))
    .slice(0, 6);

  // --- 5. MARKETING ANALYTICS DATA ---
  const totalCampaigns = campaigns.length;
  const campaignRevenue = campaigns.reduce((sum, c) => sum + c.spend * 4.2, 0);
  const campaignOrders = Math.round(campaignRevenue / (avgOrderValue || 80));
  const avgCampaignRevenue = totalCampaigns > 0 ? campaignRevenue / totalCampaigns : 0;
  const marketingConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const marketingClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const conversionRateMarketing = marketingClicks > 0 ? (marketingConversions / marketingClicks) * 100 : 0;

  const campaignSalesSplit = ["Google Ads", "Meta Ads", "Email", "TikTok Ads", "Affiliate"].map(source => {
    const rev = campaigns.filter(c => c.channel === source).reduce((sum, c) => sum + c.spend * 4.5, 0);
    return { name: source, value: parseFloat(rev.toFixed(2)) };
  });

  const campaignsRanking = campaigns
    .map(c => ({ name: c.name, revenue: c.spend * 5.2, spend: c.spend }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // --- 6. DELIVERY ANALYTICS DATA ---
  let totalDeliveries = orders.filter(o => o.status !== "Cancelled").reduce((sum, o) => sum + (o.ordersCount || 1), 0);
  let deliveredOrdersCount = orders.filter(o => o.status === "Delivered").reduce((sum, o) => sum + (o.ordersCount || 1), 0);
  let failedDeliveriesCount = orders.filter(o => o.status === "Cancelled").reduce((sum, o) => sum + (o.ordersCount || 1), 0);
  let avgDeliveryDays = orders.filter(o => o.status === "Delivered").reduce((sum, o) => sum + o.transitDays * (o.ordersCount || 1), 0) / (deliveredOrdersCount || 1);
  let onTimeDeliveryRate = totalDeliveries > 0 ? (orders.filter(o => o.transitDays <= 3 && o.status === "Delivered").reduce((sum, o) => sum + (o.ordersCount || 1), 0) / totalDeliveries) * 100 : 0;
  let lateDeliveryRate = totalDeliveries > 0 ? (orders.filter(o => o.transitDays > 3 || o.status === "Delayed").reduce((sum, o) => sum + (o.ordersCount || 1), 0) / totalDeliveries) * 100 : 0;

  let warehouseDeliveries = ["Warehouse Alpha", "Warehouse Beta", "Warehouse Gamma"].map(w => {
    const ordersW = orders.filter(o => o.warehouse === w);
    const totalW = ordersW.reduce((sum, o) => sum + (o.ordersCount || 1), 0);
    const onTimeW = ordersW.filter(o => o.transitDays <= 3 && o.status === "Delivered").reduce((sum, o) => sum + (o.ordersCount || 1), 0);
    const rate = totalW > 0 ? (onTimeW / totalW) * 100 : 0;

    const deliveredW = ordersW.filter(o => o.status === "Delivered");
    const deliveredCountW = deliveredW.reduce((sum, o) => sum + (o.ordersCount || 1), 0);
    const avgDays = deliveredCountW > 0 ? deliveredW.reduce((sum, o) => sum + o.transitDays * (o.ordersCount || 1), 0) / deliveredCountW : 0;
    const failed = ordersW.filter(o => o.status === "Cancelled").reduce((sum, o) => sum + (o.ordersCount || 1), 0);

    return {
      name: w,
      rate: parseFloat(rate.toFixed(1)),
      days: parseFloat(avgDays.toFixed(1)),
      failed: failed
    };
  });

  let deliveryStatusDistribution = [
    { name: "Delivered", value: deliveredOrdersCount },
    { name: "Delayed", value: orders.filter(o => o.status === "Delayed").reduce((sum, o) => sum + (o.ordersCount || 1), 0) },
    { name: "Out for Delivery", value: orders.filter(o => o.status === "Out for Delivery").reduce((sum, o) => sum + (o.ordersCount || 1), 0) },
    { name: "Shipped", value: orders.filter(o => o.status === "Shipped").reduce((sum, o) => sum + (o.ordersCount || 1), 0) }
  ];

  let deliverySummary = [...rawDeliverySummary];
  if (filters) {
    if (filters.state && filters.state !== "All") {
      deliverySummary = deliverySummary.filter(d => d.state === filters.state);
    }
    if (filters.city && filters.city !== "All") {
      deliverySummary = deliverySummary.filter(d => d.city === filters.city);
    }
    if (filters.warehouse && filters.warehouse !== "All") {
      deliverySummary = deliverySummary.filter(d => d.warehouse === filters.warehouse);
    }
    if (filters.status && filters.status !== "All") {
      deliverySummary = deliverySummary.filter(d => d.delivery_status === filters.status);
    }
    // Delivery days range filter applied directly on deliverySummary rows
    if (filters.deliveryDaysRange && filters.deliveryDaysRange !== "All") {
      deliverySummary = deliverySummary.filter(d => {
        const days = Number(d.delivery_days);
        if (filters.deliveryDaysRange === "1-2") return days >= 1 && days <= 2;
        if (filters.deliveryDaysRange === "3-5") return days > 2 && days <= 5;
        if (filters.deliveryDaysRange === "6-10") return days > 5 && days <= 10;
        if (filters.deliveryDaysRange === "10+ days") return days > 10;
        return true;
      });
    }
  }

  if (deliverySummary && deliverySummary.length > 0) {
    totalDeliveries = deliverySummary.length;
    deliveredOrdersCount = deliverySummary.filter(d => d.delivery_status === "Delivered").length;
    failedDeliveriesCount = deliverySummary.filter(d => d.delivery_status === "Failed" || d.delivery_status === "Cancelled").length;
    
    const deliveredRows = deliverySummary.filter(d => d.delivery_status === "Delivered" && d.delivery_days != null);
    const totalDeliveredDays = deliveredRows.reduce((sum, d) => sum + Number(d.delivery_days), 0);
    avgDeliveryDays = deliveredRows.length > 0 ? totalDeliveredDays / deliveredRows.length : 0;
    
    const onTimeCount = deliveredRows.filter(d => Number(d.delivery_days) <= 3).length;
    onTimeDeliveryRate = totalDeliveries > 0 ? (onTimeCount / totalDeliveries) * 100 : 0;
    lateDeliveryRate = 100 - onTimeDeliveryRate;

    const whMap: { [wh: string]: { total: number; success: number; totalDays: number; deliveredCount: number; failed: number } } = {};
    deliverySummary.forEach(d => {
      const wh = d.warehouse || "Warehouse Alpha";
      if (!whMap[wh]) whMap[wh] = { total: 0, success: 0, totalDays: 0, deliveredCount: 0, failed: 0 };
      whMap[wh].total += 1;
      if (d.delivery_status === "Delivered") {
        whMap[wh].success += 1;
        whMap[wh].deliveredCount += 1;
        whMap[wh].totalDays += Number(d.delivery_days || 0);
      } else if (d.delivery_status === "Failed" || d.delivery_status === "Cancelled") {
        whMap[wh].failed += 1;
      }
    });

    warehouseDeliveries = Object.entries(whMap).map(([name, data]) => ({
      name,
      rate: data.total > 0 ? parseFloat(((data.success / data.total) * 100).toFixed(1)) : 0,
      days: data.deliveredCount > 0 ? parseFloat((data.totalDays / data.deliveredCount).toFixed(1)) : 0,
      failed: data.failed
    }));

    const distMap: { [st: string]: number } = {};
    deliverySummary.forEach(d => {
      const status = d.delivery_status || "Delivered";
      distMap[status] = (distMap[status] || 0) + 1;
    });
    deliveryStatusDistribution = Object.entries(distMap).map(([name, value]) => ({ name, value: Number(value) }));
  }

  const carrierPerformance = ["FedEx", "UPS", "DHL", "USPS"].map(carrier => {
    const carrierOrders = orders.filter(o => o.carrier === carrier);
    const onTimeCarrier = carrierOrders.filter(o => o.transitDays <= 3 && o.status === "Delivered");
    const rate = carrierOrders.length > 0 ? (onTimeCarrier.length / carrierOrders.length) * 100 : 95;
    const avgTransit = carrierOrders.length > 0 ? carrierOrders.reduce((sum, o) => sum + o.transitDays, 0) / carrierOrders.length : 2.5;

    return {
      name: carrier,
      otd: parseFloat(rate.toFixed(1)),
      transitTime: parseFloat(avgTransit.toFixed(1))
    };
  });

  // --- 7. SUPPORT & WEBSITE CLICKSTREAM ---
  let totalTickets = tickets.length;
  let avgResolutionTime = tickets.filter(t => t.resolutionTimeHrs > 0).reduce((sum, t) => sum + t.resolutionTimeHrs, 0) / (tickets.filter(t => t.resolutionTimeHrs > 0).length || 1);
  let totalSessionsCount = sessions.length;
  let avgSessionDuration = sessions.reduce((sum, s) => sum + s.duration, 0) / (totalSessionsCount || 1);
  
  // Funnel calculations
  let totalVisits = sessions.length;
  let productViews = sessions.filter(s => s.action === "Product Click" || s.action === "Add to Cart" || s.action === "Checkout Init" || s.action === "Purchase").length;
  let cartAdds = sessions.filter(s => s.action === "Add to Cart" || s.action === "Checkout Init" || s.action === "Purchase").length;
  let checkoutInits = sessions.filter(s => s.action === "Checkout Init" || s.action === "Purchase").length;
  let purchases = sessions.filter(s => s.action === "Purchase").length;
  let cartAbandonmentRate = cartAdds > 0 ? ((cartAdds - purchases) / cartAdds) * 100 : 0;

  // Dynamic ticket channel grouping from actual ticket data
  const channelMap: { [ch: string]: number } = {};
  tickets.forEach(t => { if (t.channel) channelMap[t.channel] = (channelMap[t.channel] || 0) + 1; });
  let ticketsByChannel = Object.entries(channelMap).map(([name, value]) => ({ name, value }));

  let websiteBehaviorFunnel = [
    { stage: "Sessions (Visits)", count: totalVisits },
    { stage: "Product Views", count: productViews },
    { stage: "Cart Adds", count: cartAdds },
    { stage: "Checkout Init", count: checkoutInits },
    { stage: "Purchases", count: purchases }
  ];

  let browserUsage = [
    { name: "Chrome", value: sessions.filter(s => s.browser === "Chrome").length },
    { name: "Safari", value: sessions.filter(s => s.browser === "Safari").length },
    { name: "Firefox", value: sessions.filter(s => s.browser === "Firefox").length },
    { name: "Edge", value: sessions.filter(s => s.browser === "Edge").length }
  ];

  let deviceUsage = [
    { name: "Desktop", value: sessions.filter(s => s.device === "Desktop").length },
    { name: "Mobile", value: sessions.filter(s => s.device === "Mobile").length },
    { name: "Tablet", value: sessions.filter(s => s.device === "Tablet").length }
  ];

  let clickstreamSummary = [...rawClickstreamSummary];
  if (filters) {
    if (filters.device && filters.device !== "All") {
      clickstreamSummary = clickstreamSummary.filter(c => c.device === filters.device);
    }
    if (filters.browser && filters.browser !== "All") {
      clickstreamSummary = clickstreamSummary.filter(c => c.browser === filters.browser);
    }
    // Conversion status filter on clickstream rows
    if (filters.conversionStatus && filters.conversionStatus !== "All") {
      clickstreamSummary = clickstreamSummary.filter(c => {
        if (filters.conversionStatus === "Converted") return c.order_status === "Completed";
        if (filters.conversionStatus === "Abandoned") return c.cart_abandoned === true || String(c.cart_abandoned) === "true" || Number(c.cart_abandoned) === 1;
        if (filters.conversionStatus === "Browsing") return c.order_status !== "Completed" && c.cart_abandoned !== true && String(c.cart_abandoned) !== "true" && Number(c.cart_abandoned) !== 1;
        return true;
      });
    }
    // Cart abandoned filter on clickstream rows
    if (filters.cartAbandoned && filters.cartAbandoned !== "All") {
      clickstreamSummary = clickstreamSummary.filter(c => {
        const abandoned = c.cart_abandoned === true || String(c.cart_abandoned) === "true" || Number(c.cart_abandoned) === 1;
        return filters.cartAbandoned === "Yes" ? abandoned : !abandoned;
      });
    }
  }

  if (clickstreamSummary && clickstreamSummary.length > 0) {
    totalSessionsCount = clickstreamSummary.length;
    const validDurations = clickstreamSummary.filter(c => c.session_duration_sec != null);
    avgSessionDuration = validDurations.length > 0
      ? validDurations.reduce((sum, c) => sum + Number(c.session_duration_sec), 0) / validDurations.length
      : 0;
    totalVisits = totalSessionsCount;

    const rawViews = clickstreamSummary.filter(c => String(c.website_behavior || "").toLowerCase().includes("view") || String(c.page_name || "").toLowerCase().includes("product")).length;
    const rawCartAdds = clickstreamSummary.filter(c => String(c.website_behavior || "").toLowerCase().includes("cart") || String(c.website_behavior || "").toLowerCase().includes("add") || c.cart_abandoned === true || String(c.cart_abandoned) === "true").length;
    const rawCheckoutInits = clickstreamSummary.filter(c => String(c.website_behavior || "").toLowerCase().includes("checkout") || String(c.website_behavior || "").toLowerCase().includes("init") || c.order_status === "Completed").length;
    const rawPurchases = clickstreamSummary.filter(c => c.order_status === "Completed").length;

    // Enforce descending counts down the funnel stages
    productViews = Math.min(totalVisits, rawViews);
    cartAdds = Math.min(productViews, rawCartAdds);
    checkoutInits = Math.min(cartAdds, rawCheckoutInits);
    purchases = Math.min(checkoutInits, rawPurchases);

    // Calculate cart abandonment rate directly from the database flag
    const abandonedCount = clickstreamSummary.filter(c => c.cart_abandoned === true || String(c.cart_abandoned) === "true" || Number(c.cart_abandoned) === 1).length;
    cartAbandonmentRate = totalVisits > 0 ? (abandonedCount / totalVisits) * 100 : 0;

    websiteBehaviorFunnel = [
      { stage: "Sessions (Visits)", count: totalVisits },
      { stage: "Product Views", count: productViews },
      { stage: "Cart Adds", count: cartAdds },
      { stage: "Checkout Init", count: checkoutInits },
      { stage: "Purchases", count: purchases }
    ];

    const browserMap: { [br: string]: number } = {};
    clickstreamSummary.forEach(c => {
      if (c.browser) browserMap[c.browser] = (browserMap[c.browser] || 0) + 1;
    });
    browserUsage = Object.entries(browserMap).map(([name, value]) => ({ name, value }));

    const deviceMap: { [dev: string]: number } = {};
    clickstreamSummary.forEach(c => {
      if (c.device) deviceMap[c.device] = (deviceMap[c.device] || 0) + 1;
    });
    deviceUsage = Object.entries(deviceMap).map(([name, value]) => ({ name, value }));
  }

  // Dynamic event distribution from real_time_clickstream_event column
  const eventMap: { [ev: string]: number } = {};
  clickstreamSummary.forEach(c => {
    if (c.real_time_clickstream_event) {
      eventMap[c.real_time_clickstream_event] = (eventMap[c.real_time_clickstream_event] || 0) + 1;
    }
  });
  const eventDistribution = Object.entries(eventMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Dynamic top pages from page_name column
  const pageMap: { [pg: string]: number } = {};
  clickstreamSummary.forEach(c => {
    if (c.page_name) pageMap[c.page_name] = (pageMap[c.page_name] || 0) + 1;
  });
  const topPagesVisited = Object.entries(pageMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Dynamic ticket status distribution from actual ticket statuses in DB
  const ticketStatusMap: { [st: string]: number } = {};
  tickets.forEach(t => { if (t.status) ticketStatusMap[t.status] = (ticketStatusMap[t.status] || 0) + 1; });
  const ticketStatusDistribution = Object.entries(ticketStatusMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Return the master payload aligned with Databricks table schemas
  return {
    metadata: {
      states: uniqueStates,
      citiesByState,
      categories: uniqueCategories,
      subcategories: uniqueSubcategories,
      brands: uniqueBrands,
      warehouses: uniqueWarehouses,
      marketingChannels: uniqueMarketingChannels,
      supportChannels: uniqueSupportChannels,
      devices: uniqueDevices,
      browsers: uniqueBrowsers,
      paymentMethods: uniquePaymentMethods,
      orderStatuses: uniqueOrderStatuses
    },
    overview: {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      orderCount: totalOrders,
      totalCustomers: totalCustomersCount,
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(1)),
      activeCustomers,
      totalProductsSold,
      revenueByState,
      revenueByCategory,
      monthlyOrders,
      top10Brands,
      dailyTrends
    },
    customers: {
      totalCustomers: totalCustomersCount,
      newCustomers: customers.filter(c => c.segment === "New Customers").length,
      repeatCustomers: repeatCustomersCount,
      avgTenure,
      totalLoyaltyPoints,
      avgSatisfaction: parseFloat(avgSatisfaction.toFixed(1)),
      avgRevenuePerCustomer: parseFloat(avgRevenuePerCustomer.toFixed(2)),
      repeatPurchaseRate: parseFloat(repeatPurchaseRate.toFixed(1)),
      customerProfileDistribution: [
        { name: "VIP", value: customers.filter(c => c.profile === "VIP").length },
        { name: "Regular", value: customers.filter(c => c.profile === "Regular").length },
        { name: "Corporate", value: customers.filter(c => c.profile === "Corporate").length }
      ],
      segmentRevenue,
      tenureDistribution,
      loyaltyDistribution,
      customerActivity,
      top20Customers
    },
    sales: {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOrders,
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      totalTax: parseFloat(totalTax.toFixed(2)),
      totalQuantitySold: totalProductsSold,
      dailyTrends,
      categorySales,
      brandSales,
      warehouseSales,
      topSellingProducts
    },
    products: {
      totalProducts: products.length,
      bestSellingProduct,
      highestProfitProduct,
      avgRating: parseFloat((products.length > 0 ? products.reduce((sum, p) => sum + p.rating, 0) / products.length : 0).toFixed(2)),
      totalReturns: products.reduce((sum, p) => sum + p.returns, 0),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      topProductsRevenue: [...products].sort((a, b) => (b.sales * b.price) - (a.sales * a.price)).slice(0, 5).map(p => ({ name: `${p.brand} ${p.name}`, value: parseFloat((p.sales * p.price).toFixed(2)) })),
      topProductsProfit: [...products].sort((a, b) => (b.sales * (b.price - b.cost)) - (a.sales * (a.price - a.cost))).slice(0, 5).map(p => ({ name: `${p.brand} ${p.name}`, value: parseFloat((p.sales * (p.price - p.cost)).toFixed(2)) })),
      ratingDistribution,
      returnRateByProduct,
      revenueByCategory,
      brandSales
    },
    marketing: {
      totalCampaigns,
      revenueGenerated: parseFloat(campaignRevenue.toFixed(2)),
      ordersGenerated: campaignOrders,
      customersAcquired: Math.round(campaignOrders * 0.8),
      avgCampaignRevenue: parseFloat(avgCampaignRevenue.toFixed(2)),
      conversionRate: parseFloat(conversionRateMarketing.toFixed(2)),
      campaignSalesSplit,
      campaignsRanking,
      dailyTrends
    },
    delivery: {
      totalDeliveries,
      deliveredOrdersCount,
      failedDeliveriesCount,
      avgDeliveryDays: parseFloat(avgDeliveryDays.toFixed(1)),
      onTimeDeliveryRate: parseFloat(onTimeDeliveryRate.toFixed(1)),
      lateDeliveryRate: parseFloat(lateDeliveryRate.toFixed(1)),
      warehouseDeliveries,
      deliveryStatusDistribution,
      carrierPerformance
    },
    supportClickstream: {
      totalTickets,
      avgResolutionTime: parseFloat(avgResolutionTime.toFixed(1)),
      avgSatisfaction: parseFloat(avgSatisfaction.toFixed(1)),
      totalSessions: totalSessionsCount,
      avgSessionDuration: Math.round(avgSessionDuration),
      cartAbandonmentRate: parseFloat(cartAbandonmentRate.toFixed(1)),
      ticketsByChannel,
      ticketStatusDistribution,
      satisfactionDistribution: [
        { score: "5 stars", count: tickets.filter(t => t.satisfactionScore === 5).length },
        { score: "4 stars", count: tickets.filter(t => t.satisfactionScore === 4).length },
        { score: "3 stars", count: tickets.filter(t => t.satisfactionScore === 3).length },
        { score: "1-2 stars", count: tickets.filter(t => t.satisfactionScore > 0 && t.satisfactionScore < 3).length }
      ],
      deviceUsage,
      browserUsage,
      websiteBehaviorFunnel,
      topPagesVisited,
      eventDistribution
    }
  };
}
