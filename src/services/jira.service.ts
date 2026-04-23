import { appSettings } from "../infrastructures/get-settings.js";

export interface PullRequestLink {
  number: number;
  title: string;
  url: string;
  state: JiraPullRequestState;
  repository: string;
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

export const jiraPullRequestStates = ["open", "declined", "merged", "unknown", "all"] as const;
export type JiraPullRequestState = (typeof jiraPullRequestStates)[number];
interface JiraPullRequest {
  id?: string | number;
  name?: string;
  url?: string;
  status?: JiraPullRequestState;
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

class JiraDevelopmentDataError extends Error {}

export class JiraService {
  constructor() {}

  private get jiraConfig() {
    return appSettings.Jira;
  }

  private hasJiraConfig() {
    return !!(this.jiraConfig?.baseUrl && this.jiraConfig?.email && this.jiraConfig?.token);
  }

  public async getPullRequestsFromJira({ ticketKey, state }: { ticketKey: string; state?: JiraPullRequestState }): Promise<PullRequestLink[]> {
    if (!this.hasJiraConfig()) {
      return [];
    }

    const issueId = await this.getJiraIssueId(ticketKey);
    const devStatusResponse = await this.getJiraDevStatus(issueId);
    return (
      devStatusResponse.detail
        ?.flatMap((detail) => detail.pullRequests ?? [])
        .map((pullRequest) => this.mapJiraPullRequest(pullRequest))
        .filter((pullRequest): pullRequest is PullRequestLink => pullRequest !== null)
        .filter((pullRequest) => !state || state === "all" || pullRequest.state === state)
        .sort((a, b) => a.url.localeCompare(b.url)) ?? []
    );
  }

  private async getJiraIssueId(ticketKey: string) {
    const baseUrl = this.jiraConfig?.baseUrl?.replace(/\/+$/u, "");
    const email = this.jiraConfig?.email ?? "";
    const token = this.jiraConfig?.token ?? "";
    const authHeader = Buffer.from(`${email}:${token}`).toString("base64");
    const response = await fetch(`${baseUrl}/rest/api/3/issue/${encodeURIComponent(ticketKey)}?fields=none`, {
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
    const response = await fetch(`${baseUrl}/rest/dev-status/latest/issue/details?issueId=${encodeURIComponent(issueId)}&dataType=pullrequest`, {
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

    const repository = githubPullRequestMatch.groups.repo!;
    const number = Number(githubPullRequestMatch.groups.number);
    const title = pullRequest.name?.trim() || `PR #${number}`;
    const state = (pullRequest.status as any)?.toLowerCase() || "unknown";

    return {
      number,
      title,
      url,
      state,
      repository,
    };
  }
}
