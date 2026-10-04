import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { constants, setPriority } from "node:os";
import path from "node:path";
import { USER_DATA_PATH } from "../../appPaths";
import { getFfmpegBinaryPath, getFfprobeBinaryPath } from "./binary";

const SAMPLE_RATE = 8000;
const MAX_PEAKS = 200_000;
let queue: Promise<unknown> = Promise.resolve();

export function generateLocalWaveform(
	filePath: string,
	peakCount: number,
	resourceVersion: number,
	signal: AbortSignal,
): Promise<{ peaks: Float32Array; durationMs: number }> {
	// Only one background decoder may run, including requests from other windows.
	const request = queue.then(async () => {
		signal.throwIfAborted();
		const resolved = await fs.realpath(filePath);
		const stats = await fs.stat(resolved);
		if (!stats.isFile()) throw new Error("Waveform source is not a file");
		const key = createHash("sha256")
			.update(`waveform-v1:${resolved}:${stats.size}:${stats.mtimeMs}:${peakCount}:${resourceVersion}`)
			.digest("hex");
		const cacheDir = path.join(USER_DATA_PATH, "audio-waveforms");
		const cachePath = path.join(cacheDir, `${key}.json`);
		try {
			const cached = JSON.parse(await fs.readFile(cachePath, "utf8"));
			if (Number.isFinite(cached.durationMs) && cached.durationMs > 0 &&
				Array.isArray(cached.peaks) && cached.peaks.length > 0 && cached.peaks.length <= MAX_PEAKS &&
				cached.peaks.every((peak: unknown) => typeof peak === "number" && Number.isFinite(peak))) {
				return { peaks: Float32Array.from(cached.peaks), durationMs: cached.durationMs };
			}
		} catch { /* Missing or incomplete cache: regenerate. */ }

		const metadata = await new Promise<string>((resolve, reject) => {
			execFile(getFfprobeBinaryPath(), [
				"-v", "error", "-select_streams", "a:0", "-show_entries",
				"stream=codec_type,duration:format=duration", "-of", "json", resolved,
			], { windowsHide: true, timeout: 30000, signal }, (error, stdout) => {
				if (error) reject(error); else resolve(stdout);
			});
		});
		const probe = JSON.parse(metadata);
		if (!probe.streams?.length) throw new Error("Source has no audio stream");
		const streamDuration = Number(probe.streams[0].duration);
		const duration = Number.isFinite(streamDuration) && streamDuration > 0
			? streamDuration : Number(probe.format?.duration);
		if (!Number.isFinite(duration) || duration <= 0) throw new Error("Invalid audio duration");
		const count = Math.min(MAX_PEAKS, Math.max(peakCount, Math.floor(duration * 500)));
		const peaks = new Float32Array(count);
		const totalSamples = Math.max(1, Math.round(duration * SAMPLE_RATE));
		await new Promise<void>((resolve, reject) => {
			const decoder = spawn(getFfmpegBinaryPath(), [
				"-v", "error", "-nostdin", "-threads", "1", "-i", resolved,
				"-map", "0:a:0", "-vn", "-sn", "-dn", "-ac", "1", "-ar", String(SAMPLE_RATE),
				"-threads", "1", "-filter_threads", "1", "-f", "f32le", "pipe:1",
			], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], signal });
			try {
				if (decoder.pid) setPriority(decoder.pid, constants.priority.PRIORITY_BELOW_NORMAL);
			} catch { /* Scheduling priority is optional on some platforms. */ }
			let sampleIndex = 0;
			let remaining = Buffer.alloc(0);
			let errorText = "";
			const timeout = setTimeout(() => decoder.kill(), 10 * 60 * 1000);
			decoder.stdout.on("data", (chunk: Buffer) => {
				const data = remaining.length ? Buffer.concat([remaining, chunk]) : chunk;
				const end = data.length - data.length % 4;
				for (let offset = 0; offset < end; offset += 4) {
					const bin = Math.min(count - 1, Math.floor(sampleIndex++ * count / totalSamples));
					const value = Math.abs(data.readFloatLE(offset));
					if (Number.isFinite(value) && value > peaks[bin]) peaks[bin] = value;
				}
				remaining = Buffer.from(data.subarray(end));
			});
			decoder.stderr.on("data", (chunk: Buffer) => { errorText = (errorText + chunk.toString()).slice(-2000); });
			decoder.once("error", (error) => { clearTimeout(timeout); reject(error); });
			decoder.once("close", (code) => {
				clearTimeout(timeout);
				if (code !== 0 || sampleIndex === 0) reject(new Error(errorText || "Waveform extraction failed"));
				else resolve();
			});
		});
		signal.throwIfAborted();
		const sorted = Float32Array.from(peaks).sort();
		const maximum = sorted[Math.floor(sorted.length * 0.995)] || sorted[sorted.length - 1];
		if (maximum > 0) for (let i = 0; i < peaks.length; i++) peaks[i] = Math.min(1, peaks[i] / maximum);
		const result = { peaks, durationMs: duration * 1000 };
		try {
			await fs.mkdir(cacheDir, { recursive: true });
			await fs.writeFile(`${cachePath}.tmp`, JSON.stringify({ ...result, peaks: Array.from(peaks) }));
			await fs.rename(`${cachePath}.tmp`, cachePath);
		} catch { /* Cache writes must not prevent using the computed waveform. */ }
		return result;
	});
	queue = request.catch(() => undefined);
	return request;
}
