import { Description } from "@/decorators/index.js";
import { JiraService } from "@/services/index.js";
import { IsString, Matches } from "class-validator";
import { CommandOf } from "./base/base.command.js";
import { Command } from "./base/command.decorator.js";

class JiraPrsCommandOptions {
  @Description("Jira ticket key, for example GIA-15.")
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*-\d+$/u, {
    message: "ticket must match format like GIA-15",
  })
  ticket!: string;
}

@Command("jira:prs", {
  description: "List pull requests linked to a Jira ticket.",
  example: "jira:prs --ticket GIA-15",
})
export class JiraPrsCommand extends CommandOf(JiraPrsCommandOptions) {
  async executeAsync(): Promise<void> {
    const ticketKey = this.args.ticket.trim().toUpperCase();
    const pullRequests = await new JiraService().getPullRequestsByTicketKey(ticketKey);

    if (pullRequests.length === 0) {
      console.log(`No pull requests linked to ticket ${ticketKey}.`);
      return;
    }

    pullRequests.forEach((pullRequest) => {
      const numberLabel = pullRequest.number !== null ? `#${pullRequest.number}` : "#?";
      console.log(`${numberLabel} [${pullRequest.state}] ${pullRequest.repository} ${pullRequest.title}`);
      console.log(`  ${pullRequest.url}`);
      console.log(`  source: ${pullRequest.source}`);
    });
  }
}
