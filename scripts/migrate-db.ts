import { config as dotenvConfig } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';

// 根据 NODE_ENV 加载对应的环境变量文件
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env';

const result = dotenvConfig({ path: path.resolve(process.cwd(), envFile) });

if (result.error) {
  console.error(`❌ Failed to load ${envFile}:`, result.error);
  process.exit(1);
}

console.log(`📁 Loaded environment from: ${envFile}`);

async function migrate() {
  console.log('🔧 Starting database migration...');
  console.log('📍 DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

  try {
    // 测试连接
    console.log('🔌 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // 创建 contacts 表
    console.log('📋 Creating contacts table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    console.log('✅ Table created successfully');

    // 验证表是否存在
    console.log('🔍 Verifying table...');
    const result = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'contacts';
    `;
    console.log('📊 Table verification result:', result);

    // 测试插入
    console.log('🧪 Testing insert...');
    const testContact = await prisma.contact.create({
      data: {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
      },
    });
    console.log('✅ Test insert successful:', testContact);

    // 删除测试数据
    await prisma.contact.delete({
      where: { id: testContact.id },
    });
    console.log('🧹 Test data cleaned up');

    console.log('🎉 Migration completed successfully!');
  } catch (error: unknown) {
    console.error('❌ Migration failed:', error);
    const err = error as { message?: string; code?: string; meta?: unknown };
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      meta: err.meta,
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('👋 Database disconnected');
  }
}

migrate();
