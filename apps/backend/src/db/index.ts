import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema.js";

const dbPath = process.env.DATABASE_PATH ?? "./deinshop.db";

const sqlite = new Database(dbPath, { create: true });

// WAL mode for better concurrent read performance
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
