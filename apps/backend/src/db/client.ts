import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";
import { env } from "../config/env.js";

/**
 * Connections one instance may hold.
 *
 * @remarks
 * Stated rather than left to the driver's default of ten, because the backend
 * runs on more than one instance and a rolling deployment has the old and the
 * new ones connected at the same time. At the default that came to forty
 * connections at once, and the database refused the new instances with
 * "remaining connection slots are reserved for roles with the SUPERUSER
 * attribute", so the deployment failed whilst the old version kept serving.
 *
 * Five per instance leaves room for the migrator and the doctor, both of which
 * take a single connection of their own at start-up.
 */
const MAX_POOL_CONNECTIONS = 5;

export const client = postgres(env.DATABASE_URL, { max: MAX_POOL_CONNECTIONS });

/**
 * Drizzle database instance configured with project schema.
 */
export const db = drizzle(client, { schema });
