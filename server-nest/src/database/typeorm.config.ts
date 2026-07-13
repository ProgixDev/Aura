import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'mysql',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    database: process.env.DB_DATABASE ?? 'aura_nest',
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    entities: [__dirname + '/entities/*.entity.{ts,js}'],
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    synchronize: false,
  };
}

dotenv.config();
export default new DataSource(buildDataSourceOptions()); // used by TypeORM CLI
