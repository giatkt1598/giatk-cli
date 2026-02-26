import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import shell from "shelljs";
import { Helper } from "./helper.js";
import { CLI } from "./constants.js";

dayjs.extend(relativeTime);

declare const __APP_VERSION__: string;
export function displayCliVersion() {
  const version = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : process.env.npm_package_version;
  const projectRoot = Helper.getProjectRoot();

  const logResult = shell.exec("git log -1 --format=%ci", { cwd: projectRoot, silent: true });
  const hashResult = shell.exec("git rev-parse --short HEAD", { cwd: projectRoot, silent: true });

  const commitHash = hashResult.code === 0 ? hashResult.stdout.trim() : "";
  const modifiedRaw = logResult.code === 0 ? logResult.stdout.trim() : "";
  const lastModified = modifiedRaw ? dayjs(modifiedRaw) : null;
  const relativeTime = lastModified?.isValid() ? lastModified.fromNow() : null;

  const segments = [`${CLI.DISPLAY_NAME} version ${version}`];
  if (commitHash) {
    segments.push(`build ${commitHash}`);
  }
  if (relativeTime) {
    segments.push(`(${relativeTime})`);
  }

  console.log(segments.join(", ").replace(", (", " ("));
}
