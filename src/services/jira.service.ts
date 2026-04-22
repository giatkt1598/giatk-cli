import { appSettings } from "../infrastructures/get-settings.js";
import { Helper } from "../utilities/helper.js";
import { useCommand } from "../utilities/use-command.js";

export interface PullRequestLink {
  number: number | null;
  title: string;
  url: string;
  state: string;
  repository: string;
  source: "jira-api" | "github-cli";
}

interface JiraIssueResponse {
  id?: string;
}

interface JiraDevStatusResponse {
  detail?: JiraDevStatusDetail[];
}

interface JiraDevStatusDetail {
  pullRequests?: JiraPullRequest[];
}

interface JiraPullRequest {
  id?: string | number;
  name?: string;
  url?: string;
  status?: string;
  author?: {
    name?: string;
  };
  source?: {
    branch?: string;
  };
  destination?: {
    branch?: string;
  };
}

interface GitHubPullRequestRecord {
  number?: number;
  title?: string;
  url?: string;
  state?: string;
  repository?: {
    nameWithOwner?: string;
  };
}

type FetchLike = typeof fetch;
type ExecLike = (command: string) => Promise<string>;

interface JiraServiceOptions {
  fetchFn?: FetchLike;
  execFn?: ExecLike;
}

class JiraDevelopmentDataError extends Error {}

export class JiraService {
  private readonly fetchFn: FetchLike;
  private readonly execFn: ExecLike;

  constructor(options: JiraServiceOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.execFn = options.execFn ?? useCommand({ cwd: Helper.getProjectRoot() }).exec;
  }

  async getPullRequestsByTicketKey(ticketKey: string): Promise<PullRequestLink[]> {
    const normalizedTicketKey = ticketKey.trim().toUpperCase();
    this.validateTicketKey(normalizedTicketKey);

    let jiraError: Error | undefined;
    try {
      const jiraPullRequests = await this.getPullRequestsFromJira(normalizedTicketKey);
      if (jiraPullRequests.length > 0) {
        return jiraPullRequests;
      }
    } catch (error) {
      if (!(error instanceof JiraDevelopmentDataError)) {
        throw error;
      }

      jiraError = error;
    }

    if (!this.shouldUseGitHubCliFallback()) {
      if (jiraError) {
        throw jiraError;
      }

      return [];
    }

    const githubPullRequests = await this.getPullRequestsFromGitHubCli(normalizedTicketKey);
    if (githubPullRequests.length > 0) {
      return githubPullRequests;
    }

    if (jiraError) {
      throw jiraError;
    }

    return [];
  }

  private validateTicketKey(ticketKey: string) {
    if (!ticketKey) {
      throw new Error("Ticket key is required.");
    }

    if (!/^[A-Z][A-Z0-9_]*-\d+$/u.test(ticketKey)) {
      throw new Error(`Invalid ticket key "${ticketKey}". Expected format like GIA-15.`);
    }
  }

  private get jiraConfig() {
    return appSettings.Jira;
  }

  private get githubConfig() {
    return appSettings.GitHub;
  }

  private hasJiraConfig() {
    return !!(this.jiraConfig?.baseUrl && this.jiraConfig?.email && this.jiraConfig?.token);
  }

  private shouldUseGitHubCliFallback() {
    return !!(this.githubConfig?.owner && this.githubConfig?.useCliFallback !== false);
  }

  private async getPullRequestsFromJira(ticketKey: string): Promise<PullRequestLink[]> {
    if (!this.hasJiraConfig()) {
      return [];
    }

    const issueId = await this.getJiraIssueId(ticketKey);
    const devStatusResponse = await this.getJiraDevStatus(issueId);
    return devStatusResponse.detail
      ?.flatMap((detail) => detail.pullRequests ?? [])
      .map((pullRequest) => this.mapJiraPullRequest(pullRequest))
      .filter((pullRequest): pullRequest is PullRequestLink => pullRequest !== null) ?? [];
  }

  private async getJiraIssueId(ticketKey: string) {
    const baseUrl = this.jiraConfig?.baseUrl?.replace(/\/+$/u, "");
    const email = this.jiraConfig?.email ?? "";
    const token = this.jiraConfig?.token ?? "";
    const authHeader = Buffer.from(`${email}:${token}`).toString("base64");
    const response = await this.fetchFn(`${baseUrl}/rest/api/3/issue/${encodeURIComponent(ticketKey)}?fields=none`, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${authHeader}`,
      },
    });

    if (response.status === 404) {
      throw new Error(`Jira ticket "${ticketKey}" was not found.`);
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(`Failed to access Jira ticket "${ticketKey}". Check Jira credentials and permissions.`);
    }

    if (!response.ok) {
      throw new Error(`Jira API request failed with status ${response.status}.`);
    }

    const issue = (await response.json()) as JiraIssueResponse;
    if (!issue.id) {
      throw new Error(`Jira ticket "${ticketKey}" did not return an issue id.`);
    }

    return issue.id;
  }

  private async getJiraDevStatus(issueId: string) {
    const baseUrl = this.jiraConfig?.baseUrl?.replace(/\/+$/u, "");
    const email = this.jiraConfig?.email ?? "";
    const token = this.jiraConfig?.token ?? "";
    const authHeader = Buffer.from(`${email}:${token}`).toString("base64");
    const response = await this.fetchFn(`${baseUrl}/rest/dev-status/latest/issue/details?issueId=${encodeURIComponent(issueId)}&dataType=pullrequest`, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${authHeader}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      throw new JiraDevelopmentDataError("Failed to access Jira development data. Check Jira permissions for linked development information.");
    }

    if (!response.ok) {
      throw new JiraDevelopmentDataError(`Jira development data request failed with status ${response.status}.`);
    }

    return (await response.json()) as JiraDevStatusResponse;
  }

  private mapJiraPullRequest(pullRequest: JiraPullRequest): PullRequestLink | null {
    const url = pullRequest.url?.trim();
    if (!url) {
      return null;
    }

    const githubPullRequestMatch = url.match(/^https:\/\/github\.com\/(?<owner>[^/]+)\/(?<repo>[^/]+)\/pull\/(?<number>\d+)(?:[/?#].*)?$/u);
    if (!githubPullRequestMatch?.groups) {
      return null;
    }

    const repository = `${githubPullRequestMatch.groups.owner}/${githubPullRequestMatch.groups.repo}`;
    const number = Number(githubPullRequestMatch.groups.number);
    const title = pullRequest.name?.trim() || `PR #${number}`;
    const state = this.normalizeStateFromJiraPullRequest(pullRequest);

    return {
      number: Number.isFinite(number) ? number : null,
      title,
      url,
      state,
      repository,
      source: "jira-api",
    };
  }

  private normalizeStateFromJiraPullRequest(pullRequest: JiraPullRequest) {
    return pullRequest.status?.trim().toUpperCase() || "UNKNOWN";
  }

  private async getPullRequestsFromGitHubCli(ticketKey: string): Promise<PullRequestLink[]> {
    const owner = this.githubConfig?.owner?.trim();
    if (!owner) {
      return [];
    }

    const pullRequests = await this.searchPullRequestsForOwner(owner, ticketKey);
    const uniqueByUrl = new Map<string, PullRequestLink>();
    for (const pullRequest of pullRequests) {
      uniqueByUrl.set(pullRequest.url, pullRequest);
    }

    return [...uniqueByUrl.values()];
  }

  private async searchPullRequestsForOwner(owner: string, ticketKey: string): Promise<PullRequestLink[]> {
    const command = `gh search prs "${ticketKey}" --owner "${owner}" --state all --archived=false --limit 1000 --json number,title,url,state,repository`;
    const raw = await this.execFn(command);
    const records = JSON.parse(raw) as GitHubPullRequestRecord[];

    return records
      .map((record) => ({
        number: typeof record.number === "number" ? record.number : null,
        title: record.title?.trim() || `PR #${record.number ?? "unknown"}`,
        url: record.url?.trim() || "",
        state: record.state?.trim().toUpperCase() || "UNKNOWN",
        repository: record.repository?.nameWithOwner?.trim() || this.extractRepositoryFromUrl(record.url),
        source: "github-cli" as const,
      }))
      .filter((record) => !!record.url && !!record.repository);
  }

  private extractRepositoryFromUrl(url: string | undefined) {
    const normalizedUrl = url?.trim();
    if (!normalizedUrl) {
      return "";
    }

    const githubPullRequestMatch = normalizedUrl.match(/^https:\/\/github\.com\/(?<owner>[^/]+)\/(?<repo>[^/]+)\/pull\/\d+(?:[/?#].*)?$/u);
    if (!githubPullRequestMatch?.groups) {
      return "";
    }

    return `${githubPullRequestMatch.groups.owner}/${githubPullRequestMatch.groups.repo}`;
  }
}
