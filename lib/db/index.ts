import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

neonConfig.fetchConnectionCache = true;

const getDbClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Return mock query builder/client fallback for safe static rendering when env is missing
    const fallbackSql = neon("postgresql://user:pass@ep-fallback.neon.tech/neondb");
    return drizzle(fallbackSql, { schema });
  }
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
};

export const db = getDbClient();
