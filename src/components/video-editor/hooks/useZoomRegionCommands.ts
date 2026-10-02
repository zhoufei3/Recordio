import type { Span } from "dnd-timeline";
import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback } from "react";
import { normalizeZoomSoundId, type ZoomSoundId } from "../zoomSounds";
import {
	clampFocusToDepth,
	DEFAULT_AUTO_ZOOM_DEPTH,
	DEFAULT_ZOOM_DEPTH,
	type EditorEffectSection,
	type ZoomDepth,
	type ZoomFocus,
	type ZoomMode,
	type ZoomRegion,
} from "../types";

interface UseZoomRegionCommandsParams {
	setSelectedClipId: Dispatch<SetStateAction<string | null>>;
	videoPath: string | null;
	setZoomRegions: Dispatch<SetStateAction<ZoomRegion[]>>;
	defaultZoomSoundId: ZoomSoundId;
	defaultZoomPanSoundId: ZoomSoundId;
	defaultZoomOutSoundId: ZoomSoundId;
	selectedZoomId: string | null;
	selectedTrackItems: { kind: "zoom" | "clip" | "audio"; ids: string[] } | null;
	setSelectedTrackItems: Dispatch<SetStateAction<{ kind: "zoom" | "clip" | "audio"; ids: string[] } | null>>;
	setSelectedZoomId: Dispatch<SetStateAction<string | null>>;
	setSelectedAnnotationId: Dispatch<SetStateAction<string | null>>;
	setSelectedAudioId: Dispatch<SetStateAction<string | null>>;
	setSelectedCaptionId: Dispatch<SetStateAction<string | null>>;
	setActiveEffectSection: Dispatch<SetStateAction<EditorEffectSection>>;
	nextZoomIdRef: MutableRefObject<number>;
	autoSuggestedVideoPathRef: MutableRefObject<string | null>;
	pendingFreshRecordingAutoZoomPathRef: MutableRefObject<string | null>;
}

export function useZoomRegionCommands({
	setSelectedClipId,
	videoPath,
	setZoomRegions,
	defaultZoomSoundId,
	defaultZoomPanSoundId,
	defaultZoomOutSoundId,
	selectedZoomId,
	selectedTrackItems,
	setSelectedTrackItems,
	setSelectedZoomId,
	setSelectedAnnotationId,
	setSelectedAudioId,
	setSelectedCaptionId,
	setActiveEffectSection,
	nextZoomIdRef,
	autoSuggestedVideoPathRef,
	pendingFreshRecordingAutoZoomPathRef,
}: UseZoomRegionCommandsParams) {
	const selectedIds = selectedTrackItems?.kind === "zoom" && selectedZoomId && selectedTrackItems.ids.includes(selectedZoomId)
		? selectedTrackItems.ids : selectedZoomId ? [selectedZoomId] : [];

	const handleSelectZoom = useCallback(
		(id: string | null) => {
			setSelectedZoomId(id);
			if (id) {
				setActiveEffectSection("zoom");
				setSelectedAnnotationId(null);
				setSelectedClipId(null);
				setSelectedAudioId(null);
				setSelectedCaptionId(null);
			} else {
				setActiveEffectSection((section) => (section === "zoom" ? "scene" : section));
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

	const markFreshRecordingSuggestion = useCallback(() => {
		if (videoPath && pendingFreshRecordingAutoZoomPathRef.current === videoPath) {
			autoSuggestedVideoPathRef.current = videoPath;
			pendingFreshRecordingAutoZoomPathRef.current = null;
		}
	}, [autoSuggestedVideoPathRef, pendingFreshRecordingAutoZoomPathRef, videoPath]);

	const handleZoomAdded = useCallback(
		(span: Span) => {
			const id = `zoom-${nextZoomIdRef.current++}`;
			const depth = DEFAULT_ZOOM_DEPTH;
			const newRegion: ZoomRegion = {
				id,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				depth,
				focus: clampFocusToDepth({ cx: 0.5, cy: 0.5 }, depth),
				// Mode describes camera tracking behavior, not how the region was created.
				mode: "auto",
				soundId: defaultZoomSoundId,
				panSoundId: defaultZoomPanSoundId,
				outSoundId: defaultZoomOutSoundId,
			};
			markFreshRecordingSuggestion();
			setZoomRegions((current) => [...current, newRegion]);
			setSelectedZoomId(id);
			setSelectedAnnotationId(null);
			setSelectedClipId(null);
			setSelectedCaptionId(null);
		},
		[
			markFreshRecordingSuggestion,
			nextZoomIdRef,
			setSelectedAnnotationId,
			setSelectedClipId,
			setSelectedCaptionId,
			setSelectedZoomId,
			setZoomRegions,
			defaultZoomSoundId,
			defaultZoomPanSoundId,
			defaultZoomOutSoundId,
		],
	);

	const handleZoomSuggested = useCallback(
		(span: Span, focus: ZoomFocus) => {
			const newRegion: ZoomRegion = {
				id: `zoom-${nextZoomIdRef.current++}`,
				startMs: Math.round(span.start),
				endMs: Math.round(span.end),
				depth: DEFAULT_AUTO_ZOOM_DEPTH,
				focus: clampFocusToDepth(focus, DEFAULT_AUTO_ZOOM_DEPTH),
				mode: "auto",
				soundId: defaultZoomSoundId,
				panSoundId: defaultZoomPanSoundId,
				outSoundId: defaultZoomOutSoundId,
			};
			markFreshRecordingSuggestion();
			setZoomRegions((current) => [...current, newRegion]);
		},
		[markFreshRecordingSuggestion, nextZoomIdRef, setZoomRegions, defaultZoomSoundId, defaultZoomPanSoundId, defaultZoomOutSoundId],
	);

	const handleZoomSpanChange = useCallback(
		(id: string, span: Span) => {
			setZoomRegions((current) =>
				current.map((region) =>
					region.id === id
						? {
								...region,
								startMs: Math.round(span.start),
								endMs: Math.round(span.end),
							}
						: region,
				),
			);
		},
		[setZoomRegions],
	);
	const handleZoomFocusChange = useCallback(
		(id: string, focus: ZoomFocus) => {
			setZoomRegions((current) =>
				current.map((region) =>
					region.id === id
						? { ...region, focus: clampFocusToDepth(focus, region.depth) }
						: region,
				),
			);
		},
		[setZoomRegions],
	);
	const handleZoomDepthChange = useCallback(
		(depth: ZoomDepth) => {
			if (!selectedZoomId) return;
			setZoomRegions((current) =>
				current.map((region) =>
					selectedIds.includes(region.id)
						? { ...region, depth, focus: clampFocusToDepth(region.focus, depth) }
						: region,
				),
			);
		},
		[selectedZoomId, selectedIds, setZoomRegions],
	);
	const handleZoomModeChange = useCallback(
		(mode: ZoomMode) => {
			if (!selectedZoomId) return;
			setZoomRegions((current) =>
				current.map((region) =>
					selectedIds.includes(region.id) ? { ...region, mode } : region,
				),
			);
		},
		[selectedZoomId, selectedIds, setZoomRegions],
	);
	const handleZoomSoundChange = useCallback((soundId: ZoomSoundId) => {
		if (!selectedZoomId) return;
		setZoomRegions((current) => current.map((region) =>
			selectedIds.includes(region.id) ? { ...region, soundId: normalizeZoomSoundId(soundId) } : region,
		));
	}, [selectedZoomId, selectedIds, setZoomRegions]);
	const handleZoomPanSoundChange = useCallback((panSoundId: ZoomSoundId) => {
		if (!selectedZoomId) return;
		setZoomRegions((current) => current.map((region) =>
			selectedIds.includes(region.id) ? { ...region, panSoundId: normalizeZoomSoundId(panSoundId) } : region,
		));
	}, [selectedZoomId, selectedIds, setZoomRegions]);
	const handleZoomOutSoundChange = useCallback((outSoundId: ZoomSoundId) => {
		if (!selectedZoomId) return;
		setZoomRegions((current) => current.map((region) =>
			selectedIds.includes(region.id) ? { ...region, outSoundId: normalizeZoomSoundId(outSoundId) } : region,
		));
	}, [selectedZoomId, selectedIds, setZoomRegions]);
	const handleApplyZoomSoundToAll = useCallback(() => {
		if (!selectedZoomId) return;
		setZoomRegions((current) => {
			const selected = current.find((region) => region.id === selectedZoomId);
			const soundId = normalizeZoomSoundId(selected?.soundId);
			const panSoundId = normalizeZoomSoundId(selected?.panSoundId);
			const outSoundId = normalizeZoomSoundId(selected?.outSoundId);
			return current.map((region) => ({ ...region, soundId, panSoundId, outSoundId }));
		});
	}, [selectedZoomId, selectedIds, setZoomRegions]);
	const handleZoomDelete = useCallback(
		(id: string) => {
			const ids = selectedIds.includes(id) ? selectedIds : [id];
			setZoomRegions((current) => current.filter((region) => !ids.includes(region.id)));
			if (selectedZoomId && ids.includes(selectedZoomId)) {
				setSelectedZoomId(null);
				setSelectedTrackItems(null);
			}
		},
		[selectedIds, selectedZoomId, setSelectedTrackItems, setSelectedZoomId, setZoomRegions],
	);
	const handleClearAllZooms = useCallback(() => {
		setZoomRegions([]);
		setSelectedZoomId(null);
		setActiveEffectSection((section) => (section === "zoom" ? "scene" : section));
	}, [setActiveEffectSection, setSelectedZoomId, setZoomRegions]);

	return {
		handleSelectZoom,
		handleZoomAdded,
		handleZoomSuggested,
		handleZoomSpanChange,
		handleZoomFocusChange,
		handleZoomDepthChange,
		handleZoomModeChange,
		handleZoomSoundChange,
		handleZoomPanSoundChange,
		handleZoomOutSoundChange,
		handleApplyZoomSoundToAll,
		handleZoomDelete,
		handleClearAllZooms,
	};
}
