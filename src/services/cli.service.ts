import { appConsts } from "@/constants/constants.js";
import { Helper } from "@/utilities/helper.js";
import { useCommand } from "@/utilities/use-command.js";
import chalk from "chalk";

declare const __APP_VERSION__: string;

export class CliService {
  constructor() {}
  async getLatestVersion() {
    const { exec } = useCommand({ cwd: Helper.getProjectRoot() });
    await exec(`git fetch origin ${appConsts.CLI_MAIN_BRANCH}`);

    const packageJson = await exec(`git show origin/${appConsts.CLI_MAIN_BRANCH}:package.json`);
    return JSON.parse(packageJson).version;
  }

  async getCurrentVersion() {
    const version = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : process.env.npm_package_version;
    return Promise.resolve(version);
  }

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

      console.log(chalk.green(`CLI is already up to date.`));
    }
  }

  async checkForUpdate() {
    const [currentVersion, latestVersion] = await Promise.all([this.getCurrentVersion(), this.getLatestVersion()]);
    return currentVersion !== latestVersion ? { hasUpdate: true, latestVersion } : { hasUpdate: false };
  }
}
