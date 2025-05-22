import { Client } from 'pg';

export default async () => {
  const client = new Client({
    user: 'postgres',
    password: 'admin',
    host: '127.0.0.1',
    port: '5432',
    database: 'postgres',
  });

  await client.connect();
  return client;
};