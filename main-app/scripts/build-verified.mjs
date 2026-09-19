import { createRuntimeEnv, runLocalBinary } from "./runtime-env.mjs";
import { validateArtifact } from "./validate-artifact.mjs";

const durationPattern = /^(\d+)(ms|s|m)?$/;
function durationToMilliseconds(value, fallback) {
  if (!value) return fallback;
  const match = durationPattern.exec(value.trim());
  if (!match) throw new Error(`Unsupported timeout value: ${value}`);
  const amount = Number(match[1]);
  const unit = match[2] ?? "ms";
  return amount * ({ ms: 1, s: 1_000, m: 60_000 }[unit]);
}

try {
  const env = await createRuntimeEnv();
  const timeoutMs = durationToMilliseconds(
    process.env.SITES_BUILD_TIMEOUT,
    3 * 60 * 1_000,
  );
  console.log("Running bounded vinext build...");
  await runLocalBinary("vinext", ["build"], { env, timeoutMs });
  await validateArtifact();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
