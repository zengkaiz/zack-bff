# 数据库配置和部署指南

## 📋 目录
1. [本地开发配置](#本地开发配置)
2. [生产环境配置（阿里云）](#生产环境配置阿里云)
3. [常用命令](#常用命令)
4. [测试 API](#测试-api)
5. [故障排查](#故障排查)

---

## 本地开发配置

### 1. 安装 PostgreSQL

#### macOS
```bash
# 使用 Homebrew 安装
brew install postgresql@15

# 启动服务
brew services start postgresql@15

# 创建数据库
createdb zack_mpa_db
```

### 2. 配置环境变量

编辑 `.env` 文件：
```env
DATABASE_URL="postgresql://username:password@localhost:5432/zack_mpa_db?schema=public"
NODE_ENV="development"
PORT=80
```

**替换以下内容**：
- `username`: 你的 PostgreSQL 用户名（默认是 `postgres`）
- `password`: 你的 PostgreSQL 密码
- `localhost`: 本地开发使用 localhost
- `5432`: PostgreSQL 默认端口
- `zack_mpa_db`: 数据库名称

### 3. 生成 Prisma Client 并运行迁移

```bash
# 生成 Prisma Client
pnpm prisma:generate

# 创建数据库表（首次运行）
pnpm prisma:migrate

# 输入迁移名称，例如：init
```

### 4. 启动开发服务器

```bash
pnpm dev
```

服务器将在 http://localhost:80 启动

### 5. 查看数据库（可选）

```bash
# 打开 Prisma Studio - 可视化数据库管理工具
pnpm prisma:studio
```

在浏览器中访问 http://localhost:5555 查看和编辑数据。

---

## 生产环境配置（阿里云）

### 方案一：使用阿里云 RDS（推荐）

#### 1. 购买阿里云 RDS PostgreSQL 实例

1. 登录阿里云控制台
2. 选择 **云数据库 RDS** > **PostgreSQL**
3. 创建实例：
   - 版本：PostgreSQL 15
   - 规格：根据需求选择（最小 1C2G）
   - 存储：20GB 起步
   - 网络：VPC（与 ECS 同一个 VPC）

#### 2. 配置 RDS

1. **设置白名单**：
   - 添加 ECS 内网 IP
   - 如需公网访问（不推荐生产环境），添加 0.0.0.0/0

2. **创建数据库**：
   ```sql
   CREATE DATABASE zack_mpa_db;
   ```

3. **创建用户**（可选，或使用默认账号）：
   ```sql
   CREATE USER zack_user WITH PASSWORD 'your_strong_password';
   GRANT ALL PRIVILEGES ON DATABASE zack_mpa_db TO zack_user;
   ```

#### 3. 在 ECS 上配置环境变量

SSH 登录到阿里云 ECS：

```bash
# 编辑环境变量文件
cd /path/to/your/zack-mpa-bff
nano .env
```

配置生产环境数据库连接：
```env
# 使用 RDS 内网地址（性能更好）
DATABASE_URL="postgresql://username:password@rm-xxx.mysql.rds.aliyuncs.com:5432/zack_mpa_db?schema=public"
NODE_ENV="production"
PORT=80
```

**替换以下内容**：
- `username`: RDS 数据库用户名
- `password`: RDS 数据库密码
- `rm-xxx.mysql.rds.aliyuncs.com`: RDS 内网连接地址（在 RDS 控制台查看）
- `5432`: PostgreSQL 端口

#### 4. 运行数据库迁移

```bash
# 生成 Prisma Client
pnpm prisma:generate

# 部署迁移（生产环境）
pnpm prisma:deploy
```

#### 5. 启动生产服务

```bash
# 使用 PM2 启动
pnpm pm2:start

# 查看状态
pnpm pm2:status

# 查看日志
pnpm pm2:logs
```

### 方案二：在 ECS 上自建 PostgreSQL

如果不想购买 RDS，可以在 ECS 上安装 PostgreSQL：

```bash
# 安装 PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# 配置允许远程连接（如需要）
sudo nano /etc/postgresql/15/main/postgresql.conf
# 修改 listen_addresses = 'localhost' 为 listen_addresses = '*'

sudo nano /etc/postgresql/15/main/pg_hba.conf
# 添加：host all all 0.0.0.0/0 md5

# 重启服务
sudo systemctl restart postgresql

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE zack_mpa_db;
CREATE USER zack_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE zack_mpa_db TO zack_user;
\q
```

然后配置 `.env`：
```env
DATABASE_URL="postgresql://zack_user:your_password@localhost:5432/zack_mpa_db?schema=public"
```

---

## 常用命令

### Prisma 命令

```bash
# 生成 Prisma Client（修改 schema.prisma 后必须运行）
pnpm prisma:generate

# 创建新的迁移（开发环境）
pnpm prisma:migrate

# 部署迁移（生产环境）
pnpm prisma:deploy

# 重置数据库（删除所有数据并重新运行迁移）
pnpm prisma:reset

# 打开 Prisma Studio（数据库可视化工具）
pnpm prisma:studio

# 查看 Prisma 版本
npx prisma -v

# 格式化 schema.prisma 文件
npx prisma format
```

### PM2 命令

```bash
# 启动应用
pnpm pm2:start

# 停止应用
pnpm pm2:stop

# 重启应用
pnpm pm2:restart

# 删除应用
pnpm pm2:delete

# 查看日志
pnpm pm2:logs

# 查看状态
pnpm pm2:status
```

---

## 测试 API

### 使用 curl 测试

#### 1. 创建联系人
```bash
curl -X POST http://localhost/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "email": "zhangsan@example.com"
  }'
```

**预期响应**：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "张三",
    "email": "zhangsan@example.com",
    "createdAt": "2024-12-15T12:00:00.000Z",
    "updatedAt": "2024-12-15T12:00:00.000Z"
  },
  "message": "Contact created successfully"
}
```

#### 2. 获取所有联系人
```bash
curl http://localhost/api/contacts
```

#### 3. 获取单个联系人
```bash
curl http://localhost/api/contacts/1
```

### 使用 Postman 测试

1. **创建联系人**
   - Method: `POST`
   - URL: `http://localhost/api/contacts`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
     ```json
     {
       "name": "李四",
       "email": "lisi@example.com"
     }
     ```

2. **获取联系人列表**
   - Method: `GET`
   - URL: `http://localhost/api/contacts`

---

## 故障排查

### 问题 1: 连接数据库失败

**错误信息**：
```
Error: P1001: Can't reach database server at `localhost`:`5432`
```

**解决方法**：
1. 确认 PostgreSQL 服务正在运行：
   ```bash
   # macOS
   brew services list

   # Linux
   sudo systemctl status postgresql
   ```

2. 检查 `.env` 文件中的 `DATABASE_URL` 是否正确

3. 测试数据库连接：
   ```bash
   psql -h localhost -U username -d zack_mpa_db
   ```

### 问题 2: 邮箱唯一约束错误

**错误信息**：
```json
{
  "success": false,
  "message": "Email already exists"
}
```

**原因**：该邮箱已经存在于数据库中

**解决方法**：使用不同的邮箱地址

### 问题 3: Prisma Client 未生成

**错误信息**：
```
Error: @prisma/client did not initialize yet
```

**解决方法**：
```bash
pnpm prisma:generate
```

### 问题 4: 迁移失败

**错误信息**：
```
Error: Migration failed
```

**解决方法**：
1. 检查数据库连接
2. 确认数据库用户有足够的权限
3. 如果是开发环境，可以重置数据库：
   ```bash
   pnpm prisma:reset
   ```

### 问题 5: 生产环境端口冲突

**解决方法**：
修改 `.env` 中的 `PORT` 配置，然后重启应用：
```bash
pnpm pm2:restart
```

---

## 数据库备份（生产环境）

### 备份数据库

```bash
# 使用 pg_dump 备份
pg_dump -h your-rds-host.aliyuncs.com -U username -d zack_mpa_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 恢复数据库

```bash
# 恢复备份
psql -h your-rds-host.aliyuncs.com -U username -d zack_mpa_db < backup_20241215_120000.sql
```

### 自动备份脚本（可选）

创建备份脚本 `backup.sh`：
```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h your-rds-host -U username -d zack_mpa_db > "$BACKUP_DIR/backup_$DATE.sql"

# 删除7天前的备份
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

添加到 crontab（每天凌晨2点备份）：
```bash
crontab -e
# 添加：
0 2 * * * /path/to/backup.sh
```

---

## 安全建议

1. **不要将 `.env` 文件提交到 Git**
   - 已在 `.gitignore` 中配置

2. **使用强密码**
   - 数据库密码至少 12 位
   - 包含大小写字母、数字和特殊字符

3. **限制数据库访问**
   - 生产环境使用 RDS 内网地址
   - 配置 IP 白名单

4. **定期更新依赖**
   ```bash
   pnpm update
   ```

5. **监控数据库性能**
   - 使用阿里云 RDS 监控功能
   - 设置告警规则

---

## 下一步

- 查看 [FRONTEND_EXAMPLE.md](./FRONTEND_EXAMPLE.md) 了解前端集成示例
- 根据需求扩展数据库 Schema
- 添加更多业务逻辑和接口

有问题？查看 Prisma 官方文档：https://www.prisma.io/docs
