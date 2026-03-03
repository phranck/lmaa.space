import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

export const client = postgres(env.DATABASE_URL);

/**
 * Drizzle database instance configured with project schema.
 */
export const db = drizzle(client, { schema });
