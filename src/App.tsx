import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AnalyticsProvider } from "./hooks/useAnalytics"
import { Layout } from "./components/layout/Layout"
import { ErrorBoundary } from "./components/common/ErrorBoundary"

// Page Components
import { ExecutiveDashboard } from "./pages/ExecutiveDashboard"
import { CustomerAnalytics } from "./pages/CustomerAnalytics"
import { SalesAnalytics } from "./pages/SalesAnalytics"
import { ProductPerformance } from "./pages/ProductPerformance"
import { MarketingAnalytics } from "./pages/MarketingAnalytics"
import { DeliveryAnalytics } from "./pages/DeliveryAnalytics"
import { SupportClickstream } from "./pages/SupportClickstream"
import { PredictiveAnalytics } from "./pages/PredictiveAnalytics"

// Standard query client config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Avoid refetching when user switches browser tab
    },
  },
})

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AnalyticsProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<ExecutiveDashboard />} />
                <Route path="/customers" element={<CustomerAnalytics />} />
                <Route path="/sales" element={<SalesAnalytics />} />
                <Route path="/products" element={<ProductPerformance />} />
                <Route path="/marketing" element={<MarketingAnalytics />} />
                <Route path="/delivery" element={<DeliveryAnalytics />} />
                <Route path="/support" element={<SupportClickstream />} />
                <Route path="/predictive" element={<PredictiveAnalytics />} />
                
                {/* Fallback route */}
                <Route path="*" element={<ExecutiveDashboard />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </AnalyticsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
