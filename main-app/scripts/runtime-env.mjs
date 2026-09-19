import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export async function createRuntimeEnv() {
  const runtimeRoot = path.join(projectRoot, ".sites-runtime");
  const directories = {
    home: path.join(runtimeRoot, "home"),
    npmCache: path.join(runtimeRoot, "npm-cache"),
    xdgConfig: path.join(runtimeRoot, "xdg-config"),
    temporary: path.join(runtimeRoot, "tmp"),
    wranglerLogs: path.join(runtimeRoot, "wrangler", "logs"),
  };

  await Promise.all(
    Object.values(directories).map((directory) =>
      mkdir(directory, { recursive: true }),
    ),
  );

  return {
    ...process.env,
    SITES_ENV_READY: "1",
    SITES_PROJECT_ROOT: projectRoot,
    HOME: directories.home,
    XDG_CONFIG_HOME: directories.xdgConfig,
    TMPDIR: directories.temporary,
    TEMP: directories.temporary,
    TMP: directories.temporary,
    WRANGLER_WRITE_LOGS: "false",
    WRANGLER_LOG_PATH: directories.wranglerLogs,
    MINIFLARE_REGISTRY_PATH: path.join(runtimeRoot, "wrangler", "registry"),
    npm_config_cache: directories.npmCache,
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_update_notifier: "false",
  };
}

const nodeBinaryEntries = {
  "drizzle-kit": ["drizzle-kit", "bin.cjs"],
  eslint: ["eslint", "bin", "eslint.js"],
  tsc: ["typescript", "bin", "tsc"],
  vinext: ["vinext", "dist", "cli.js"],
  vite: ["vite", "bin", "vite.js"],
  wrangler: ["wrangler", "bin", "wrangler.js"],
};

export function localBinary(name) {
  const entry = nodeBinaryEntries[name];
  if (!entry) throw new Error(`Unsupported local command: ${name}`);
  return path.join(projectRoot, "node_modules", ...entry);
}

export async function runLocalBinary(name, args = [], options = {}) {
  const env = options.env ?? (await createRuntimeEnv());
  const timeoutMs = options.timeoutMs ?? 0;
  const command = process.execPath;
  const commandArgs = [localBinary(name), ...args];

  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: projectRoot,
      env,
      stdio: "inherit",
      shell: false,
    });
    let timedOut = false;
    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
        }, timeoutMs)
      : null;

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`${name} exceeded the ${timeoutMs}ms time limit`));
      } else if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`${name} exited with ${code ?? `signal ${signal}`}`),
        );
      }
    });
  });
}
