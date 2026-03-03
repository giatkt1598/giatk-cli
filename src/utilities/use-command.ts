import shell from "shelljs";

interface UseCommandOptions {
  cwd: string;
  silent?: boolean;
}

export function useCommand(options: UseCommandOptions) {
  options.silent = options.silent ?? true;
  const exec = async (command: string) => {
    return new Promise<string>((resolve, reject) => {
      shell.exec(
        command,
        {
          cwd: options.cwd,
          silent: options.silent,
          encoding: "utf-8",
        },
        (code, stdout, stderr) => {
          if (code === 0) {
            resolve(stdout.trim());
          } else {
            reject(new Error(stderr));
          }
        },
      );
    });
  };

  return { exec };
}
