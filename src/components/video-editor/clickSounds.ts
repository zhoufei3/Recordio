import sound01 from "@/assets/click-sounds/01.wav";
import sound02 from "@/assets/click-sounds/02.wav";
import sound03 from "@/assets/click-sounds/03.wav";
import sound04 from "@/assets/click-sounds/04.wav";
import sound05 from "@/assets/click-sounds/05.wav";
import sound06 from "@/assets/click-sounds/06.wav";
import sound07 from "@/assets/click-sounds/07.wav";
import sound08 from "@/assets/click-sounds/08.wav";
import sound09 from "@/assets/click-sounds/09.wav";
import sound10 from "@/assets/click-sounds/10.wav";
import sound11 from "@/assets/click-sounds/11.wav";
import sound12 from "@/assets/click-sounds/12.wav";
import sound13 from "@/assets/click-sounds/13.wav";
import { getCustomSounds } from "./customSounds";
import {
	getClipSourceEndMs,
	getClipSourceStartMs,
	type AudioRegion,
	type ClipRegion,
	type CursorTelemetryPoint,
} from "./types";

export const CLICK_SOUNDS = [
	{ id: "click-1", url: sound01, durationMs: 75 },
	{ id: "click-2", url: sound02, durationMs: 55 },
	{ id: "click-3", url: sound03, durationMs: 110 },
	{ id: "click-4", url: sound04, durationMs: 45 },
	{ id: "click-5", url: sound05, durationMs: 130 },
	{ id: "click-6", url: sound06, durationMs: 160 },
	{ id: "click-7", url: sound07, durationMs: 55 },
	{ id: "click-8", url: sound08, durationMs: 95 },
	{ id: "click-9", url: sound09, durationMs: 120 },
	{ id: "click-10", url: sound10, durationMs: 150 },
	{ id: "click-11", url: sound11, durationMs: 125 },
	{ id: "click-12", url: sound12, durationMs: 125 },
	{ id: "click-13", url: sound13, durationMs: 125 },
] as const;

export type ClickSoundId = "none" | string;

export function getAvailableClickSounds() {
	return [...CLICK_SOUNDS, ...getCustomSounds("click")];
}

export function normalizeClickSoundId(value: unknown): ClickSoundId {
	return getAvailableClickSounds().find((sound) => sound.id === value)?.id ?? "none";
}

export function buildClickSoundRegions(
	telemetry: CursorTelemetryPoint[],
	clips: ClipRegion[],
	leftSoundId: ClickSoundId,
	rightSoundId: ClickSoundId,
): AudioRegion[] {
	if (leftSoundId === "none" && rightSoundId === "none") return [];
	const regions: AudioRegion[] = [];
	for (const [index, point] of telemetry.entries()) {
		const selected =
			point.interactionType === "right-click"
				? rightSoundId
				: point.interactionType === "click" || point.interactionType === "double-click"
					? leftSoundId
					: "none";
		const sound = getAvailableClickSounds().find((item) => item.id === selected);
		if (!sound) continue;
		const matchingClips = clips.length
			? clips.filter(
					(clip) =>
						point.timeMs >= getClipSourceStartMs(clip) &&
						point.timeMs < getClipSourceEndMs(clip),
				)
			: [null];
		for (const [clipIndex, clip] of matchingClips.entries()) {
			const speed = clip && Number.isFinite(clip.speed) && clip.speed > 0 ? clip.speed : 1;
			const startMs = clip
				? clip.startMs + (point.timeMs - getClipSourceStartMs(clip)) / speed
				: point.timeMs;
			const endMs = clip
				? Math.min(clip.endMs, startMs + sound.durationMs)
				: startMs + sound.durationMs;
			if (endMs <= startMs) continue;
			regions.push({
				id: `click-sound-${index}-${clipIndex}`,
				label: point.interactionType === "right-click" ? "右键点击音效" : "左键点击音效",
				startMs,
				endMs,
				audioPath: sound.url,
				volume: 0.55,
			});
		}
	}
	return regions.sort((a, b) => a.startMs - b.startMs);
}
