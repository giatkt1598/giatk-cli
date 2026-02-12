//Write function load config from appsettings.json like as .net core, can override appsetting.json base on environment variable, for example: appsettings.Development.json, appsettings.Production.json, etc.
import * as fs from "fs";
import * as path from "path";
import { Helper } from "./helper.js";

interface AppSettings {
  [key: string]: any;
}

function readJsonFile(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`Failed to parse JSON from ${filePath}: ${e}`);
  }
}

export function getSettings(): AppSettings {
  const projectRoot = Helper.getProjectRoot();
  const basePath = path.join(projectRoot, "appsettings.json");
  const env = process.env.NODE_ENV || "production";
  const envFileName = `appsettings.${env}.json`;
  const envPath = path.join(projectRoot, envFileName);

  const baseSettings = readJsonFile(basePath);
  if (!baseSettings) {
    throw new Error("appsettings.json file not found");
  }

  const envSettings = readJsonFile(envPath);

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

  if (envSettings) {
    merge(baseSettings, envSettings);
  }

  return baseSettings;
}
