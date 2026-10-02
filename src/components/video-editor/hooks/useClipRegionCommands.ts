import type { ClipSequenceSpan } from "../timeline/core/timelineTypes";
import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback } from "react";
import { toast } from "@/components/ui/toast";
import { changeClipSpan } from "../clipSpanChange";
import {
	packClipSequence,
	reorderClipSequence,
	rippleEffectAudioStartOverrides,
	rippleRegionAnchors,
	rippleRegions,
} from "../clipSequence";
import { getClipSourceStartMs, type AnnotationRegion, type AudioRegion } from "../types";
import { planClipSplit } from "../clipSplit";
import type { ClipRegion, EditorEffectSection, ZoomRegion } from "../types";
import { supportsPreviewPlaybackRate } from "../videoPlayback/playbackRate";

type Translator = (
	key: string,
	fallback?: string,
	params?: Record<string, string | number>,
) => string;

interface UseClipRegionCommandsParams {
	setAnnotationRegions: Dispatch<SetStateAction<AnnotationRegion[]>>;
	setAudioRegions: Dispatch<SetStateAction<AudioRegion[]>>;
	setEffectAudioStartOverrides: Dispatch<SetStateAction<Record<string, number>>>;
	sourceDurationMs: number;
	clipRegions: ClipRegion[];
	setClipRegions: Dispatch<SetStateAction<ClipRegion[]>>;
	zoomRegions: ZoomRegion[];
	setZoomRegions: Dispatch<SetStateAction<ZoomRegion[]>>;
	selectedClipId: string | null;
	selectedTrackItems: { kind: "zoom" | "clip" | "audio"; ids: string[] } | null;
	setSelectedTrackItems: Dispatch<SetStateAction<{ kind: "zoom" | "clip" | "audio"; ids: string[] } | null>>;
	setSelectedClipId: Dispatch<SetStateAction<string | null>>;
	setSelectedZoomId: Dispatch<SetStateAction<string | null>>;
	setSelectedAnnotationId: Dispatch<SetStateAction<string | null>>;
	setSelectedAudioId: Dispatch<SetStateAction<string | null>>;
	setSelectedCaptionId: Dispatch<SetStateAction<string | null>>;
	setActiveEffectSection: Dispatch<SetStateAction<EditorEffectSection>>;
	nextClipIdRef: MutableRefObject<number>;
	t: Translator;
}

export function useClipRegionCommands({
	setAnnotationRegions,
	setAudioRegions,
	setEffectAudioStartOverrides,
	sourceDurationMs,
	clipRegions,
	setClipRegions,
	setZoomRegions,
	selectedClipId,
	selectedTrackItems,
	setSelectedTrackItems,
	setSelectedClipId,
	setSelectedZoomId,
	setSelectedAnnotationId,
	setSelectedAudioId,
	setSelectedCaptionId,
	setActiveEffectSection,
	nextClipIdRef,
	t,
}: UseClipRegionCommandsParams) {
	const applySequence = useCallback(
		(edited: ClipRegion[]) => {
			const next = packClipSequence(edited);
			setClipRegions(next);
			setZoomRegions((current) => rippleRegions(current, clipRegions, next));
			setAnnotationRegions((current) => rippleRegions(current, clipRegions, next));
			setAudioRegions((current) => rippleRegionAnchors(current, clipRegions, next));
			setEffectAudioStartOverrides((current) =>
				rippleEffectAudioStartOverrides(current, clipRegions, next),
			);
		},
		[clipRegions, setClipRegions, setZoomRegions, setAnnotationRegions, setAudioRegions, setEffectAudioStartOverrides],
	);

	const selectedIds = selectedTrackItems?.kind === "clip" && selectedClipId && selectedTrackItems.ids.includes(selectedClipId)
		? selectedTrackItems.ids : selectedClipId ? [selectedClipId] : [];

	const handleSelectClip = useCallback(
		(id: string | null) => {
			setSelectedClipId(id);
			if (id) {
				setActiveEffectSection("clip");
				setSelectedZoomId(null);
				setSelectedAnnotationId(null);
				setSelectedAudioId(null);
				setSelectedCaptionId(null);
			} else {
				setActiveEffectSection((section) => (section === "clip" ? "scene" : section));
			}
		},
		[
			setActiveEffectSection,
			setSelectedAnnotationId,
			setSelectedAudioId,
			setSelectedCaptionId,
			setSelectedClipId,
			setSelectedZoomId,
		],
	);

	const handleClipSplit = useCallback(
		(splitMs: number) => {
			const plan = planClipSplit({
				clipRegions,
				splitMs,
				createId: () => `clip-${nextClipIdRef.current++}`,
			});
			if (!plan) return;
			setClipRegions((current) =>
				current.flatMap((clip) =>
					clip.id === plan.targetId ? [plan.left, plan.right] : [clip],
				),
			);
			if (selectedClipId === plan.targetId) setSelectedClipId(plan.left.id);
		},
		[clipRegions, nextClipIdRef, selectedClipId, setClipRegions, setSelectedClipId],
	);

	const handleClipSpanChange = useCallback(
		(id: string, span: ClipSequenceSpan) => {
			const oldClip = clipRegions.find((clip) => clip.id === id);
			const newStart = Math.round(span.start);
			const newEnd = Math.round(span.end);

			if (!oldClip) return;
			if (span.sequenceIndex !== undefined) {
				applySequence(reorderClipSequence(clipRegions, id, span.sequenceIndex));
				return;
			}
			applySequence(
				clipRegions.map((clip) =>
					clip.id === id
						? changeClipSpan(clip, newStart, newEnd, sourceDurationMs)
						: clip,
				),
			);
		},
		[clipRegions, applySequence, sourceDurationMs],
	);

	const handleClipSpeedChange = useCallback(
		(speed: number) => {
			if (!selectedClipId || !Number.isFinite(speed) || speed <= 0) return;
			if (!supportsPreviewPlaybackRate(speed)) {
				toast.error(
					t(
						"editor.timeline.unsupportedSpeed",
						"This speed is not supported for preview on this device.",
					),
				);
				return;
			}

			applySequence(
				clipRegions.map((clip) =>
					selectedIds.includes(clip.id)
						? {
								...clip,
								sourceStartMs: getClipSourceStartMs(clip),
								speed,
								endMs:
									clip.startMs +
									Math.max(
										1,
										Math.round(
											((clip.endMs - clip.startMs) * clip.speed) / speed,
										),
									),
							}
						: clip,
				),
			);
		},
		[clipRegions, selectedClipId, selectedIds, applySequence, t],
	);

	const handleClipMutedChange = useCallback(
		(muted: boolean) => {
			if (!selectedClipId) return;
			setClipRegions((current) =>
				current.map((clip) => (selectedIds.includes(clip.id) ? { ...clip, muted } : clip)),
			);
		},
		[selectedClipId, selectedIds, setClipRegions],
	);
	const handleClipShowSourceAudioChange = useCallback(
		(showSourceAudio: boolean) => {
			if (!selectedClipId) return;
			setClipRegions((current) =>
				current.map((clip) =>
					selectedIds.includes(clip.id) ? { ...clip, showSourceAudio } : clip,
				),
			);
		},
		[selectedClipId, selectedIds, setClipRegions],
	);

	const handleClipDelete = useCallback(
		(id: string) => {
			const ids = selectedIds.includes(id) ? selectedIds : [id];
			applySequence(clipRegions.filter((clip) => !ids.includes(clip.id)));
			if (selectedClipId && ids.includes(selectedClipId)) {
				setSelectedClipId(null);
				setSelectedTrackItems(null);
			}
		},
		[clipRegions, selectedIds, selectedClipId, applySequence, setSelectedClipId, setSelectedTrackItems],
	);

	return {
		handleSelectClip,
		handleClipSplit,
		handleClipSpanChange,
		handleClipSpeedChange,
		handleClipMutedChange,
		handleClipShowSourceAudioChange,
		handleClipDelete,
	};
}
