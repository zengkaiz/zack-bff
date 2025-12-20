interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  hireable: boolean | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

interface IGetHubService {
  getUserInfo(token: string): Promise<GitHubUser>;
}

class GitHubService implements IGetHubService {
  private readonly GITHUB_API_BASE = 'https://api.github.com';

  constructor() {
    console.log('GitHubService initialized');
  }

  async getUserInfo(token: string): Promise<GitHubUser> {
    try {
      const response = await fetch(`${this.GITHUB_API_BASE}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Node.js'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid or expired GitHub token');
        }
        if (response.status === 403) {
          throw new Error('GitHub API rate limit exceeded');
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const userData = await response.json() as GitHubUser;
      return userData;
    } catch (error: any) {
      if (error.message.includes('GitHub')) {
        throw error;
      }
      throw new Error(`Failed to fetch GitHub user info: ${error.message}`);
    }
  }
}

export default GitHubService;
