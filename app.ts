import { config as dotenvConfig } from 'dotenv';
// 加载环境变量，必须在最前面
dotenvConfig();

import config from '@config/index';
import render from '@koa/ejs';
import ErrorHandler from '@middlewares/ErrorHandler';
import { Lifetime, createContainer } from 'awilix';
import { loadControllers, scopePerRequest } from 'awilix-koa';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import { configure, getLogger } from 'log4js';
import { addAliases } from 'module-alias';
// 还必须加到前面 ！！
addAliases({
  '@root': __dirname,
  '@interface': `${__dirname}/interface`,
  '@config': `${__dirname}/config`,
  '@middlewares': `${__dirname}/middlewares`,
});

const { port, viewDir, memoryFlag, staticDir } = config;

const app = new Koa();
// 静态文件生效节点
app.use(serve(staticDir));
// 请求体解析中间件
app.use(bodyParser());
// 日志系统 - Lambda 环境使用 console，本地环境使用文件
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
configure({
  appenders: {
    console: { type: 'console' },
    file: {
      type: 'file',
      filename: isLambda ? '/tmp/info.log' : `${__dirname}/logs/info.log`
    },
  },
  categories: {
    default: {
      appenders: [isLambda ? 'console' : 'file'],
      level: 'error'
    },
  },
});
const logger = getLogger();
ErrorHandler.error(app, logger);

const container = createContainer();
// 根据环境决定文件扩展名
const isProduction = process.env.NODE_ENV === 'production';
// 生产环境只扫描 .js 文件，开发环境扫描 .ts 和 .js 文件
// 避免扫描 .d.ts 类型定义文件
const fileExt = isProduction ? 'js' : '{ts,js}';
// 把所有的可以被注入的代码都在container中注册
container.loadModules([`${__dirname}/services/**/*.${fileExt}`], {
  formatName: 'camelCase',
  resolverOptions: {
    // 1. 每次都new 2. 单例
    lifetime: Lifetime.SCOPED,
  },
});

// 调试：打印已注册的服务
console.log('Registered services:', Object.keys(container.registrations));

// 把路由和容器进行关联
app.use(scopePerRequest(container));

render(app, {
  root: viewDir,
  layout: false,
  viewExt: 'html',
  cache: memoryFlag,
  debug: false,
});

// 把所有的路由全部load进来
app.use(loadControllers(`${__dirname}/routers/**/*.${fileExt}`));
// serverless 不需要这里启动服务
if (process.env.NODE_ENV === 'development') {
  // ECS EC2 本地运行listen
  app.listen(port, () => {
    console.log(`Server is runing ${port}`);
  });
}

export default app;
