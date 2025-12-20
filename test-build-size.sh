#!/bin/bash

# 测试构建脚本 - 只构建不部署，用于验证包大小

set -e

echo "🧹 Cleaning up old build files..."
rm -rf dist/
rm -rf layer/

echo "📁 Creating directories..."
mkdir -p dist/
mkdir -p layer/nodejs/

# 1. 编译 TypeScript
echo "📦 Compiling TypeScript..."
pnpm exec tsc

# 1.5 转换路径别名为相对路径
echo "🔄 Resolving path aliases..."
pnpm exec tsc-alias

# 2. 复制静态资源到 dist
echo "📋 Copying static assets to dist..."
cp -r views dist/views
cp -r assets dist/assets

# 3. 创建精简的 package.json 用于 Lambda Layer
echo "📦 Creating minimal package.json for Lambda layer..."
cat > layer/nodejs/package.json << 'EOF'
{
  "name": "lambda-layer-dependencies",
  "version": "1.0.0",
  "dependencies": {
    "@koa/ejs": "^5.1.0",
    "@prisma/client": "6",
    "awilix": "^12.0.5",
    "awilix-koa": "^11.1.0",
    "dotenv": "^17.2.3",
    "koa": "^3.1.1",
    "koa-bodyparser": "^4.4.1",
    "koa-static": "^5.0.0",
    "lodash": "^4.17.21",
    "log4js": "^6.9.1",
    "module-alias": "^2.2.3",
    "serverless-http": "^4.0.0"
  }
}
EOF

cd layer/nodejs

# 使用 npm 安装（比 pnpm 的目录结构更小）
echo "⬇️  Installing production dependencies with npm..."
npm install --omit=dev --omit=optional --omit=peer --legacy-peer-deps

# 临时安装 prisma CLI 用于生成 Prisma Client
echo "🔧 Installing prisma CLI temporarily..."
npm install prisma@6 --no-save

# 生成 Prisma Client
if [ -d "../../prisma" ]; then
    echo "🔧 Generating Prisma Client..."
    # 复制 schema 到当前目录
    mkdir -p prisma
    cp ../../prisma/schema.prisma prisma/schema.prisma
    # 生成 Prisma Client
    npx prisma generate
    # 清理 schema
    rm -rf prisma
fi

# 清理不必要的包和文件
echo "🧹 Removing unnecessary packages..."
# 删除大型 devDependencies（如果被间接引入或临时安装的）
rm -rf node_modules/prisma 2>/dev/null || true
rm -rf node_modules/typescript 2>/dev/null || true
rm -rf node_modules/@biomejs 2>/dev/null || true
rm -rf node_modules/prettier 2>/dev/null || true
rm -rf node_modules/@types 2>/dev/null || true
rm -rf node_modules/ts-node-dev 2>/dev/null || true
rm -rf node_modules/ts-node 2>/dev/null || true
rm -rf node_modules/fast-check 2>/dev/null || true
rm -rf node_modules/effect 2>/dev/null || true

# 清理 .bin 目录中断开的符号链接
echo "🧹 Cleaning up broken symlinks in .bin..."
rm -f node_modules/.bin/prisma 2>/dev/null || true
rm -f node_modules/.bin/tsc 2>/dev/null || true
rm -f node_modules/.bin/tsserver 2>/dev/null || true
rm -f node_modules/.bin/prettier 2>/dev/null || true
rm -f node_modules/.bin/biome 2>/dev/null || true

# 清理 Prisma 中不需要的引擎文件（只保留 linux-arm64）
echo "🧹 Cleaning up Prisma engines..."
find node_modules/@prisma -type f -name "*.node" ! -name "*linux-arm64*" -delete 2>/dev/null || true
find node_modules/@prisma -type f -name "*.dylib" -delete 2>/dev/null || true
find node_modules/@prisma -type f -name "*.dll" -delete 2>/dev/null || true
find node_modules/.prisma -type f -name "*.node" ! -name "*linux-arm64*" -delete 2>/dev/null || true
find node_modules/.prisma -type f -name "*.dylib" -delete 2>/dev/null || true

echo "🧹 Cleaning up unnecessary files..."
find node_modules -name "*.md" -delete 2>/dev/null || true
find node_modules -name "*.ts" -not -name "*.d.ts" -delete 2>/dev/null || true
find node_modules -name "*.map" -delete 2>/dev/null || true
find node_modules -name "*.test.js" -delete 2>/dev/null || true
find node_modules -name "*.spec.js" -delete 2>/dev/null || true
find node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "examples" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "docs" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "*.txt" -delete 2>/dev/null || true
find node_modules -name "LICENSE*" -delete 2>/dev/null || true
find node_modules -name "CHANGELOG*" -delete 2>/dev/null || true

cd ../..

# 4. 显示详细大小统计
echo ""
echo "═══════════════════════════════════════"
echo "📊 BUILD SIZE ANALYSIS"
echo "═══════════════════════════════════════"
echo ""
echo "📦 Application code (dist/):"
du -sh dist/
echo ""
echo "📂 Dist breakdown:"
du -sh dist/* 2>/dev/null | sort -hr
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Dependencies layer (layer/):"
du -sh layer/
echo ""
echo "📦 Top 15 largest dependencies:"
du -sh layer/nodejs/node_modules/* 2>/dev/null | sort -hr | head -15
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查大小限制
LAYER_SIZE=$(du -sm layer/ | cut -f1)
DIST_SIZE=$(du -sm dist/ | cut -f1)

echo "📏 Size check against AWS Lambda limits:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Layer size:       ${LAYER_SIZE}MB / 250MB limit"
echo "Application size: ${DIST_SIZE}MB / 250MB limit"
echo ""

if [ $LAYER_SIZE -gt 250 ]; then
    echo "❌ ERROR: Layer exceeds 250MB limit!"
    exit 1
elif [ $LAYER_SIZE -gt 240 ]; then
    echo "⚠️  WARNING: Layer size is close to limit!"
elif [ $LAYER_SIZE -gt 200 ]; then
    echo "⚡ Layer size is acceptable but consider optimization"
else
    echo "✅ Layer size is good!"
fi

if [ $DIST_SIZE -gt 250 ]; then
    echo "❌ ERROR: Application exceeds 250MB limit!"
    exit 1
else
    echo "✅ Application size is good!"
fi

echo ""
echo "═══════════════════════════════════════"
echo "✅ Build test complete!"
echo "═══════════════════════════════════════"
