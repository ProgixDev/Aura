import { DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

// Load .env at import time so buildDataSourceOptions() sees DB_* when app.module evaluates
// TypeOrmModule.forRoot() at decoration time — that runs before ConfigModule.forRoot().
dotenv.config();

// Schema is managed by server/scripts/schema.sql (run in the Supabase SQL Editor), not by
// TypeORM migrations — so no `migrations` glob and no CLI DataSource export here. This just
// builds the runtime connection options for the app's query layer.
export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    database: process.env.DB_DATABASE ?? 'aura_nest',
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    // Supabase's managed Postgres requires TLS; `rejectUnauthorized: false` skips cert
    // verification, which is Supabase's own recommended connection setting (no MITM concern
    // between the app host and Supabase's network) — don't copy this relaxed setting to a
    // connection where that assumption doesn't hold. `DB_SSL=false` opts out entirely, for
    // connecting to a plain local/throwaway Postgres instead.
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    entities: [__dirname + '/entities/*.entity.{ts,js}'],
    synchronize: false,
  };
}
