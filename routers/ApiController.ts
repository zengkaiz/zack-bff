import type { IApi } from '@interface/IApi';
import { GET, route } from 'awilix-koa';
import type { Context } from 'koa';

@route('/api')
class ApiController {
  public apiService: IApi;
  // 面向切面编程
  constructor({ apiService }: { apiService: IApi }) {
    this.apiService = apiService;
  }

  @route('/list')
  @GET()
  async actionList(ctx: Context) {
    const data = await this.apiService.getInfo();
    ctx.body = {
      success: true,
      data: data.result,
    };
  }
}

export default ApiController;
