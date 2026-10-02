import type { Span } from "dnd-timeline";
import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback } from "react";
import type { AudioRegion, EditorEffectSection, ZoomRegion } from "../types";
import { isEffectAudioId } from "../effectAudio";

interface UseAudioRegionCommandsParams {
	setSelectedClipId: Dispatch<SetStateAction<string | null>>;
	setAudioRegions: Dispatch<SetStateAction<AudioRegion[]>>;
	setEffectAudioVolumes: Dispatch<SetStateAction<Record<string, number>>>;
	setEffectAudioStartOverrides: Dispatch<SetStateAction<Record<string, number>>>;
	setDisabledEffectAudioIds: Dispatch<SetStateAction<string[]>>;
	setZoomRegions: Dispatch<SetStateAction<ZoomRegion[]>>;
	selectedAudioId: string | null;
	selectedTrackItems: { kind: "zoom" | "clip" | "audio"; ids: string[] } | null;
	setSelectedTrackItems: Dispatch<SetStateAction<{ kind: "zoom" | "clip" | "audio"; ids: string[] } | null>>;
	setSelectedAudioId: Dispatch<SetStateAction<string | null>>;
	setSelectedZoomId: Dispatch<SetStateAction<string | null>>;
	setSelectedAnnotationId: Dispatch<SetStateAction<string | null>>;
	setSelectedCaptionId: Dispatch<SetStateAction<string | null>>;
	setActiveEffectSection: Dispatch<SetStateAction<EditorEffectSection>>;
	nextAudioIdRef: MutableRefObject<number>;
}

export function useAudioRegionCommands({
	setSelectedClipId,
	setAudioRegions,
	setEffectAudioVolumes,
	setEffectAudioStartOverrides,
	setDisabledEffectAudioIds,
	setZoomRegions,
	selectedAudioId,
	selectedTrackItems,
	setSelectedTrackItems,
	setSelectedAudioId,
	setSelectedZoomId,
	setSelectedAnnotationId,
	setSelectedCaptionId,
	setActiveEffectSection,
	nextAudioIdRef,
}: UseAudioRegionCommandsParams) {
	const selectedIds = selectedTrackItems?.kind === "audio" && selectedAudioId && selectedTrackItems.ids.includes(selectedAudioId)
		? selectedTrackItems.ids : selectedAudioId ? [selectedAudioId] : [];

	const handleSelectAudio = useCallback(
		(id: string | null) => {
			setSelectedAudioId(id);
			if (id) {
				setSelectedZoomId(null);
				setSelectedAnnotationId(null);
				setSelectedClipId(null);
				setSelectedCaptionId(null);
				setActiveEffectSection("audio");
			}
		},
		[
			setActiveEffectSection,
			setSelectedAnnotationId,
			setSelectedClipId,
			setSelectedAudioId,
			setSelectedCaptionId,
			setSelectedZoomId,
		],
	);

	const handleAudioAdded = useCallback(
		(span: Span, audioPath: string, trackIndex?: number) => {
			const id = `audio-${nextAudioIdRef.current++}`;
			const newRegion: AudioRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				audioPath,
				volume: 1,
				normalize: false,
				trackIndex,
			};
			setAudioRegions((current) => [...current, newRegion]);
			setSelectedAudioId(id);
			setSelectedZoomId(null);
			setSelectedAnnotationId(null);
			setSelectedClipId(null);
			setSelectedCaptionId(null);
			setActiveEffectSection("audio");
		},
		[
			nextAudioIdRef,
			setActiveEffectSection,
			setAudioRegions,
			setSelectedAnnotationId,
			setSelectedClipId,
			setSelectedAudioId,
			setSelectedCaptionId,
			setSelectedZoomId,
		],
	);

	const handleAudioSpanChange = useCallback(
		(id: string, span: Span, trackIndex?: number) => {
			if (isEffectAudioId(id)) {
				setEffectAudioStartOverrides((current) => ({ ...current, [id]: Math.max(0, Math.round(span.start)) }));
				return;
			}
			const normalizedTrackIndex =
				typeof trackIndex === "number" && Number.isFinite(trackIndex)
					? Math.max(0, Math.floor(trackIndex))
					: undefined;
			setAudioRegions((current) =>
				current.map((region) =>
					region.id === id
						? {
								...region,
								startMs: Math.round(span.start),
								endMs: Math.round(span.end),
								...(normalizedTrackIndex === undefined
									? {}
									: { trackIndex: normalizedTrackIndex }),
							}
						: region,
				),
			);
		},
		[setAudioRegions, setEffectAudioStartOverrides],
	);

	const handleAudioVolumeChange = useCallback(
		(volume: number) => {
			if (!selectedAudioId || !Number.isFinite(volume)) return;
			const nextVolume = Math.max(0, Math.min(1, volume));
			const effects = selectedIds.filter(isEffectAudioId);
			const audioIds = selectedIds.filter((id) => !isEffectAudioId(id));
			if (effects.length) setEffectAudioVolumes((current) => ({ ...current,
				...Object.fromEntries(effects.map((id) => [id, nextVolume])),
			}));
			if (audioIds.length) {
				setAudioRegions((current) => current.map((region) =>
					audioIds.includes(region.id) ? { ...region, volume: nextVolume } : region,
				));
			}
		},
		[selectedAudioId, selectedIds, setAudioRegions, setEffectAudioVolumes],
	);

	const handleAudioDelete = useCallback(
		(id: string) => {
			const ids = selectedIds.includes(id) ? selectedIds : [id];
			const effects = ids.filter(isEffectAudioId);
			const audioIds = ids.filter((audioId) => !isEffectAudioId(audioId));
			const clickEffects = effects.filter((effectId) => effectId.startsWith("click-sound-"));
			if (clickEffects.length) setDisabledEffectAudioIds((current) => [...new Set([...current, ...clickEffects])]);
			const deletedZoomCues = effects.filter((effectId) => effectId.startsWith("zoom-sound-"));
			if (deletedZoomCues.length) {
				setZoomRegions((current) => current.map((zoom) => {
					const cueKinds = deletedZoomCues
						.filter((effectId) => effectId.startsWith(`zoom-sound-${zoom.id}-`))
						.map((effectId) => effectId.slice(`zoom-sound-${zoom.id}-`.length).split("-")[0]);
					return {
						...zoom,
						...(cueKinds.includes("in") ? { soundId: "none" as const } : {}),
						...(cueKinds.includes("out") ? { outSoundId: "none" as const } : {}),
						...(cueKinds.includes("move") || cueKinds.includes("connected") ? { panSoundId: "none" as const } : {}),
					};
				}));
			}
			if (audioIds.length) setAudioRegions((current) => current.filter((region) => !audioIds.includes(region.id)));
			if (selectedAudioId && ids.includes(selectedAudioId)) {
				setSelectedAudioId(null);
				setSelectedTrackItems(null);
			}
		},
		[selectedIds, selectedAudioId, setAudioRegions, setSelectedAudioId, setSelectedTrackItems, setDisabledEffectAudioIds, setZoomRegions],
	);

	const handleAudioNormalizeChange = useCallback(
		(normalize: boolean) => {
			if (!selectedAudioId) return;
			setAudioRegions((current) =>
				current.map((region) =>
					selectedIds.includes(region.id) ? { ...region, normalize } : region,
				),
			);
		},
		[selectedAudioId, selectedIds, setAudioRegions],
	);

	return {
		handleSelectAudio,
		handleAudioAdded,
		handleAudioSpanChange,
		handleAudioVolumeChange,
		handleAudioDelete,
		handleAudioNormalizeChange,
	};
}
