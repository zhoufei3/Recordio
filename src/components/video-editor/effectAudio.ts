import { buildClickSoundRegions, type ClickSoundId } from "./clickSounds";
import type { AudioRegion, ClipRegion, CursorTelemetryPoint, ZoomRegion } from "./types";
import { buildZoomSoundRegions } from "./zoomSounds";

export function isEffectAudioId(id: string | null): boolean {
	return Boolean(id && (id.startsWith("click-sound-") || id.startsWith("zoom-sound-")));
}

export function getEffectAudioVolume(id: string, volumes: Record<string, number>): number {
	const stored = volumes[id];
	return Number.isFinite(stored) ? Math.max(0, Math.min(1, stored)) : id.startsWith("click-sound-") ? 0.55 : 0.4;
}

export function buildEffectAudioRegions({
	telemetry, clips, zooms, leftSound, rightSound, connectZooms, zoomInDurationMs,
	volumes = {}, startOverrides = {}, disabledIds = [], firstTrackIndex = 0,
}: {
	telemetry: CursorTelemetryPoint[];
	clips: ClipRegion[];
	zooms: ZoomRegion[];
	leftSound: ClickSoundId;
	rightSound: ClickSoundId;
	connectZooms: boolean;
	zoomInDurationMs: number;
	volumes?: Record<string, number>;
	startOverrides?: Record<string, number>;
	disabledIds?: string[];
	firstTrackIndex?: number;
}): AudioRegion[] {
	const clicks = buildClickSoundRegions(telemetry, clips, leftSound, rightSound);
	const zoomSounds = buildZoomSoundRegions(zooms, { telemetry, clips, connectZooms, zoomInDurationMs });
	return [
		...clicks.filter((region) => !disabledIds.includes(region.id)).map((region) => applyEffectAudioStart(region, volumes, startOverrides, firstTrackIndex, "click")),
		...zoomSounds.map((region) => applyEffectAudioStart(region, volumes, startOverrides, firstTrackIndex + 1, "zoom")),
	];
}

function applyEffectAudioStart(
	region: AudioRegion,
	volumes: Record<string, number>,
	startOverrides: Record<string, number>,
	trackIndex: number,
	effectKind: "click" | "zoom",
): AudioRegion {
	const startMs = Number.isFinite(startOverrides[region.id])
		? Math.max(0, Math.round(startOverrides[region.id]))
		: region.startMs;
	return {
		...region,
		startMs,
		endMs: startMs + (region.endMs - region.startMs),
		volume: getEffectAudioVolume(region.id, volumes),
		trackIndex,
		effectKind,
	};
}
