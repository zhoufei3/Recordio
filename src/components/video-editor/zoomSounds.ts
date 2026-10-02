import pageFlip from "@/assets/zoom-sounds/page-flip.mp3";
import transition from "@/assets/zoom-sounds/transition.mp3";
import push from "@/assets/zoom-sounds/push.mp3";
import swoosh2 from "@/assets/zoom-sounds/swoosh-2.mp3";
import swoosh5 from "@/assets/zoom-sounds/swoosh-5.mp3";
import wooshSoft from "@/assets/zoom-sounds/woosh-soft.mp3";
import swish19 from "@/assets/zoom-sounds/swish-19.mp3";
import swish27 from "@/assets/zoom-sounds/swish-27.mp3";
import woosh1 from "@/assets/zoom-sounds/woosh-1.mp3";
import woosh2 from "@/assets/zoom-sounds/woosh-2.mp3";
import woosh3 from "@/assets/zoom-sounds/woosh-3.mp3";
import { getCustomSounds } from "./customSounds";
import { getClipSourceEndMs, getClipSourceStartMs, ZOOM_DEPTH_SCALES, type AudioRegion, type ClipRegion, type CursorTelemetryPoint, type ZoomRegion } from "./types";
import { ZOOM_IN_TRANSITION_WINDOW_MS } from "./videoPlayback/constants";
import { clampFocusToScale } from "./videoPlayback/focusUtils";

export const ZOOM_SOUNDS = [
	{ id: "zoom-1", label: "翻页", url: pageFlip, durationMs: 630 },
	{ id: "zoom-2", label: "转场", url: transition, durationMs: 840 },
	{ id: "zoom-3", label: "推进", url: push, durationMs: 840 },
	{ id: "zoom-4", label: "轻扫一", url: swoosh2, durationMs: 1100 },
	{ id: "zoom-5", label: "轻扫二", url: swoosh5, durationMs: 1460 },
	{ id: "zoom-6", label: "柔和呼啸", url: wooshSoft, durationMs: 940 },
	{ id: "zoom-7", label: "连续扫动", url: swish19, durationMs: 5830 },
	{ id: "zoom-8", label: "快速掠过", url: swish27, durationMs: 1910 },
	{ id: "zoom-9", label: "呼啸一", url: woosh1, durationMs: 1330 },
	{ id: "zoom-10", label: "呼啸二", url: woosh2, durationMs: 1150 },
	{ id: "zoom-11", label: "呼啸三", url: woosh3, durationMs: 1540 },
] as const;

export type ZoomSoundId = "none" | string;
type ZoomSoundOptions = {
	telemetry?: CursorTelemetryPoint[];
	clips?: ClipRegion[];
	connectZooms?: boolean;
	zoomInDurationMs?: number;
};

export function normalizeZoomSoundId(value: unknown): ZoomSoundId {
	return getAvailableZoomSounds().find((sound) => sound.id === value)?.id ?? "none";
}

export function getAvailableZoomSounds() {
	return [...ZOOM_SOUNDS, ...getCustomSounds("zoom")];
}

function timelineCursorPoints(telemetry: CursorTelemetryPoint[], clips: ClipRegion[]) {
	if (clips.length === 0) return telemetry;
	return clips.flatMap((clip) => {
		const sourceStart = getClipSourceStartMs(clip);
		const sourceEnd = getClipSourceEndMs(clip);
		const speed = Number.isFinite(clip.speed) && clip.speed > 0 ? clip.speed : 1;
		return telemetry.filter((point) => point.timeMs >= sourceStart && point.timeMs < sourceEnd)
			.map((point) => ({ ...point, timeMs: clip.startMs + (point.timeMs - sourceStart) / speed }));
	}).sort((a, b) => a.timeMs - b.timeMs);
}

export function buildZoomSoundRegions(zooms: ZoomRegion[], options: ZoomSoundOptions = {}): AudioRegion[] {
	const sorted = [...zooms].sort((a, b) => a.startMs - b.startMs);
	const cursorPoints = sorted.some((zoom) => normalizeZoomSoundId(zoom.panSoundId) !== "none")
		? timelineCursorPoints(options.telemetry ?? [], options.clips ?? [])
		: [];
	const regions: AudioRegion[] = [];
	const addCue = (zoom: ZoomRegion, kind: string, timeMs: number, soundId: unknown, index = 0) => {
		const sound = getAvailableZoomSounds().find((item) => item.id === soundId);
		if (!sound || timeMs < 0) return;
		regions.push({ id: `zoom-sound-${zoom.id}-${kind}-${index}`, startMs: timeMs,
			endMs: timeMs + sound.durationMs, audioPath: sound.url, volume: 0.4,
			label: kind === "in" ? "进入缩放音效" : kind === "out" ? "退出缩放音效" : "镜头移动音效" });
	};
	for (const [index, zoom] of sorted.entries()) {
		if (zoom.endMs <= zoom.startMs) continue;
		// Match the camera's lead-in and lead-out timing, including its 500 ms playback offset.
		const entryMs = Math.max(0, zoom.startMs + 1500 - ZOOM_IN_TRANSITION_WINDOW_MS);
		addCue(zoom, "in", entryMs, zoom.soundId);
		const next = sorted[index + 1];
		const connected = options.connectZooms && next && next.startMs - zoom.endMs <= 1350;
		if (connected) addCue(zoom, "connected", zoom.endMs + 500, zoom.panSoundId);
		else addCue(zoom, "out", zoom.endMs, zoom.outSoundId);
		if (zoom.mode === "manual" || normalizeZoomSoundId(zoom.panSoundId) === "none") continue;
		const panSound = getAvailableZoomSounds().find((sound) => sound.id === zoom.panSoundId);
		if (!panSound) continue;
		const scale = ZOOM_DEPTH_SCALES[zoom.depth];
		let focus = clampFocusToScale(zoom.focus, scale);
		let lastCueMs = entryMs;
		let cueIndex = 0;
		const panStart = zoom.startMs + Math.max(500, options.zoomInDurationMs ?? 500);
		let low = 0;
		let high = cursorPoints.length;
		while (low < high) {
			const middle = (low + high) >>> 1;
			if (cursorPoints[middle].timeMs < panStart) low = middle + 1;
			else high = middle;
		}
		for (let pointIndex = low; pointIndex < cursorPoints.length; pointIndex++) {
			const point = cursorPoints[pointIndex];
			if (point.timeMs >= zoom.endMs - 500) break;
			const safeHalfSpan = 0.25 / scale;
			if (Math.abs(point.cx - focus.cx) <= safeHalfSpan && Math.abs(point.cy - focus.cy) <= safeHalfSpan) continue;
			const nextFocus = clampFocusToScale({ cx: point.cx, cy: point.cy }, scale);
			const distance = Math.hypot(nextFocus.cx - focus.cx, nextFocus.cy - focus.cy);
			focus = nextFocus;
			if (distance < 0.035 || point.timeMs - lastCueMs < Math.max(700, panSound.durationMs * 0.7) || cueIndex >= 24) continue;
			addCue(zoom, "move", point.timeMs, zoom.panSoundId, cueIndex++);
			lastCueMs = point.timeMs;
		}
	}
	return regions.sort((a, b) => a.startMs - b.startMs);
}
