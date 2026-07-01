import { defineConfig } from '@prisma/config';
import { config } from 'dotenv';

// Força a leitura do arquivo .env
config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  }
});