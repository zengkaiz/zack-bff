#!/bin/bash

# 构建脚本 - 编译TypeScript并复制静态资源

set -e  # 遇到错误立即退出

echo "🔨 开始构建..."

# 1. 编译 TypeScript
echo "📦 编译 TypeScript..."
tsc

# 1.5 转换路径别名为相对路径
echo "🔄 Resolving path aliases..."
tsc-alias

# 2. 复制 views 目录
echo "📋 复制 views 目录到 dist..."
cp -r views dist/views

# 3. 复制 assets 目录
echo "🎨 复制 assets 目录到 dist..."
cp -r assets dist/assets

# 4. 复制 package.json 到layer层
echo "📦 复制 package.json 到layer层..."
cp package.json layer/nodejs

echo "✅ 构建完成！"
