import { Description, IsDayjs } from "@/decorators/index.js";
import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";
import type dayjs from "dayjs";
import { CommandOf } from "./base/base.command.js";
import { Command } from "./base/command.decorator.js";

const SAMPLE_COMMAND_TYPES = ["Type 1", "Type 2", "Type 3"] as const;
type SampleCommandType = (typeof SAMPLE_COMMAND_TYPES)[number];

class SampleCommandOptions {
  @Description("User name to greet.")
  @IsString()
  @Length(1, 50)
  name!: string;

  @Description("Number of greeting lines to print.")
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  times!: number;

  @Description("Execution mode.")
  @IsOptional()
  @IsIn(["quick", "safe"])
  mode: "quick" | "safe" = "quick";

  @Description("Select one value from predefined types.")
  @IsOptional()
  @IsIn(SAMPLE_COMMAND_TYPES)
  select?: SampleCommandType;

  @Description("Run command without side effects.")
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsBoolean()
  disable: boolean = false;

  @Description("Date in YYYY-MM-DD format.")
  @IsDayjs({ format: "YYYY-MM-DD" })
  date!: dayjs.Dayjs;
}

@Command("sample", {
  description: "This is a sample command to demonstrate the command structure and argument parsing.",
  example: "sample --name Alice --dry-run --times 24 --date 2025-01-23",
})
export class SampleCommand extends CommandOf(SampleCommandOptions) {
  async executeAsync(): Promise<void> {
    console.log("🚀 ~ SampleCommand ~ executeAsync ~ this.args:", JSON.stringify(this.args, null, 2));
    const suffix = this.args.dryRun ? " (dry-run)" : "";

    for (let i = 0; i < this.args.times; i++) {
      console.log(`Hello ${this.args.name} [mode=${this.args.mode}]${suffix}`);
    }
  }
}
