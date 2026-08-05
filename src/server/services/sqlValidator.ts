export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const FORBIDDEN_SQL_KEYWORDS = [
  "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "RENAME", "TRUNCATE",
  "REPLACE", "MERGE", "CALL", "EXEC", "EXECUTE", "GRANT", "REVOKE", "COMMIT", "ROLLBACK",
  "SAVEPOINT", "SHUTDOWN", "EXPLAIN", "DESCRIBE" // Allow DESCRIBE but let's restrict it if we only want SELECT
];

const VALID_TABLES = [
  "e_com.gold.sales_summary",
  "e_com.gold.customer_360",
  "e_com.gold.product_performance",
  "e_com.gold.marketing_summary",
  "e_com.gold.delivery_summary",
  "e_com.gold.clickstream_summary",
  "e_com.gold.support_summary",
  "e_com.ml.churn_predictions",
  "e_com.ml.clv_predictions",
  "e_com.ml.customer_profile_predictions",
  "e_com.ml.product_affinities",
  "e_com.ml.product_recommendations",
  "e_com.ml.sales_forecast"
];

export function validateSQL(sql: string): ValidationResult {
  const normalizedSql = sql.trim().toUpperCase();

  // 1. MUST start with SELECT or WITH
  if (!normalizedSql.startsWith("SELECT") && !normalizedSql.startsWith("WITH")) {
    return {
      isValid: false,
      error: "SQL validation error: Only read-only queries starting with 'SELECT' or 'WITH' are permitted."
    };
  }

  // 2. Reject multi-statement queries (separated by semicolons)
  // Check if there's a semicolon followed by non-whitespace statements
  const statementsCount = sql.split(";").filter(stmt => stmt.trim().length > 0).length;
  if (statementsCount > 1) {
    return {
      isValid: false,
      error: "SQL validation error: Semicolon-separated multi-statement execution is forbidden to prevent injection."
    };
  }

  // 3. Scan for forbidden DDL/DML statements
  // Tokenize query to find individual words and check for exact forbidden keyword matches
  const tokens = normalizedSql.split(/\s+/);
  for (const keyword of FORBIDDEN_SQL_KEYWORDS) {
    if (tokens.includes(keyword)) {
      return {
        isValid: false,
        error: `SQL validation error: Destructive or unauthorized keyword '${keyword}' detected in the query.`
      };
    }
  }

  // 4. Ensure table qualification is present and refers to valid schemas
  const lowerSql = sql.toLowerCase();
  
  // Find all matches for table patterns (like e_com.gold.something or e_com.ml.something)
  // Check if there are any non-qualified table references.
  // Although parsing SQL with regex is not bulletproof, we can enforce that:
  // - The query must contain a reference to one of the VALID_TABLES.
  // - Any reference to gold or ml schemas must match our schema names.
  let containsValidTable = false;
  for (const table of VALID_TABLES) {
    if (lowerSql.includes(table.toLowerCase())) {
      containsValidTable = true;
      break;
    }
  }

  if (!containsValidTable) {
    return {
      isValid: false,
      error: "SQL validation error: The query does not reference any qualified tables in the 'e_com.gold' or 'e_com.ml' schemas."
    };
  }

  // Check for any unqualified e_com tables or generic table lookups
  // (e.g., SELECT * FROM sales_summary instead of e_com.gold.sales_summary)
  // We can scan for keywords like FROM or JOIN followed by unqualified identifiers
  const fromJoinMatches = lowerSql.match(/(?:from|join)\s+([a-zA-Z0-9_\.]+)/g) || [];
  for (const match of fromJoinMatches) {
    const tableName = match.replace(/(?:from|join)\s+/, "").trim();
    // If it doesn't start with e_com.gold. or e_com.ml., reject it!
    if (!tableName.startsWith("e_com.gold.") && !tableName.startsWith("e_com.ml.")) {
      return {
        isValid: false,
        error: `SQL validation error: Table reference '${tableName}' is unqualified. Always prepend 'e_com.gold.' or 'e_com.ml.' to table names.`
      };
    }

    // Verify if it is in our list of VALID_TABLES
    if (!VALID_TABLES.map(t => t.toLowerCase()).includes(tableName)) {
      return {
        isValid: false,
        error: `SQL validation error: Table '${tableName}' is not a recognized table in the Unity Catalog schemas.`
      };
    }
  }

  return { isValid: true };
}
