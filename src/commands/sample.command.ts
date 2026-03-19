import { Description, IsDayjs, IsMultiSelect, IsSingleSelect } from "@/decorators/index.js";
import { LoggerService } from "@/services/index.js";
import { Helper } from "@/utilities/helper.js";
import { PromisePool } from "@supercharge/promise-pool";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";
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
  @Min(-10)
  @Max(10)
  @Type(() => Number)
  times!: number;

  @Description(`Select one value from list.`)
  @IsOptional()
  @IsSingleSelect(SAMPLE_COMMAND_TYPES)
  selectOne?: SampleCommandType = "Type 1";

  @Description(`Select multiple values, separate values with commas.`)
  @IsOptional()
  @IsMultiSelect(SAMPLE_COMMAND_TYPES)
  selectMany?: SampleCommandType[];

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
  example: 'sample --name Alice --dry-run --times 10 --date 2025-01-23 --selectOne "Type 1" --selectMany "Type 1, Type 3"',
  shortcut: "s",
})
export class SampleCommand extends CommandOf(SampleCommandOptions) {
  async executeAsync(): Promise<void> {
    const logger = new LoggerService({ logToConsole: false });

    console.log("Parameters:\n", JSON.stringify(this.args, null, 2));

    logger.info("Sample logger.info");
    logger.warn("Sample logger.warn");
    logger.error("Sample logger.error");
    logger.log("Sample logger.log");

    console.log("PromisePool started");
    await PromisePool.for([1, 2, 3, 4, 5])
      .withConcurrency(2)
      .process(async (num) => {
        console.log(`Processing number ${num}...`);
        await Helper.sleepAsync(500);
        console.log(`Finished processing number ${num}.`);
      });
    console.log("PromisePool ended");

    console.log("Sleep for 1 seconds...");
    await Helper.sleepAsync(1000);
    logger.done();
    console.log(logger.toString());
    console.log("Awake now!");
    console.log(`Command executed in ${logger.timeEnd()}`);
  }
}
