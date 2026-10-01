import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const requested = process.argv[2];
const platform = requested ?? (process.platform === "darwin" ? "mac" : process.platform === "win32" ? "win" : "linux");
if (!(["win", "mac", "linux"].includes(platform))) {
	throw new Error(`Unsupported desktop target: ${platform}`);
}
if ((platform === "mac" && process.platform !== "darwin") || (platform === "win" && process.platform !== "win32")) {
	throw new Error(`${platform} packages must be built on their native host`);
}

const env = { ...process.env };
if (platform === "mac") env.WHISPER_RUNTIME_ARCHS = "all";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const bin = (name) => process.platform === "win32" ? `node_modules\\.bin\\${name}.cmd` : `node_modules/.bin/${name}`;
const localElectron = "node_modules/electron/dist";
const commands = [
	[npm, ["run", "build:platform-native-helpers"]],
	[bin("tsc"), []],
	[bin("vite"), ["build", "--config", "vite.config.ts"]],
	[npm, ["run", "normalize:electron-main-cjs"]],
	[npm, ["run", "smoke:electron-main-cjs"]],
	[bin("electron-builder"), [`--${platform}`, ...(platform === "win" ? ["--x64"] : []), ...(existsSync(localElectron) ? [`--config.electronDist=${localElectron}`] : [])]],
];
for (const [command, args] of commands) {
	const result = spawnSync(command, args, { env, stdio: "inherit", shell: process.platform === "win32" });
	if (result.error) throw result.error;
	if (result.status !== 0) process.exit(result.status ?? 1);
}
