import { type RefObject, useEffect, useMemo, useRef } from "react";
import { resolveMediaResourceUrl } from "@/lib/exporter/localMediaSource";
import type { ClickSoundId } from "../clickSounds";
import { buildEffectAudioRegions } from "../effectAudio";
import type { ClipRegion, CursorTelemetryPoint, ZoomRegion } from "../types";
import type { VideoPlaybackRef } from "../VideoPlayback";

const MAX_PENDING_AUDIO_DECODE_WAIT_MS = 2000;

export function useClickSoundPreview({
	telemetry,
	clips,
	zooms,
	connectZooms,
	zoomInDurationMs,
	effectAudioVolumes,
	effectAudioStartOverrides,
	disabledEffectAudioIds,
	leftSound,
	rightSound,
	currentTime,
	isPlaying,
	volume,
	playbackRef,
}: {
	telemetry: CursorTelemetryPoint[];
	clips: ClipRegion[];
	zooms: ZoomRegion[];
	connectZooms: boolean;
	zoomInDurationMs: number;
	effectAudioVolumes: Record<string, number>;
	effectAudioStartOverrides: Record<string, number>;
	disabledEffectAudioIds: string[];
	leftSound: ClickSoundId;
	rightSound: ClickSoundId;
	currentTime: number;
	isPlaying: boolean;
	volume: number;
	playbackRef: RefObject<VideoPlaybackRef | null>;
}) {
	const regions = useMemo(
		() => buildEffectAudioRegions({ telemetry, clips, zooms, leftSound, rightSound, connectZooms, zoomInDurationMs, volumes: effectAudioVolumes, startOverrides: effectAudioStartOverrides, disabledIds: disabledEffectAudioIds }).sort((a, b) => a.startMs - b.startMs),
		[telemetry, clips, zooms, connectZooms, zoomInDurationMs, leftSound, rightSound, effectAudioVolumes, effectAudioStartOverrides, disabledEffectAudioIds],
	);
	const contextRef = useRef<AudioContext | null>(null);
	const buffersRef = useRef(new Map<string, AudioBuffer>());
	const lastTimeRef = useRef<number | null>(null);
	const nextIndexRef = useRef(0);
	const pendingRegionsRef = useRef(new Map<string, (typeof regions)[number]>());
	const fallbackTimeRef = useRef(currentTime);
	fallbackTimeRef.current = currentTime;

	useEffect(() => {
		if (regions.length === 0) return;
		const context = contextRef.current ?? new AudioContext();
		contextRef.current = context;
		let cancelled = false;
		for (const path of new Set(regions.map((region) => region.audioPath))) {
			if (buffersRef.current.has(path)) continue;
			void resolveMediaResourceUrl(path)
				.then((url) => fetch(url))
				.then((response) => response.arrayBuffer())
				.then((data) => context.decodeAudioData(data))
				.then((buffer) => {
					if (!cancelled) {
						buffersRef.current.set(path, buffer);
					}
				})
				.catch(() => undefined);
		}
		return () => { cancelled = true; };
	}, [regions]);

	useEffect(() => {
		lastTimeRef.current = null;
		nextIndexRef.current = 0;
		pendingRegionsRef.current.clear();
	}, [regions]);

	useEffect(() => {
		if (isPlaying) return;
		lastTimeRef.current = null;
		pendingRegionsRef.current.clear();
		nextIndexRef.current = regions.findIndex((region) => region.startMs >= currentTime * 1000);
		if (nextIndexRef.current < 0) nextIndexRef.current = regions.length;
	}, [currentTime, isPlaying, regions]);

	useEffect(() => {
		if (!isPlaying) return;
		const context = contextRef.current;
		if (!context) return;
		if (context.state === "suspended") void context.resume().catch(() => undefined);

		const scheduleAt = (time: number) => {
			const previous = lastTimeRef.current;
			lastTimeRef.current = time;
			if (previous === null || time < previous) {
				pendingRegionsRef.current.clear();
				nextIndexRef.current = regions.findIndex((region) => region.startMs >= time * 1000);
				if (nextIndexRef.current < 0) nextIndexRef.current = regions.length;
				return;
			}
			const playRegion = (region: (typeof regions)[number]) => {
				const buffer = buffersRef.current.get(region.audioPath);
				if (!buffer) {
					if (time * 1000 - region.startMs > MAX_PENDING_AUDIO_DECODE_WAIT_MS) {
						pendingRegionsRef.current.delete(region.id);
						return;
					}
					pendingRegionsRef.current.set(region.id, region);
					return;
				}
				pendingRegionsRef.current.delete(region.id);
				const lateBySeconds = Math.max(0, time - region.startMs / 1000);
				if (lateBySeconds >= buffer.duration) return;
				try {
					const source = context.createBufferSource();
					const gain = context.createGain();
					source.buffer = buffer;
					gain.gain.value = Math.max(0, Math.min(1, volume)) * region.volume;
					source.connect(gain).connect(context.destination);
					source.start(0, lateBySeconds);
				} catch {
					// An invalid or stale cue must not interrupt scheduling later clicks.
				}
			};
			for (const region of pendingRegionsRef.current.values()) playRegion(region);
			while (nextIndexRef.current < regions.length && regions[nextIndexRef.current].startMs <= time * 1000) {
				const region = regions[nextIndexRef.current++];
				playRegion(region);
			}
		};

		let frame = 0;
		const tick = () => {
			const time = playbackRef.current?.timelineTime ?? fallbackTimeRef.current;
			scheduleAt(time);
			frame = requestAnimationFrame(tick);
		};
		tick();
		return () => cancelAnimationFrame(frame);
	}, [isPlaying, playbackRef, regions, volume]);

	useEffect(() => () => { void contextRef.current?.close(); }, []);
}
