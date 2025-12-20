#!/bin/bash

# Prisma 迁移脚本 - 使用官方 migrate deploy

set -e

ENV_FILE=${1:-.env.production}

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file $ENV_FILE does not exist!"
    exit 1
fi

echo "🔧 Running Prisma migration..."
echo "📝 Using environment: $ENV_FILE"
echo ""

# 加载环境变量
export $(cat $ENV_FILE | grep -v '^#' | xargs)

# 显示连接信息（隐藏密码）
echo "📍 DATABASE_URL: ${DATABASE_URL//:*@/:****@}"
echo ""

# 运行 Prisma 迁移
echo "🚀 Executing: prisma migrate deploy"
pnpm prisma migrate deploy

echo ""
echo "✅ Migration completed!"
