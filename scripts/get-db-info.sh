#!/bin/bash

# 获取 RDS 数据库连接信息的脚本

STACK_NAME=${1:-zack-mpa-bff-prod}

echo "📊 Fetching database info from stack: $STACK_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 获取 RDS 端点
ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
  --output text 2>/dev/null)

# 获取端口
PORT=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabasePort`].OutputValue' \
  --output text 2>/dev/null)

# 获取数据库名
DB_NAME=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseName`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$ENDPOINT" ]; then
  echo "❌ Error: Could not fetch database info from stack $STACK_NAME"
  echo "   Please make sure:"
  echo "   1. AWS CLI is configured correctly"
  echo "   2. Stack name is correct"
  echo "   3. You have permission to access CloudFormation"
  exit 1
fi

echo "✅ Database Information:"
echo ""
echo "Endpoint:  $ENDPOINT"
echo "Port:      $PORT"
echo "Database:  $DB_NAME"
echo "Username:  zackadmin (default)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 DATABASE_URL (add to .env.production):"
echo ""
echo "DATABASE_URL=\"postgresql://zackadmin:YOUR_PASSWORD@$ENDPOINT:$PORT/$DB_NAME?schema=public\""
echo ""
echo "⚠️  Replace YOUR_PASSWORD with the actual database password"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
