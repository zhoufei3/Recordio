import { getRenderableVideoUrl } from "@/lib/assetPath";
import { getLocalMediaServerPath } from "@/lib/localMediaUrl";

// Visible requests take priority; background prefetch yields between short batches.
let visibleQueue: Array<QueuedJob<unknown>> = [];
let backgroundQueue: Array<QueuedJob<unknown>> = [];
let workerRunning = false;
let pendingJobs = 0;
let completedJobs = 0;
let activeVideo: HTMLVideoElement | null = null;
let activeVideoPath: string | null = null;

interface QueuedJob<T> {
	run: () => Promise<T>;
	resolve: (value: T) => void;
	reject: (error: unknown) => void;
	background: boolean;
	signal: AbortSignal;
}

interface CachedFrame {
	key: string;
	mediaKey: string;
	timeMs: number;
	intervalMs: number;
	frame: string;
	lastAccessedAt: number;
}

const frames = new Map<string, string>();
const MAX_MEMORY_FRAMES = 256;
const MAX_PERSISTED_FRAMES = 1800;
const MAX_COARSE_FRAMES = 1500;
const COARSE_INTERVAL_MS = 10_000;
const DB_NAME = "recordio-filmstrip-cache";
const DB_VERSION = 1;
const FRAME_STORE = "frames";
let databasePromise: Promise<IDBDatabase | null> | null = null;

function reportProgress() {
	window.dispatchEvent(
		new CustomEvent("recordio:filmstrip-progress", {
			detail: {
				pending: pendingJobs,
				completed: completedJobs,
				total: pendingJobs + completedJobs,
			},
		}),
	);
}

function enqueue<T>(run: () => Promise<T>, signal: AbortSignal, background = false): Promise<T> {
	if (!background) {
		if (pendingJobs === 0) completedJobs = 0;
		pendingJobs++;
		reportProgress();
	}
	return new Promise<T>((resolve, reject) => {
		const job = { run, signal, background, resolve, reject } as QueuedJob<unknown>;
		(background ? backgroundQueue : visibleQueue).push(job);
		void processQueue();
	});
}

async function processQueue() {
	if (workerRunning) return;
	workerRunning = true;
	try {
		while (visibleQueue.length || backgroundQueue.length) {
			const job = visibleQueue.shift() ?? backgroundQueue.shift();
			if (!job) continue;
			try {
				job.resolve(job.signal.aborted ? [] : await job.run());
			} catch (error) {
				job.reject(error);
			} finally {
				if (!job.background) {
					pendingJobs--;
					completedJobs++;
					reportProgress();
				}
			}
		}
	} finally {
		workerRunning = false;
		if (visibleQueue.length || backgroundQueue.length) void processQueue();
	}
}

function openFrameDatabase(): Promise<IDBDatabase | null> {
	if (databasePromise) return databasePromise;
	databasePromise = new Promise((resolve) => {
		if (typeof indexedDB === "undefined") return resolve(null);
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (db.objectStoreNames.contains(FRAME_STORE)) return;
			const store = db.createObjectStore(FRAME_STORE, { keyPath: "key" });
			store.createIndex("mediaKey", "mediaKey");
			store.createIndex("mediaTime", ["mediaKey", "timeMs"]);
			store.createIndex("lastAccessedAt", "lastAccessedAt");
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => resolve(null);
		request.onblocked = () => resolve(null);
	});
	return databasePromise;
}

async function resolveMediaKey(path: string): Promise<string> {
	const localPath = getLocalMediaServerPath(path) ?? fileUrlToPath(path) ?? path;
	if (typeof window !== "undefined" && window.electronAPI?.getLocalFileFingerprint) {
		const result = await window.electronAPI
			.getLocalFileFingerprint(localPath)
			.catch(() => null);
		if (result?.success && result.path) {
			return `${result.path}:${result.size}:${result.modifiedAt}`;
		}
	}
	return localPath;
}

function fileUrlToPath(value: string): string | null {
	try {
		const url = new URL(value);
		if (url.protocol !== "file:") return null;
		const pathname = decodeURIComponent(url.pathname);
		return /^[A-Za-z]:\//.test(pathname.slice(1)) ? pathname.slice(1) : pathname;
	} catch {
		return null;
	}
}

function frameKey(mediaKey: string, timeMs: number) {
	return `${mediaKey}::${Math.round(timeMs)}`;
}

function rememberFrame(key: string, frame: string) {
	frames.delete(key);
	frames.set(key, frame);
	if (frames.size > MAX_MEMORY_FRAMES) frames.delete(frames.keys().next().value!);
}

async function readExactFrame(mediaKey: string, timeMs: number): Promise<CachedFrame | null> {
	const key = frameKey(mediaKey, timeMs);
	const cached = frames.get(key);
	if (cached)
		return {
			key,
			mediaKey,
			timeMs: Math.round(timeMs),
			intervalMs: 0,
			frame: cached,
			lastAccessedAt: 0,
		};
	const db = await openFrameDatabase();
	if (!db) return null;
	return new Promise((resolve) => {
		const store = db.transaction(FRAME_STORE, "readwrite").objectStore(FRAME_STORE);
		const request = store.get(key);
		request.onsuccess = () => {
			const record = (request.result as CachedFrame | undefined) ?? null;
			if (record) {
				record.lastAccessedAt = Date.now();
				store.put(record);
				rememberFrame(key, record.frame);
			}
			resolve(record);
		};
		request.onerror = () => resolve(null);
	});
}

async function readNearestFrame(mediaKey: string, timeMs: number): Promise<CachedFrame | null> {
	const db = await openFrameDatabase();
	if (!db) return null;
	return new Promise((resolve) => {
		const store = db.transaction(FRAME_STORE, "readwrite").objectStore(FRAME_STORE);
		const index = store.index("mediaTime");
		const range = IDBKeyRange.bound(
			[mediaKey, Math.max(0, timeMs - 60_000)],
			[mediaKey, timeMs + 60_000],
		);
		const request = index.openCursor(range);
		let closest: CachedFrame | null = null;
		let distance = Infinity;
		request.onsuccess = () => {
			const cursor = request.result;
			if (cursor) {
				const record = cursor.value as CachedFrame;
				const nextDistance = Math.abs(record.timeMs - timeMs);
				if (
					record.intervalMs > 0 &&
					nextDistance <= record.intervalMs / 2 + 500 &&
					nextDistance < distance
				) {
					record.lastAccessedAt = Date.now();
					cursor.update(record);
					closest = record;
					distance = nextDistance;
				}
				cursor.continue();
				return;
			}
			if (closest) rememberFrame(closest.key, closest.frame);
			resolve(closest);
		};
		request.onerror = () => resolve(null);
	});
}

async function saveFrame(record: CachedFrame) {
	const db = await openFrameDatabase();
	if (!db) return;
	try {
		const transaction = db.transaction(FRAME_STORE, "readwrite");
		const store = transaction.objectStore(FRAME_STORE);
		store.put(record);
		const countRequest = store.count();
		countRequest.onsuccess = () => {
			const removeCount = countRequest.result - MAX_PERSISTED_FRAMES;
			if (removeCount <= 0) return;
			let removed = 0;
			const cursor = store.index("lastAccessedAt").openCursor();
			cursor.onsuccess = () => {
				if (!cursor.result || removed >= removeCount) return;
				cursor.result.delete();
				removed++;
				cursor.result.continue();
			};
		};
	} catch {
		// Persistent thumbnails are an optimization; quota or storage errors are harmless.
	}
}

function waitForVideo(video: HTMLVideoElement, event: string, signal: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		const cleanup = () => {
			clearTimeout(timeout);
			video.removeEventListener(event, ready);
			video.removeEventListener("error", failed);
			signal.removeEventListener("abort", failed);
		};
		const ready = () => {
			cleanup();
			resolve();
		};
		const failed = () => {
			cleanup();
			reject(new Error("Frame extraction cancelled or unavailable"));
		};
		const timeout = setTimeout(failed, 8000);
		video.addEventListener(event, ready, { once: true });
		video.addEventListener("error", failed, { once: true });
		signal.addEventListener("abort", failed, { once: true });
		if (signal.aborted) failed();
	});
}

async function ensureVideo(path: string, signal: AbortSignal): Promise<HTMLVideoElement> {
	if (activeVideo && activeVideoPath === path && activeVideo.readyState >= 2) return activeVideo;
	if (activeVideo) {
		activeVideo.pause();
		activeVideo.removeAttribute("src");
		activeVideo.load();
	}
	const video = document.createElement("video");
	video.muted = true;
	video.playsInline = true;
	video.preload = "auto";
	video.crossOrigin = "anonymous";
	activeVideo = video;
	activeVideoPath = path;
	try {
		const url = await getRenderableVideoUrl(path);
		const loaded = waitForVideo(video, "loadeddata", signal);
		video.src = url;
		await loaded;
		return video;
	} catch (error) {
		if (activeVideo === video) {
			activeVideo = null;
			activeVideoPath = null;
		}
		video.pause();
		video.removeAttribute("src");
		video.load();
		throw error;
	}
}

async function renderFrames(
	path: string,
	times: number[],
	signal: AbortSignal,
	mediaKey: string,
	intervalMs: number,
) {
	const video = await ensureVideo(path, signal);
	const canvas = document.createElement("canvas");
	canvas.width = 160;
	canvas.height = 90;
	const context = canvas.getContext("2d");
	if (!context) return [];
	const result: string[] = [];
	for (const requestedTime of times) {
		if (signal.aborted) return [];
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
		const key = frameKey(mediaKey, requestedTime);
		const cached = await readExactFrame(mediaKey, requestedTime);
		if (cached) {
			result.push(cached.frame);
			continue;
		}
		const time = Math.max(0, Math.min(requestedTime / 1000, video.duration - 0.001));
		if (Math.abs(video.currentTime - time) > 0.0001) {
			const sought = waitForVideo(video, "seeked", signal);
			video.currentTime = time;
			await sought;
		}
		if (Math.abs(video.currentTime - time) > 0.12)
			throw new Error("Source does not support accurate seeking");
		const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
		const width = video.videoWidth * scale;
		const height = video.videoHeight * scale;
		context.drawImage(
			video,
			(canvas.width - width) / 2,
			(canvas.height - height) / 2,
			width,
			height,
		);
		const frame = canvas.toDataURL("image/jpeg", 0.7);
		rememberFrame(key, frame);
		void saveFrame({
			key,
			mediaKey,
			timeMs: Math.round(requestedTime),
			intervalMs,
			frame,
			lastAccessedAt: Date.now(),
		});
		result.push(frame);
	}
	return result;
}

export async function loadCachedFilmstrip(
	path: string,
	times: number[],
	signal: AbortSignal,
): Promise<string[]> {
	const mediaKey = await resolveMediaKey(path);
	return Promise.all(
		times.map(async (time) => {
			if (signal.aborted) return "";
			const exact = await readExactFrame(mediaKey, time);
			if (exact) return exact.frame;
			return (await readNearestFrame(mediaKey, time))?.frame ?? "";
		}),
	);
}

export function extractFilmstrip(
	path: string,
	times: number[],
	signal: AbortSignal,
): Promise<string[]> {
	return resolveMediaKey(path).then((mediaKey) =>
		enqueue(() => renderFrames(path, times, signal, mediaKey, 0), signal),
	);
}

export function prewarmFilmstripCache(path: string, signal: AbortSignal): void {
	void (async () => {
		const mediaKey = await resolveMediaKey(path);
		const metadata = await enqueue(
			async () => {
				const video = await ensureVideo(path, signal);
				return Number.isFinite(video.duration)
					? Math.max(0, Math.round(video.duration * 1000))
					: 0;
			},
			signal,
			true,
		);
		if (!metadata || signal.aborted) return;
		const intervalMs = Math.min(
			60_000,
			Math.max(COARSE_INTERVAL_MS, Math.ceil(metadata / MAX_COARSE_FRAMES / 1000) * 1000),
		);
		const times: number[] = [];
		for (let time = 0; time < metadata; time += intervalMs) times.push(time);
		const db = await openFrameDatabase();
		const cachedKeys = new Set<string>(frames.keys());
		if (db) {
			const storedKeys = await new Promise<IDBValidKey[]>((resolve) => {
				const request = db
					.transaction(FRAME_STORE, "readonly")
					.objectStore(FRAME_STORE)
					.index("mediaKey")
					.getAllKeys(mediaKey);
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => resolve([]);
			});
			for (const key of storedKeys) cachedKeys.add(String(key));
		}
		const missing = times.filter((time) => !cachedKeys.has(frameKey(mediaKey, time)));
		for (let index = 0; index < missing.length && !signal.aborted; index += 6) {
			const batch = missing.slice(index, index + 6);
			await enqueue(
				() => renderFrames(path, batch, signal, mediaKey, intervalMs),
				signal,
				true,
			);
		}
	})().catch(() => undefined);
}
