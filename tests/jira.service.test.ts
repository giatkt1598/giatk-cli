import { appSettings } from "../src/infrastructures/get-settings.js";
import { JiraService } from "../src/services/jira.service.js";
import { describe, expect, it } from "vitest";

describe("JiraService", () => {
  it("throws for invalid ticket key", async () => {
    const service = new JiraService({
      fetchFn: async () => new Response(JSON.stringify([]), { status: 200 }),
      execFn: async () => "[]",
    });

    await expect(service.getPullRequestsByTicketKey("invalid")).rejects.toThrow('Invalid ticket key "INVALID"');
  });

  it("maps Jira dev-status pull requests", async () => {
    const originalSettings = JSON.parse(JSON.stringify(appSettings));
    appSettings.Jira = {
      baseUrl: "https://example.atlassian.net",
      email: "jira@example.com",
      token: "token",
    };

    try {
      const service = new JiraService({
        fetchFn: async (input) => {
          const url = String(input);
          if (url.includes("/rest/api/3/issue/GIA-15")) {
            return new Response(JSON.stringify({ id: "10196" }), { status: 200 });
          }

          if (url.includes("/rest/dev-status/latest/issue/details?issueId=10196&dataType=pullrequest")) {
            return new Response(
              JSON.stringify({
                detail: [
                  {
                    pullRequests: [
                      {
                        id: "42",
                        name: "Add Jira service",
                        status: "MERGED",
                        url: "https://github.com/example-org/example-repo/pull/42",
                      },
                      {
                        id: "43",
                        name: "Other SCM",
                        status: "OPEN",
                        url: "https://gitlab.com/example/repo/merge_requests/43",
                      },
                    ],
                  },
                ],
              }),
              { status: 200 },
            );
          }

          return new Response(JSON.stringify({}), { status: 404 });
        },
        execFn: async () => "[]",
      });

      const result = await service.getPullRequestsByTicketKey("GIA-15");
      expect(result).toEqual([
        {
          number: 42,
          repository: "example-org/example-repo",
          source: "jira-api",
          state: "MERGED",
          title: "Add Jira service",
          url: "https://github.com/example-org/example-repo/pull/42",
        },
      ]);
    } finally {
      appSettings.Jira = originalSettings.Jira;
    }
  });

  it("falls back to GitHub search for private repositories when Jira returns no pull requests", async () => {
    const originalSettings = JSON.parse(JSON.stringify(appSettings));
    appSettings.Jira = {
      baseUrl: "https://example.atlassian.net",
      email: "jira@example.com",
      token: "token",
    };
    appSettings.GitHub = {
      owner: "example-org",
      useCliFallback: true,
    };

    try {
      const service = new JiraService({
        fetchFn: async (input) => {
          const url = String(input);
          if (url.includes("/rest/api/3/issue/GIA-15")) {
            return new Response(JSON.stringify({ id: "10196" }), { status: 200 });
          }

          if (url.includes("/rest/dev-status/latest/issue/details?issueId=10196&dataType=pullrequest")) {
            return new Response(JSON.stringify({ detail: [] }), { status: 200 });
          }

          return new Response(JSON.stringify({}), { status: 404 });
        },
        execFn: async (command) => {
          if (command.includes('gh search prs "GIA-15" --owner "example-org"')) {
            return JSON.stringify([
              {
                number: 15,
                title: "GIA-15 implement jira service",
                url: "https://github.com/example-org/example-repo/pull/15",
                state: "MERGED",
                repository: {
                  nameWithOwner: "example-org/example-repo",
                },
              },
              {
                number: 16,
                title: "GIA-15 support private repo",
                url: "https://github.com/example-org/private-repo/pull/16",
                state: "OPEN",
                repository: {
                  nameWithOwner: "example-org/private-repo",
                },
              },
            ]);
          }

          return "[]";
        },
      });

      const result = await service.getPullRequestsByTicketKey("GIA-15");
      expect(result).toEqual([
        {
          number: 15,
          repository: "example-org/example-repo",
          source: "github-cli",
          state: "MERGED",
          title: "GIA-15 implement jira service",
          url: "https://github.com/example-org/example-repo/pull/15",
        },
        {
          number: 16,
          repository: "example-org/private-repo",
          source: "github-cli",
          state: "OPEN",
          title: "GIA-15 support private repo",
          url: "https://github.com/example-org/private-repo/pull/16",
        },
      ]);
    } finally {
      appSettings.Jira = originalSettings.Jira;
      appSettings.GitHub = originalSettings.GitHub;
    }
  });

  it("falls back to GitHub search when Jira development data is unauthorized", async () => {
    const originalSettings = JSON.parse(JSON.stringify(appSettings));
    appSettings.Jira = {
      baseUrl: "https://example.atlassian.net",
      email: "jira@example.com",
      token: "token",
    };
    appSettings.GitHub = {
      owner: "example-org",
      useCliFallback: true,
    };

    try {
      const service = new JiraService({
        fetchFn: async (input) => {
          const url = String(input);
          if (url.includes("/rest/api/3/issue/GIA-15")) {
            return new Response(JSON.stringify({ id: "10196" }), { status: 200 });
          }

          if (url.includes("/rest/dev-status/latest/issue/details?issueId=10196&dataType=pullrequest")) {
            return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
          }

          return new Response(JSON.stringify({}), { status: 404 });
        },
        execFn: async () =>
          JSON.stringify([
            {
              number: 88,
              title: "GIA-15 private repo recovery",
              url: "https://github.com/example-org/private-repo/pull/88",
              state: "MERGED",
              repository: {
                nameWithOwner: "example-org/private-repo",
              },
            },
          ]),
      });

      const result = await service.getPullRequestsByTicketKey("GIA-15");
      expect(result).toEqual([
        {
          number: 88,
          repository: "example-org/private-repo",
          source: "github-cli",
          state: "MERGED",
          title: "GIA-15 private repo recovery",
          url: "https://github.com/example-org/private-repo/pull/88",
        },
      ]);
    } finally {
      appSettings.Jira = originalSettings.Jira;
      appSettings.GitHub = originalSettings.GitHub;
    }
  });
});
