import dayjs from "dayjs";
import shell from "shelljs";
import { Helper } from "./helper.js";

declare const __APP_VERSION__: string;
export function displayCliVersion() {
  //Get last update time of current branch
  const version = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : process.env.npm_package_version;
  const projectRoot = Helper.getProjectRoot();
  const lastModified = dayjs(shell.exec("git log -1 --format=%ci", { cwd: projectRoot, silent: true }).stdout.trim());
  const commitHash = shell.exec("git rev-parse --short HEAD", { cwd: projectRoot, silent: true }).stdout.trim();
  console.log(`v${version}, build ${commitHash} (${lastModified.fromNow()})`);
}
