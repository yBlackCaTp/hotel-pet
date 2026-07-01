import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 1. Cria a conexão direta (Pool) com o banco de dados Neon
const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });

// 2. Instancia o adaptador oficial do PostgreSQL
const adapter = new PrismaPg(pool);

// 3. Passa o adaptador para dentro do PrismaClient, conforme a versão 7 exige!
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;