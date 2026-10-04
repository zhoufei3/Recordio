import thinFilm from "@/assets/typing-sounds/薄膜键盘音色.mp3";
import single from "@/assets/typing-sounds/单次打字音效.mp3";
import mechanicalCalm from "@/assets/typing-sounds/机械-沉稳音色.mp3";
import mechanicalMahjong from "@/assets/typing-sounds/机械-麻将音色.mp3";
import mechanicalBright from "@/assets/typing-sounds/机械-明亮音色.mp3";
import apple from "@/assets/typing-sounds/苹果键盘音色.mp3";
import standard from "@/assets/typing-sounds/普通键盘音色.mp3";
import {
	getClipSourceEndMs,
	getClipSourceStartMs,
	type AudioRegion,
	type ClipRegion,
	type CursorTelemetryPoint,
} from "./types";

export type TypingSoundId =
	| "none"
	| "single"
	| "thin-film"
	| "mechanical-calm"
	| "mechanical-mahjong"
	| "mechanical-bright"
	| "apple"
	| "standard";

const soundSources: Record<Exclude<TypingSoundId, "none">, string> = {
	single,
	"thin-film": thinFilm,
	"mechanical-calm": mechanicalCalm,
	"mechanical-mahjong": mechanicalMahjong,
	"mechanical-bright": mechanicalBright,
	apple,
	standard,
};

export const TYPING_SOUND_OPTIONS: ReadonlyArray<{
	id: Exclude<TypingSoundId, "none">;
	translationKey: string;
}> = [
	{ id: "single", translationKey: "effects.typingSounds.single" },
	{ id: "thin-film", translationKey: "effects.typingSounds.thinFilm" },
	{ id: "mechanical-calm", translationKey: "effects.typingSounds.mechanicalCalm" },
	{ id: "mechanical-mahjong", translationKey: "effects.typingSounds.mechanicalMahjong" },
	{ id: "mechanical-bright", translationKey: "effects.typingSounds.mechanicalBright" },
	{ id: "apple", translationKey: "effects.typingSounds.apple" },
	{ id: "standard", translationKey: "effects.typingSounds.standard" },
];

export function getTypingSoundUrl(sound: Exclude<TypingSoundId, "none">) {
	return soundSources[sound];
}

export function normalizeTypingSoundId(value: unknown): TypingSoundId {
	if (value === "soft") return "standard";
	if (value === "mechanical") return "mechanical-calm";
	return value === "single" || value === "thin-film" || value === "mechanical-calm" ||
		value === "mechanical-mahjong" || value === "mechanical-bright" || value === "apple" ||
		value === "standard" ? value : "none";
}

const KEY_DURATION_MS = 80;
const MAX_TYPING_GAP_MS = 600;
const MAX_TYPING_BURST_MS = 4000;
const plans = new WeakMap<
	CursorTelemetryPoint[],
	{ clips: ClipRegion[]; sound: TypingSoundId; regions: AudioRegion[] }
>();

export function buildTypingSoundRegions(
	telemetry: CursorTelemetryPoint[],
	clips: ClipRegion[],
	sound: TypingSoundId,
): AudioRegion[] {
	if (sound === "none") return [];
	const cached = plans.get(telemetry);
	if (cached?.clips === clips && cached.sound === sound) return cached.regions;
	const events = telemetry
		.filter((point) => point.typing === true && Number.isFinite(point.timeMs))
		.sort((a, b) => a.timeMs - b.timeMs);
	const regions: AudioRegion[] = [];
	for (const clip of clips.length ? clips : [null]) {
		const sourceStart = clip ? getClipSourceStartMs(clip) : 0;
		const sourceEnd = clip ? getClipSourceEndMs(clip) : Infinity;
		const speed = clip && clip.speed > 0 ? clip.speed : 1;
		let presses: { time: number; sourceTime: number }[] = [];
		let lastSinglePressTime = -Infinity;
		const addRegion = (startMs: number, endMs: number, id: string) => {
			if (endMs <= startMs) return;
			regions.push({
				id,
				label: "键盘打字音效",
				startMs,
				endMs,
				audioPath: soundSources[sound],
				volume: 0.35,
				effectKind: "typing",
			});
		};
		const flush = () => {
			if (!presses.length) return;
			const startMs = presses[0].time;
			const endMs = Math.min(
				clip?.endMs ?? Infinity,
				presses[presses.length - 1].time + KEY_DURATION_MS,
			);
			addRegion(startMs, endMs, `typing-sound-${clip?.id ?? "source"}-${presses[0].sourceTime}`);
			presses = [];
		};
		for (const event of events) {
			if (event.timeMs < sourceStart || event.timeMs >= sourceEnd) continue;
			const time = (clip?.startMs ?? 0) + (event.timeMs - sourceStart) / speed;
			const previous = presses[presses.length - 1];
			if (previous && time - previous.time < 30) continue;
			if (sound === "single") {
				if (time - lastSinglePressTime < 30) continue;
				lastSinglePressTime = time;
				addRegion(
					time,
					Math.min(clip?.endMs ?? Infinity, time + KEY_DURATION_MS),
					`typing-sound-${clip?.id ?? "source"}-${event.timeMs}`,
				);
				continue;
			}
			if (
				previous &&
				(event.timeMs - previous.sourceTime > MAX_TYPING_GAP_MS ||
					event.timeMs - presses[0].sourceTime > MAX_TYPING_BURST_MS)
			)
				flush();
			presses.push({ time, sourceTime: event.timeMs });
		}
		flush();
	}
	regions.sort((a, b) => a.startMs - b.startMs);
	plans.set(telemetry, { clips, sound, regions });
	return regions;
}
