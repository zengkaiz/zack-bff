import { addAliases } from 'module-alias';
// 还必须加到前面 ！！
addAliases({
  '@root': __dirname,
  '@interface': `${__dirname}/interface`,
  '@config': `${__dirname}/config`,
  '@middlewares': `${__dirname}/middlewares`,
});
import config from '@config/index';
import render from '@koa/ejs';
import ErrorHandler from '@middlewares/ErrorHandler';
import { Lifetime, createContainer } from 'awilix';
import { loadControllers, scopePerRequest } from 'awilix-koa';
import Koa from 'koa';
import { configure, getLogger } from 'log4js';
import serve from 'koa-static';

const { port, viewDir, memoryFlag, staticDir } = config;

const app = new Koa();
// 静态文件生效节点
app.use(serve(staticDir));
// 日志系统
configure({
  appenders: {
    app: { type: 'file', filename: `${__dirname}/logs/info.log` },
  },
  categories: {
    default: { appenders: ['app'], level: 'error' },
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

app.listen(port, () => {
  console.log(`Server is runing ${port}`);
});
