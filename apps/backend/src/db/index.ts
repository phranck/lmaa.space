import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

const client = postgres(env.DATABASE_URL);

/**
 * Drizzle database instance configured with project schema.
 */
export const db = drizzle(client, { schema });

/**
 * Convenience type representing the configured Drizzle database instance.
 */
export type DB = typeof db;
