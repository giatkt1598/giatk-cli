import { BrowserInputService, type OpenBrowser } from "@/services/browser-input.service.js";
import { parse } from "querystring";
import { BaseCommand, Command } from "./base/index.js";

interface LoginInput {
  name: string;
  email: string;
}

const LOGIN_FORM_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>GIATK CLI login</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; }
      label { display: block; margin: 1rem 0 .35rem; }
      input { box-sizing: border-box; width: 100%; padding: .65rem; }
      button { margin-top: 1.25rem; padding: .65rem 1rem; cursor: pointer; }
    </style>
  </head>
  <body>
    <h1>GIATK CLI login</h1>
    <p>Enter the values and submit this form to continue the CLI command.</p>
    <form method="post" action="/submit">
      <label for="name">Name</label>
      <input id="name" name="name" required maxlength="100" autocomplete="name">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required maxlength="254" autocomplete="email">
      <button type="submit">Submit</button>
    </form>
  </body>
</html>`;

function parseLoginInput(body: string): LoginInput {
  const fields = parse(body);
  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  const email = typeof fields.email === "string" ? fields.email.trim() : "";

  if (!name || !email || !email.includes("@")) {
    throw new Error("Name and a valid email are required.");
  }

  return { name, email };
}

function createLoginInputService(openBrowser?: OpenBrowser) {
  return new BrowserInputService<LoginInput>({
    formHtml: LOGIN_FORM_HTML,
    parseSubmission: parseLoginInput,
    openBrowser,
  });
}

@Command("login", {
  description: "Open a browser form, receive login input, and continue in the CLI.",
  example: "login",
})
export class LoginCommand extends BaseCommand {
  async executeAsync(): Promise<void> {
    console.log("Waiting for browser input. Submit the form or press Ctrl+C to cancel.");
    const input = await createLoginInputService().collect();

    console.log("Received input from browser:");
    console.log(JSON.stringify(input, null, 2));
    console.log(`Processing ${input.name} <${input.email}> in the CLI...`);
    console.log("Browser input processing completed.");
  }
}
