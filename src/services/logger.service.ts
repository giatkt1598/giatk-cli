import chalk from "chalk";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";

dayjs.extend(duration);

type LogLevel = "log" | "info" | "warn" | "error";
interface LoggerServiceOptions {
  logToConsole?: boolean;
}

export class LoggerService {
  private readonly logToConsole: boolean;
  private readonly messages: string[] = [];
  private startedAt: Dayjs = dayjs();

  constructor(options: LoggerServiceOptions = {}) {
    this.logToConsole = options.logToConsole ?? true;
  }

  private formatTimestamp(date: dayjs.Dayjs) {
    return date.format("YYYY-MM-DD HH:mm:ss.SSS");
  }

  private colorLevel(level: LogLevel) {
    switch (level) {
      case "error":
        return chalk.red(level);
      case "warn":
        return chalk.yellow(level);
      case "info":
        return chalk.blue(level);
      default:
        return chalk.white(level);
    }
  }

  private write(level: LogLevel, ...args: unknown[]) {
    const timestamp = this.formatTimestamp(dayjs());
    const levelText = this.colorLevel(level);
    const prefix = `[${timestamp}] [${levelText}]:`;

    if (!this.logToConsole) {
      const message = args.map((arg) => this.formatArg(arg)).join(" ");
      this.messages.push(message ? `${prefix} ${message}` : prefix);
      return;
    }

    if (level === "error") {
      console.error(prefix, ...args);
      return;
    }
    if (level === "warn") {
      console.warn(prefix, ...args);
      return;
    }
    if (level === "info") {
      console.info(prefix, ...args);
      return;
    }
    console.log(prefix, ...args);
  }

  private formatArg(arg: unknown) {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return arg.stack ?? arg.message;
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }

  log(...args: unknown[]) {
    this.write("log", ...args);
  }

  info(...args: unknown[]) {
    this.write("info", ...args);
  }

  warn(...args: unknown[]) {
    this.write("warn", ...args);
  }

  error(...args: unknown[]) {
    this.write("error", ...args);
  }

  done() {
    const elapsedMs = Math.max(0, dayjs().diff(this.startedAt));
    const elapsed = dayjs.duration(elapsedMs);

    let label: string;
    if (elapsed.asSeconds() < 60) {
      const seconds = Math.floor(elapsed.asSeconds());
      label = `${seconds} second${seconds === 1 ? "" : "s"}`;
    } else if (elapsed.asHours() < 1) {
      label = `${elapsed.minutes()}m${elapsed.seconds()}s`;
    } else {
      label = `${Math.floor(elapsed.asHours())}h${elapsed.minutes()}m${elapsed.seconds()}s`;
    }

    const message = chalk.green(`Done in ${label}`);
    if (this.logToConsole) {
      console.log(message);
      return;
    }
    this.messages.push(message);
  }

  toString() {
    return this.messages.join("\n");
  }

  timeStart() {
    this.startedAt = dayjs();
  }

  timeEnd() {
    const elapsed = dayjs.duration(Math.max(0, dayjs().diff(this.startedAt)));
    const hours = String(Math.floor(elapsed.asHours())).padStart(2, "0");
    const minutes = String(elapsed.minutes()).padStart(2, "0");
    const seconds = String(elapsed.seconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }
}

export const logger = new LoggerService();
