import { IsDayjs } from "@/decorators/is-dayjs.decorator.js";
import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";
import type dayjs from "dayjs";
import { CommandOf } from "./base/base.command.js";
import { Command } from "./base/command.decorator.js";

const TEMPLATE_COMMAND_TYPES = ["Type 1", "Type 2", "Type 3"] as const;
type TemplateCommandType = (typeof TEMPLATE_COMMAND_TYPES)[number];

class TemplateCommandOptions {
  @IsString()
  @Length(1, 50)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  times!: number;

  @IsOptional()
  @IsIn(["quick", "safe"])
  mode: "quick" | "safe" = "quick";

  @IsOptional()
  @IsIn(TEMPLATE_COMMAND_TYPES)
  select?: TemplateCommandType;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsDayjs({ format: "YYYY-MM-DD" })
  date!: dayjs.Dayjs;
}

@Command("template")
export class TemplateCommand extends CommandOf(TemplateCommandOptions) {
  async executeAsync(): Promise<void> {
    console.log("🚀 ~ TemplateCommand ~ executeAsync ~ this.args:", JSON.stringify(this.args, null, 2));
    const suffix = this.args.dryRun ? " (dry-run)" : "";

    for (let i = 0; i < this.args.times; i++) {
      console.log(`Hello ${this.args.name} [mode=${this.args.mode}]${suffix}`);
    }
  }
}
