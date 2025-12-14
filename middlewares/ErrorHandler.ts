import type Koa from 'koa';
import type { Logger } from 'log4js';

class ErrorHandler {
  // 404 和 500
  static error(app: Koa, logger: Logger) {
    // 500 错误处理（需要在最前面，才能捕获所有错误）
    app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        logger.error(err);
        const error = err as Error & { status?: number };
        ctx.status = error.status || 500;
        ctx.body = await ctx.render('500', {
          error: {
            message: error.message || 'Internal Server Error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          },
          isDevelopment: process.env.NODE_ENV === 'development',
        });
      }
    });
    // 404
    app.use(async (ctx, next) => {
      await next();
      if (ctx.status === 404) {
        ctx.status = 404;
        ctx.body = await ctx.render('404');
      }
    });
  }
  static error500(app: Koa, logger: Logger) {
    app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        logger.error(err);
        const error = err as Error & { status?: number };
        // 设置状态码
        ctx.status = error.status || 500;
        // 构建错误信息
        const errorMessage = error.stack;
        await ctx.render('500', {
          errorMessage,
        });
      }
    });
  }
}

export default ErrorHandler;
