import { Description, IsSingleSelect } from "@/decorators/index.js";
import { JiraService, pullRequestStates, type PullRequestState } from "@/services/index.js";
import { IsString } from "class-validator";
import { CommandOf } from "./base/base.command.js";
import { Command } from "./base/command.decorator.js";

class JiraPrsCommandOptions {
  @Description("Jira ticket key, for example GIA-15.")
  @IsString()
  ticket!: string;

  @Description("Filter pull requests by state.")
  @IsSingleSelect(pullRequestStates)
  state?: PullRequestState = "open";
}

@Command("jira:prs", {
  description: "List pull requests linked to a Jira ticket.",
  example: "jira:prs --ticket GIA-15",
})
export class JiraPrsCommand extends CommandOf(JiraPrsCommandOptions) {
  async executeAsync(): Promise<void> {
    console.log("Fetching pull requests...");
    const ticketKey = this.args.ticket.trim().toUpperCase();
    const pullRequests = await new JiraService().getPullRequestsFromJira({
      ticketKey,
      state: this.args.state,
    });

    if (pullRequests.length === 0) {
      console.log(`No pull requests linked to ticket ${ticketKey}.`);
      return;
    }

    pullRequests.forEach((pullRequest) => {
      const numberLabel = pullRequest.number !== null ? `#${pullRequest.number}` : "#?";
      console.log(`${numberLabel} [${pullRequest.state}] ${pullRequest.url}`);
    });
  }
}
