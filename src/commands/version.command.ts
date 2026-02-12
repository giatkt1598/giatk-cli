import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import { BaseCommand, Command } from "./base/index.js";
dayjs.extend(relativeTime);
import shell from "shelljs";

declare const __APP_VERSION__: string;

@Command("version")
export class VersionCommand extends BaseCommand {
  async executeAsync() {
    //Get last update time of current branch
    const version =
      typeof __APP_VERSION__ !== "undefined"
        ? __APP_VERSION__
        : process.env.npm_package_version;

    // shell.exec("git log -1 --format=%ci", { cwd });
    console.log(`v${version} (${dayjs().fromNow()})`);
  }
}
