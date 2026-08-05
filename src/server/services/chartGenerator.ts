export interface ChartRecommendation {
  type: "line" | "bar" | "area" | "donut" | "pie" | "stacked-bar" | "kpis" | "table";
  config: {
    xAxisKey?: string;
    yAxisKeys?: string[];
    seriesNames?: string[];
    valueKey?: string; // For pie/donut
    nameKey?: string;  // For pie/donut
  };
  data: any[];
}

export function recommendChart(
  columns: string[],
  rows: any[],
  agentKey: string
): ChartRecommendation {
  console.log(`[Chart Generator] Generating chart recommendation for agent: "${agentKey}", row count: ${rows.length}`);

  // Default fallback is table
  const defaultTable: ChartRecommendation = {
    type: "table",
    config: {},
    data: rows
  };

  if (!rows || rows.length === 0) {
    return defaultTable;
  }

  // Normalize column names to lowercase for comparison
  const lowerCols = columns.map(c => c.toLowerCase());

  // 1. Check if single row with numeric columns -> KPI Cards
  if (rows.length === 1) {
    const numericCols = columns.filter((_, idx) => {
      const val = rows[0][columns[idx]];
      return typeof val === "number" || (!isNaN(Number(val)) && val !== "");
    });

    if (numericCols.length > 0) {
      return {
        type: "kpis",
        config: {
          yAxisKeys: numericCols
        },
        data: rows
      };
    }
  }

  // 2. Identify potential Date/Category/Dimension column for X Axis
  let xAxisKey = "";
  let nameKey = "";

  // Order of preference for xAxis: Date, Month, Category, Segment, Brand, State/City, Name
  const xAxisCandidates = [
    "date", "month", "forecast_date", "order_date", "prediction_date", "day",
    "category", "product_category", "product_subcategory", "subcategory",
    "segment", "clv_tier", "risk_level", "status", "order_status", "delivery_status",
    "brand", "state", "city", "warehouse", "customer_name", "product_details",
    "customer_id", "product_id", "source_product", "recommended_product"
  ];

  for (const candidate of xAxisCandidates) {
    const matchIdx = lowerCols.indexOf(candidate.toLowerCase());
    if (matchIdx !== -1) {
      xAxisKey = columns[matchIdx];
      nameKey = columns[matchIdx];
      break;
    }
  }

  // If no common candidates, pick the first non-numeric column
  if (!xAxisKey) {
    const textIdx = columns.findIndex(col => typeof rows[0][col] === "string");
    if (textIdx !== -1) {
      xAxisKey = columns[textIdx];
      nameKey = columns[textIdx];
    } else {
      xAxisKey = columns[0];
      nameKey = columns[0];
    }
  }

  // 3. Identify numeric columns for Y Axis / Values
  const numericKeys: string[] = [];
  const countKeys: string[] = [];

  columns.forEach(col => {
    if (col === xAxisKey) return;
    const val = rows[0][col];
    const isNum = typeof val === "number" || (!isNaN(Number(val)) && val !== null && val !== "");
    if (isNum) {
      const lowerCol = col.toLowerCase();
      if (lowerCol.includes("count") || lowerCol.includes("total_orders") || lowerCol.includes("interactions") || lowerCol.includes("quantity")) {
        countKeys.push(col);
      } else {
        numericKeys.push(col);
      }
    }
  });

  const valueKeys = numericKeys.length > 0 ? numericKeys : countKeys;

  if (valueKeys.length === 0) {
    // No numeric data to chart, return table
    return defaultTable;
  }

  // 4. Map Chart Type based on Agent and heuristics
  // Rule A: Forecast agent -> Line Chart
  if (agentKey === "forecast" || xAxisKey.toLowerCase().includes("forecast_date") || xAxisKey.toLowerCase().includes("date")) {
    return {
      type: "line",
      config: {
        xAxisKey,
        yAxisKeys: valueKeys
      },
      data: rows
    };
  }

  // Rule B: Segment / Risk level -> Donut or Pie Chart
  const isSegmentOrRisk = lowerCols.includes("segment") || lowerCols.includes("clv_tier") || lowerCols.includes("risk_level") || lowerCols.includes("delivery_status") || lowerCols.includes("order_status") || lowerCols.includes("payment_method");
  if (isSegmentOrRisk && rows.length <= 10) {
    return {
      type: "donut",
      config: {
        nameKey,
        valueKey: valueKeys[0]
      },
      data: rows
    };
  }

  // Rule C: Customer support/delivery status -> Pie or Stacked Bar
  if (agentKey === "delivery" && lowerCols.includes("delivery_status")) {
    return {
      type: "pie",
      config: {
        nameKey,
        valueKey: valueKeys[0]
      },
      data: rows
    };
  }

  // Rule D: Multi-series stacking support
  if (agentKey === "support" && lowerCols.includes("priority") && rows.length > 3) {
    return {
      type: "stacked-bar",
      config: {
        xAxisKey,
        yAxisKeys: valueKeys
      },
      data: rows
    };
  }

  // Rule E: Revenue / monthly summary -> Area Chart
  const hasRevenueAndDate = (lowerCols.includes("month") || lowerCols.includes("order_date") || lowerCols.includes("date")) &&
                            (lowerCols.includes("revenue") || lowerCols.includes("sales") || lowerCols.includes("total_revenue") || lowerCols.includes("total_amount"));
  if (hasRevenueAndDate) {
    return {
      type: "area",
      config: {
        xAxisKey,
        yAxisKeys: [columns[lowerCols.findIndex(c => c.includes("revenue") || c.includes("sales") || c.includes("amount"))]]
      },
      data: rows
    };
  }

  // Rule F: Default fallback for comparisons (category, brand, etc.) -> Bar Chart
  return {
    type: "bar",
    config: {
      xAxisKey,
      yAxisKeys: valueKeys
    },
    data: rows
  };
}
export default recommendChart;
