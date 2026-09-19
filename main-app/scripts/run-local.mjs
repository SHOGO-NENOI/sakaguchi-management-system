import { runLocalBinary } from "./runtime-env.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("usage: node scripts/run-local.mjs command [args...]");
  process.exit(64);
}

try {
  await runLocalBinary(command, args);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
