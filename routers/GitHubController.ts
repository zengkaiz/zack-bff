import { POST, route } from 'awilix-koa';
import type { Context } from 'koa';
import type GitHubService from '../services/GitHubService';

@route('/api/github')
class GitHubController {
  private gitHubService: GitHubService;

  constructor({ gitHubService }: { gitHubService: GitHubService }) {
    this.gitHubService = gitHubService;
  }

  @route('/user')
  @POST()
  async getUserInfo(ctx: Context) {
    try {
      const { token } = ctx.request.body as { token?: string };

      if (!token) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'GitHub token is required',
        };
        return;
      }

      // 简单的 token 格式验证（GitHub tokens 通常是 40 字符）
      if (token.trim().length === 0) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Invalid token format',
        };
        return;
      }

      const userInfo = await this.gitHubService.getUserInfo(token);

      ctx.body = {
        success: true,
        data: userInfo,
        message: 'GitHub user info retrieved successfully',
      };
    } catch (error: any) {
      console.error('Error fetching GitHub user info:', error);

      if (error.message.includes('Invalid or expired')) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'Invalid or expired GitHub token',
        };
      } else if (error.message.includes('rate limit')) {
        ctx.status = 429;
        ctx.body = {
          success: false,
          message: 'GitHub API rate limit exceeded',
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'Failed to retrieve GitHub user information',
        };
      }
    }
  }
}

export default GitHubController;
