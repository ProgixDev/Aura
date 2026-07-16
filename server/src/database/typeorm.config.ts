import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

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
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    synchronize: false,
  };
}

dotenv.config();
export default new DataSource(buildDataSourceOptions()); // used by TypeORM CLI
