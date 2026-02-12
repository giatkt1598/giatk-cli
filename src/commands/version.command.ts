import { Helper } from "@/infrastructures/helper.js";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import shell from "shelljs";
import { BaseCommand, Command } from "./base/index.js";
dayjs.extend(relativeTime);

declare const __APP_VERSION__: string;

@Command("version")
export class VersionCommand extends BaseCommand {
  async executeAsync() {
    //Get last update time of current branch
    const version = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : process.env.npm_package_version;
    const projectRoot = Helper.getProjectRoot();
    const lastModified = dayjs(shell.exec("git log -1 --format=%ci", { cwd: projectRoot, silent: true }).stdout.trim());

    console.log(`v${version} (${lastModified.fromNow()})`);
  }
}
