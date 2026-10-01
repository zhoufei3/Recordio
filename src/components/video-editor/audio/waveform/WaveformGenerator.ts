import { WAVEFORM_DEFAULT_PEAK_COUNT } from "../../timeline/core/constants";
import type { AudioPeaksData } from "../../timeline/core/timelineTypes";
import { getAudioResourceCacheScope, getAudioResourceVersionKey } from "../audioResourceVersion";
import WorkerConstructor from "./waveform.worker?worker";
import { VersionedWaveformCache } from "./waveformCache";

const MAX_WAVEFORM_PEAKS = 200_000;
const MAX_WAVEFORM_CACHE_ENTRIES = 24;

export class WaveformGenerator {
	private audioContext: AudioContext;
	private worker: Worker;
	private peaksCache = new VersionedWaveformCache<AudioPeaksData>(MAX_WAVEFORM_CACHE_ENTRIES);
	private pending = new Map<string, Promise<AudioPeaksData>>();
	private workerRequestSeq = 0;
	private workerResolvers = new Map<
		number,
		{ resolve: (peaks: Float32Array) => void; reject: (err: Error) => void }
	>();

	constructor() {
		this.audioContext = new (
			window.AudioContext ||
			(window as typeof window & { webkitAudioContext?: typeof AudioContext })
				.webkitAudioContext
		)();
		this.worker = new WorkerConstructor();

		this.worker.addEventListener(
			"message",
			(event: MessageEvent<{ requestId: number; peaks?: Float32Array; error?: string }>) => {
				const { requestId, peaks, error } = event.data;
				const resolver = this.workerResolvers.get(requestId);
				if (!resolver) return;

				this.workerResolvers.delete(requestId);
				if (error) {
					resolver.reject(new Error(error));
				} else if (peaks) {
					resolver.resolve(peaks);
				}
			},
		);

		this.worker.addEventListener("error", (error: ErrorEvent) => {
			console.error("[WaveformGenerator] Worker fatal error:", error);
			const fatalError = error.error ?? new Error(error.message || "Worker crashed");

			// Reject all pending requests if the worker itself crashes
			for (const resolver of this.workerResolvers.values()) {
				resolver.reject(fatalError);
			}
			this.workerResolvers.clear();
		});
	}

	private computePeaksWithWorker(
		channels: Float32Array[],
		samples: number,
	): Promise<Float32Array> {
		return new Promise((resolve, reject) => {
			const requestId = ++this.workerRequestSeq;
			this.workerResolvers.set(requestId, { resolve, reject });

			this.worker.postMessage(
				{
					requestId,
					channels,
					samples,
				},
				channels.map((c) => c.buffer),
			);
		});
	}

	public async generate(
		url: string,
		peakCount = WAVEFORM_DEFAULT_PEAK_COUNT,
		resourceVersion = 0,
	): Promise<AudioPeaksData> {
		const cacheScope = `${getAudioResourceCacheScope(url)}::${peakCount}`;
		const cacheKey = getAudioResourceVersionKey(cacheScope, resourceVersion);
		this.peaksCache.activate(cacheScope, cacheKey);
		const cached = this.peaksCache.get(cacheKey);
		if (cached) return cached;

		const inflight = this.pending.get(cacheKey);
		if (inflight) return inflight;

		const request = (async () => {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Failed to load media: ${response.status}`);
			}

			const arrayBuffer = await response.arrayBuffer();
			const decoded = await this.audioContext.decodeAudioData(arrayBuffer);
			const adaptivePeakCount = Math.max(peakCount, Math.floor(decoded.duration * 500));
			const boundedPeakCount = Math.min(adaptivePeakCount, MAX_WAVEFORM_PEAKS);
			const channels: Float32Array[] = [];
			for (let i = 0; i < decoded.numberOfChannels; i++) {
				// Copy long recordings in chunks so opening a project does not freeze the editor.
				const source = decoded.getChannelData(i);
				const copy = new Float32Array(source.length);
				for (let offset = 0; offset < source.length; offset += 1_000_000) {
					copy.set(source.subarray(offset, offset + 1_000_000), offset);
					await new Promise<void>((resolve) => setTimeout(resolve, 0));
				}
				channels.push(copy);
			}

			const peaks = await this.computePeaksWithWorker(channels, boundedPeakCount);

			const result: AudioPeaksData = {
				peaks,
				durationMs: decoded.duration * 1000,
			};
			this.peaksCache.setIfCurrent(cacheScope, cacheKey, result);
			this.pending.delete(cacheKey);
			return result;
		})().catch((error) => {
			this.pending.delete(cacheKey);
			this.peaksCache.deactivateIfCurrent(cacheScope, cacheKey);
			throw error;
		});

		this.pending.set(cacheKey, request);
		return request;
	}
}

export const waveformGenerator = new WaveformGenerator();
