import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ root: "", decodes: 0 }));
vi.mock("../../appPaths", () => ({ get USER_DATA_PATH() { return state.root; } }));
vi.mock("./binary", () => {
	const require = createRequire(import.meta.url);
	return {
		getFfmpegBinaryPath: () => { state.decodes++; return require("ffmpeg-static"); },
		getFfprobeBinaryPath: () => require("ffprobe-static").path,
	};
});
import { generateLocalWaveform } from "./waveform";

const run = promisify(execFile);
const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
beforeEach(async () => {
	state.root = await fs.mkdtemp(path.join(os.tmpdir(), "recordio-waveform-"));
	state.decodes = 0;
});
afterEach(async () => {
	if (!path.basename(state.root).startsWith("recordio-waveform-")) throw new Error("Invalid test directory");
	await fs.rm(state.root, { recursive: true, force: true });
});

it("streams a long source into bounded peaks and reuses the persistent cache", async () => {
	const file = path.join(state.root, "tone.wav");
	await run(ffmpeg, ["-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=10", "-ac", "2", file], { windowsHide: true });
	const result = await generateLocalWaveform(file, 100, 0, new AbortController().signal);
	expect(result.durationMs).toBeCloseTo(10000, 0);
	expect(result.peaks.length).toBe(5000);
	expect(result.peaks.every((peak) => peak >= 0 && peak <= 1)).toBe(true);
	expect(Math.max(...result.peaks)).toBe(1);
	const cached = await generateLocalWaveform(file, 100, 0, new AbortController().signal);
	expect(cached).toEqual(result);
	expect(state.decodes).toBe(1);
	await generateLocalWaveform(file, 100, 1, new AbortController().signal);
	expect(state.decodes).toBe(2);
});

it("handles silence without producing invalid amplitudes", async () => {
	const file = path.join(state.root, "silence.wav");
	await run(ffmpeg, ["-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "1", file], { windowsHide: true });
	const result = await generateLocalWaveform(file, 100, 0, new AbortController().signal);
	expect(result.peaks.every((peak) => peak === 0)).toBe(true);
});

it("does not start a cancelled queued request", async () => {
	const controller = new AbortController();
	controller.abort();
	await expect(generateLocalWaveform("unused.wav", 100, 0, controller.signal)).rejects.toThrow();
	expect(state.decodes).toBe(0);
});
