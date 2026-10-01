import { useEffect, useMemo, useRef } from "react";
import { resolveMediaResourceUrl } from "@/lib/exporter/localMediaSource";
import { buildClickSoundRegions, type ClickSoundId } from "../clickSounds";
import type { ClipRegion, CursorTelemetryPoint } from "../types";

export function useClickSoundPreview({
	telemetry,
	clips,
	leftSound,
	rightSound,
	currentTime,
	isPlaying,
	volume,
}: {
	telemetry: CursorTelemetryPoint[];
	clips: ClipRegion[];
	leftSound: ClickSoundId;
	rightSound: ClickSoundId;
	currentTime: number;
	isPlaying: boolean;
	volume: number;
}) {
	const regions = useMemo(
		() => buildClickSoundRegions(telemetry, clips, leftSound, rightSound),
		[telemetry, clips, leftSound, rightSound],
	);
	const contextRef = useRef<AudioContext | null>(null);
	const buffersRef = useRef(new Map<string, AudioBuffer>());
	const lastTimeRef = useRef<number | null>(null);
	const nextIndexRef = useRef(0);

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
					if (!cancelled) buffersRef.current.set(path, buffer);
				})
				.catch(() => undefined);
		}
		return () => { cancelled = true; };
	}, [regions]);

	useEffect(() => {
		lastTimeRef.current = null;
		nextIndexRef.current = 0;
	}, [regions]);

	useEffect(() => {
		const previous = lastTimeRef.current;
		lastTimeRef.current = currentTime;
		if (!isPlaying || previous === null || currentTime < previous || currentTime - previous > 0.3) {
			nextIndexRef.current = regions.findIndex((region) => region.startMs > currentTime * 1000);
			if (nextIndexRef.current < 0) nextIndexRef.current = regions.length;
			return;
		}
		const context = contextRef.current;
		if (!context) return;
		if (context.state === "suspended") void context.resume().catch(() => undefined);
		while (nextIndexRef.current < regions.length && regions[nextIndexRef.current].startMs <= currentTime * 1000) {
			const region = regions[nextIndexRef.current++];
			const buffer = buffersRef.current.get(region.audioPath);
			if (!buffer) continue;
			const source = context.createBufferSource();
			const gain = context.createGain();
			source.buffer = buffer;
			gain.gain.value = Math.max(0, Math.min(1, volume)) * region.volume;
			source.connect(gain).connect(context.destination);
			source.start();
		}
	}, [currentTime, isPlaying, regions, volume]);

	useEffect(() => () => { void contextRef.current?.close(); }, []);
}
