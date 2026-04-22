//Write function load config from appsettings.json like as .net core, can override appsetting.json base on environment variable, for example: appsettings.Development.json, appsettings.Production.json, etc.
import * as path from "path";
import { Helper } from "../utilities/helper.js";

interface AppSettings {
  CheckForUpdate?: boolean;
  Jira?: {
    baseUrl?: string;
    email?: string;
    token?: string;
  };
  GitHub?: {
    owner?: string;
    useCliFallback?: boolean;
  };
}

async function getSettings(): Promise<AppSettings> {
  const projectRoot = Helper.getProjectRoot();
  const basePath = path.join(projectRoot, "appsettings.json");

  const baseSettings = await Helper.readFileAs<AppSettings>(basePath);
  if (!baseSettings) {
    throw new Error("appsettings.json file not found");
  }

  // deep merge environment settings into base settings
  function merge(target: any, source: any): any {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
          target[key] = {};
        }
        merge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  const env = process.env.NODE_ENV || "production";
  const envFileName = `appsettings.${env}.json`;
  const envPath = path.join(projectRoot, envFileName);
  if (await Helper.fileExists(envPath)) {
    const envSettings = await Helper.readFileAs<AppSettings>(envPath);
    envSettings && merge(baseSettings, envSettings);
  }

  return baseSettings;
}

export const appSettings = await getSettings();
