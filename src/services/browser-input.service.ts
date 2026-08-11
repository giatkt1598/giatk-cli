import { spawn } from "child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "http";

export type OpenBrowser = (url: string) => void;

export interface BrowserInputServiceOptions<TInput> {
  formHtml: string;
  parseSubmission: (body: string) => TInput;
  openBrowser?: OpenBrowser;
  successHtml?: string;
}

const MAX_BODY_SIZE = 16 * 1024;
const DEFAULT_SUCCESS_HTML = "<h1>Submitted successfully</h1><p>You can close this tab and return to the CLI.</p>";

function writeHtml(response: ServerResponse, statusCode: number, body: string) {
  // The callback server is short-lived. Do not let the browser keep its
  // connection alive after the response, otherwise server.close() can wait
  // forever for the browser to release the idle socket.
  response.writeHead(statusCode, {
    "content-type": "text/html; charset=utf-8",
    connection: "close",
  });
  response.end(body);
}

async function waitForResponseToFinish(response: ServerResponse) {
  if (response.writableFinished) return;

  await new Promise<void>((resolve, reject) => {
    response.once("finish", resolve);
    response.once("error", reject);
  });
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

async function readRequestBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > MAX_BODY_SIZE) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function closeServer(server: Server) {
  if (!server.listening) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

export function openDefaultBrowser(url: string): void {
  const command = process.platform === "win32" ? "cmd.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  child.on("error", (error) => console.error(`Could not open the default browser: ${error.message}`));
  child.unref();
}

export class BrowserInputService<TInput> {
  private readonly options: Required<Pick<BrowserInputServiceOptions<TInput>, "successHtml">> & Omit<BrowserInputServiceOptions<TInput>, "successHtml">;

  constructor(options: BrowserInputServiceOptions<TInput>) {
    this.options = {
      ...options,
      successHtml: options.successHtml ?? DEFAULT_SUCCESS_HTML,
    };
  }

  async collect(): Promise<TInput> {
    let server!: Server;
    let resolveInput!: (input: TInput) => void;
    let rejectInput!: (error: Error) => void;
    let settled = false;

    const result = new Promise<TInput>((resolve, reject) => {
      resolveInput = resolve;
      rejectInput = reject;
    });

    const finish = async (error?: Error, input?: TInput) => {
      if (settled) return;
      settled = true;
      process.removeListener("SIGINT", onSigint);
      await closeServer(server);
      if (error) rejectInput(error);
      else resolveInput(input!);
    };

    const onSigint = () => void finish(new Error("Browser input cancelled."));

    server = createServer(async (request, response) => {
      try {
        if (request.method === "GET" && request.url === "/") {
          writeHtml(response, 200, this.options.formHtml);
          return;
        }

        if (request.method === "POST" && request.url === "/submit") {
          const input = this.options.parseSubmission(await readRequestBody(request));
          writeHtml(response, 200, this.options.successHtml);
          await waitForResponseToFinish(response);
          await finish(undefined, input);
          return;
        }

        writeHtml(response, 404, "<h1>Not found</h1>");
      } catch (error) {
        if (!settled) {
          const message = escapeHtml(error instanceof Error ? error.message : String(error));
          writeHtml(response, 400, `<h1>Invalid input</h1><p>${message}</p><p><a href="/">Try again</a></p>`);
        }
      }
    });

    process.once("SIGINT", onSigint);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      await finish(new Error("Could not determine the callback server address."));
      return result;
    }

    const url = `http://127.0.0.1:${address.port}/`;
    console.log(`Opening browser for input: ${url}`);
    (this.options.openBrowser ?? openDefaultBrowser)(url);
    return result;
  }
}
