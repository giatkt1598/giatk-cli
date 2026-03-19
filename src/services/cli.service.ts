import { appConsts } from "@/constants/constants.js";
import { Helper } from "@/utilities/helper.js";
import { useCommand } from "@/utilities/use-command.js";
import chalk from "chalk";
import dayjs from "dayjs";
import path from "path";

declare const __APP_VERSION__: string;

export class CliService {
  constructor() {}
  /**
   * Fetches the latest version of the CLI from the main branch.
   *
   * It fetches the main branch, shows the package.json file at the main branch,
   * and returns the "version" property from the parsed JSON.
   *
   * @returns {Promise<string>} The latest version of the CLI.
   */
  async getLatestVersion() {
    const { exec } = useCommand({ cwd: Helper.getProjectRoot() });
    await exec(`git fetch origin ${appConsts.CLI_MAIN_BRANCH}`);

    const packageJson = await exec(`git show origin/${appConsts.CLI_MAIN_BRANCH}:package.json`);
    return JSON.parse(packageJson).version;
  }

  /**
   * Gets the current version of the CLI.
   *
   * If the "__APP_VERSION__" constant is defined, it uses that value.
   * Otherwise, it falls back to the "npm_package_version" environment variable.
   *
   * @returns {Promise<string>} The current version of the CLI.
   */
  async getCurrentVersion() {
    const version = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : process.env.npm_package_version;
    return Promise.resolve(version);
  }

  /**
   * Upgrade the CLI to the latest version if available.
   *
   * It checks the current version with the latest version on the main branch.
   * If there is a newer version, it upgrades the CLI by checking out the main branch,
   * pulling the latest changes, and rebuilding the CLI.
   */
  async upgradeCli() {
    const [currentVersion, latestVersion] = await Promise.all([this.getCurrentVersion(), this.getLatestVersion()]);
    if (currentVersion === latestVersion) {
      console.log("CLI is already up to date.");
    } else {
      console.log(`Found a new CLI version: ${chalk.yellow(latestVersion)} (current: ${currentVersion}). Upgrading...`);

      const { exec } = useCommand({ cwd: Helper.getProjectRoot() });
      await exec(`git checkout ${appConsts.CLI_MAIN_BRANCH}`);
      await exec(`git pull origin ${appConsts.CLI_MAIN_BRANCH}`);
      await exec(`npm run build`);

      console.log(chalk.green(`CLI is upgraded successfully.`));
    }
  }

  /**
   * Checks if there is a newer version of the CLI available.
   *
   * It compares the current version with the latest version on the main branch.
   * If there is a newer version, it returns an object with "hasUpdate" set to true and the latest version.
   * Otherwise, it returns an object with "hasUpdate" set to false.
   *
   */
  async checkForUpdate() {
    const [currentVersion, latestVersion] = await Promise.all([this.getCurrentVersion(), this.getLatestVersion()]);
    return currentVersion !== latestVersion ? { hasUpdate: true, latestVersion } : { hasUpdate: false };
  }

  /**
   * Opens the runtime configuration file (`appsettings.production.json`) in the default system editor.
   *
   * If the file does not exist, it creates a new one by copying from `appsettings.json`.
   */
  async openFileConfig() {
    const projectRoot = Helper.getProjectRoot();
    const configPath = path.join(projectRoot, "appsettings.production.json");
    const isExists = await Helper.fileExists(configPath);
    if (!isExists) {
      const fs = await import("fs/promises");
      await fs.copyFile(path.join(projectRoot, "appsettings.json"), configPath);
    }

    const { exec } = useCommand({ cwd: projectRoot, silent: false });
    await exec(`"${process.platform === "win32" ? "notepad" : process.platform === "darwin" ? "open" : "xdg-open"}" "${configPath}"`);
  }

  /**
   * Shows the version of the CLI.
   *
   * It fetches the version from the package.json file and the last modified date from the git log.
   * It then formats the version and last modified date into a single string and logs it to the console.
   *
   * The format of the string is: `${appConsts.CLI.DISPLAY_NAME} version ${version} (build ${commitHash}, ${relativeTime})`
   *
   */
  async showVersion() {
    const version = await this.getCurrentVersion();
    const { exec } = useCommand({ cwd: Helper.getProjectRoot(), silent: true });
    const modifiedRaw = await exec("git log -1 --format=%ci");
    const commitHash = await exec("git rev-parse --short HEAD");

    const lastModified = modifiedRaw ? dayjs(modifiedRaw) : null;
    const relativeTime = lastModified?.isValid() ? lastModified.fromNow() : null;

    const segments = [`${appConsts.CLI.DISPLAY_NAME} version ${version}`];
    if (commitHash) {
      segments.push(`build ${commitHash}`);
    }
    if (relativeTime) {
      segments.push(`(${relativeTime})`);
    }

    console.log(segments.join(", ").replace(", (", " ("));
  }
}
