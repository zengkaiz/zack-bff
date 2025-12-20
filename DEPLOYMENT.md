# AWS SAM 部署指南

## 架构说明

此配置会自动创建以下资源：

### 网络架构
- **VPC**: 10.0.0.0/16
- **公有子网**: 1个 (10.0.1.0/24) - 用于NAT Gateway
- **私有子网**: 3个 (10.0.11-13.0/24) - 用于Lambda和RDS
- **NAT Gateway**: 使Lambda可以访问外网
- **Internet Gateway**: 公有子网访问互联网

### 数据库
- **引擎**: PostgreSQL 16.4
- **实例**: db.t3.micro (免费套餐)
- **存储**: 20GB gp3
- **数据库名**: zack_db_1
- **备份**: 7天保留期
- **位置**: 私有子网，不可公开访问

### Lambda函数
- **运行时**: Node.js 20.x (ARM64)
- **内存**: 3008 MB
- **超时**: 30秒
- **网络**: 部署在3个私有子网
- **访问**: 通过安全组访问RDS
- **依赖管理**: 使用Lambda Layer分离代码和依赖
  - **应用代码** (dist/): < 10 MB
  - **依赖层** (layer/): 仅生产依赖，优化后 < 100 MB

### 包大小优化

AWS Lambda 限制：
- 未压缩部署包：**250 MB**
- 压缩部署包：**50 MB**
- Lambda Layer：**250 MB**（未压缩）

本项目采用以下优化策略：
1. ✅ 使用 Lambda Layer 分离应用代码和依赖
2. ✅ 仅安装生产依赖（`--prod`）
3. ✅ 排除可选依赖（`--no-optional`）
4. ✅ Prisma 仅包含 ARM64 Linux 二进制文件
5. ✅ 使用 pnpm 减少重复依赖

## 部署步骤

### 1. 安装依赖

```bash
# 安装项目依赖（开发+生产）
pnpm install
```

### 2. 构建和部署

**方式一：使用自动化脚本（推荐）**

```bash
# 首次部署 - production 环境
./lambda-build.sh production

# 或 development 环境（本地测试）
./lambda-build.sh development

# 或 test 环境
./lambda-build.sh test
```

**方式二：手动部署**

```bash
# 测试构建大小（不部署）
chmod +x test-build-size.sh
./test-build-size.sh

# 如果大小符合要求，执行完整部署
./lambda-build.sh production
```

### 3. 首次部署配置

首次运行 `./lambda-build.sh production` 时，SAM CLI 会引导配置：

部署过程中会要求输入：

- **Stack Name**: 输入堆栈名称，如 `zack-mpa-bff-prod`
- **AWS Region**: 选择区域，如 `us-east-1`
- **DBUsername**: 数据库用户名（默认: zackadmin）
- **DBPassword**: 数据库密码（至少8位，只能包含字母和数字）
- **Confirm changes before deploy**: Y（建议）
- **Allow SAM CLI IAM role creation**: Y
- **Disable rollback**: N
- **KoaFunction has no authentication**: Y
- **Save arguments to configuration file**: Y

### 4. 后续部署

配置保存后，后续部署只需：

```bash
./lambda-build.sh production
```

或者手动执行：

```bash
# 清理并构建
./build.sh  # 编译 TypeScript 和复制资源
./test-build-size.sh  # 验证包大小

# 部署
sam build --skip-pull-image
sam deploy
```

如需修改数据库密码：

```bash
sam deploy --parameter-overrides DBPassword=新密码
```

### 5. 构建脚本说明

**lambda-build.sh** - 完整构建和部署流程
```bash
./lambda-build.sh [environment]
# environment: development | production | test
```

该脚本会：
1. 清理旧的构建文件（dist/, layer/, .aws-sam/）
2. 编译 TypeScript 代码到 dist/
3. 复制静态资源（views/, assets/）
4. 在 layer/ 中安装生产依赖
5. 生成 Prisma Client
6. 显示大小统计和警告
7. 执行 sam build 和部署

**build.sh** - 仅编译代码（不安装依赖）
```bash
./build.sh
```

用于快速编译 TypeScript 和复制资源文件。

**test-build-size.sh** - 测试构建大小
```bash
./test-build-size.sh
```

只构建不部署，用于验证包大小是否符合 AWS Lambda 限制。

## 部署时间

- **首次部署**: 约15-20分钟（主要是RDS创建时间）
- **后续部署**: 约2-5分钟

## 部署后验证

部署完成后，SAM会输出以下信息：

```
Outputs:
  ApiEndpoint: https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
  DatabaseEndpoint: xxxxx.rds.amazonaws.com
  DatabasePort: 5432
  DatabaseName: zack_db_1
```

测试API：

```bash
curl https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/health
```

## 成本估算

**免费套餐内**（首年）：
- RDS db.t3.micro: 免费750小时/月
- Lambda: 免费100万次请求/月
- NAT Gateway: **约$32/月**（不在免费套餐）
- 数据传输: 部分免费

**主要费用**：NAT Gateway是最大的固定成本

## 数据库连接

Lambda函数会自动获得以下环境变量：

```
DATABASE_URL=postgresql://zackadmin:密码@数据库地址:5432/zack_db_1?schema=public
NODE_ENV=production
```

你的应用代码无需修改，直接使用 `process.env.DATABASE_URL` 即可。

## 常见问题

### Q1: 部署包超过 250MB 怎么办？

如果看到 "Layer size exceeds 250MB" 警告：

1. **检查生产依赖**
   ```bash
   # 查看最大的依赖包
   du -h layer/nodejs/node_modules/.pnpm | sort -hr | head -20
   ```

2. **移除不必要的依赖**
   - 检查 package.json 是否有可以移除的包
   - 确认 devDependencies 不会被安装到 layer

3. **进一步优化 Prisma**
   ```prisma
   // schema.prisma 只保留需要的平台
   generator client {
     provider = "prisma-client-js"
     binaryTargets = ["linux-arm64-openssl-3.0.x"]  // 移除 "native"
   }
   ```

4. **使用 npm 替代 pnpm**（如果 pnpm 导致问题）
   ```bash
   # 在 lambda-build.sh 中替换 pnpm 为 npm
   npm install --production --no-optional
   ```

### Q2: 首次调用Lambda很慢？
A: Lambda在VPC中首次启动需要创建ENI（弹性网络接口），可能需要几秒。后续调用会很快。

### Q3: 如何连接到数据库调试？
A: 数据库在私有子网，不能直接连接。有两种方案：
1. 创建一个Bastion主机（EC2）在公有子网
2. 使用AWS Systems Manager Session Manager

### Q4: 如何删除所有资源？
```bash
sam delete
```

**注意**：删除堆栈前会自动创建RDS快照（DeletionPolicy: Snapshot）

### Q5: Lambda超时怎么办？
增加Timeout值（在template.yaml的KoaFunction.Properties.Timeout）

### Q6: 如何查看日志？
```bash
sam logs -n KoaFunction --tail
```

### Q7: Prisma Client 生成错误？
```bash
# 手动重新生成
pnpm exec prisma generate

# 清理并重新构建
rm -rf node_modules/.prisma
pnpm install
```

## 安全建议

1. ✅ 数据库密码使用强密码
2. ✅ 不要在代码中硬编码密码
3. ✅ 生产环境建议使用AWS Secrets Manager存储密码
4. ✅ 定期更新数据库密码
5. ✅ 启用CloudWatch日志监控

## 监控

CloudWatch自动收集以下指标：
- Lambda调用次数、错误率、持续时间
- RDS CPU、内存、连接数
- PostgreSQL日志

查看日志：
```bash
# Lambda日志
sam logs -n KoaFunction --tail

# RDS日志在CloudWatch Logs中查看
```

## 更新策略

Lambda使用 `AutoPublishAlias: live` 配置：
- 每次部署自动创建新版本
- 流量立即切换到新版本
- 可以快速回滚到之前版本



Outputs                                                                                                                                                           
-------------------------------------------------------------------------------------------------------------------------------------------------------------------
Key                 PrivateSubnetIds                                                                                                                              
Description         Private subnet IDs                                                                                                                            
Value               subnet-0a560650fe97b06c1,subnet-003f7faaf76153a72,subnet-04714350789d9138d                                                                    

Key                 FunctionArn                                                                                                                                   
Description         Lambda Function ARN                                                                                                                           
Value               arn:aws:lambda:us-east-1:548620910613:function:zack-mpa-bff-prod-KoaFunction-YAnNE8ri6qxp                                                     

Key                 DatabasePort                                                                                                                                  
Description         PostgreSQL database port                                                                                                                      
Value               5432                                                                                                                                          

Key                 VPCId                                                                                                                                         
Description         VPC ID                                                                                                                                        
Value               vpc-0794441bee64bc94f                                                                                                                         

Key                 DatabaseName                                                                                                                                  
Description         Database name                                                                                                                                 
Value               zack_db_1                                                                                                                                     

Key                 ApiEndpoint                                                                                                                                   
Description         API Gateway endpoint URL                                                                                                                      
Value               https://nvdv338g40.execute-api.us-east-1.amazonaws.com/dev                                                                                    

Key                 DatabaseEndpoint                                                                                                                              
Description         PostgreSQL database endpoint                                                                                                                  
Value               zack-mpa-bff-prod-postgres.cah6icmg6f1j.us-east-1.rds.amazonaws.com  