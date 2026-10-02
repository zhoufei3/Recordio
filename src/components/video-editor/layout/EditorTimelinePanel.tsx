import { useMemo, type RefObject } from "react";
import { buildEffectAudioRegions } from "../effectAudio";
import type { useAppearanceState } from "../state/useAppearanceState";
import type { useVideoEditorAudio } from "../audio/useVideoEditorAudio";
import { retimeCaptionFragment } from "../captionTimeline";
import type { useAnnotationRegionCommands } from "../hooks/useAnnotationRegionCommands";
import type { useAudioRegionCommands } from "../hooks/useAudioRegionCommands";
import type { useCaptionCommands } from "../hooks/useCaptionCommands";
import type { useClipRegionCommands } from "../hooks/useClipRegionCommands";
import type { useEditorPlaybackControls } from "../hooks/useEditorPlaybackControls";
import type { useTimelineProjection } from "../hooks/useTimelineProjection";
import type { useZoomRegionCommands } from "../hooks/useZoomRegionCommands";
import type { useTimelineState } from "../state/useTimelineState";
import TimelineEditor, { type TimelineEditorHandle } from "../timeline/TimelineEditor";

type Props = {
	panelRef?: RefObject<HTMLDivElement | null>;
	timelineRef: RefObject<TimelineEditorHandle | null>;
	timeline: ReturnType<typeof useTimelineState>;
	appearance: ReturnType<typeof useAppearanceState>;
	projection: ReturnType<typeof useTimelineProjection>;
	playback: ReturnType<typeof useEditorPlaybackControls>;
	audio: ReturnType<typeof useVideoEditorAudio>;
	zoomCommands: ReturnType<typeof useZoomRegionCommands>;
	clipCommands: ReturnType<typeof useClipRegionCommands>;
	audioCommands: ReturnType<typeof useAudioRegionCommands>;
	captionCommands: ReturnType<typeof useCaptionCommands>;
	annotationCommands: ReturnType<typeof useAnnotationRegionCommands>;
	videoPath: string | null;
	videoSourcePath: string | null;
	cursorTelemetrySourcePath: string | null;
	normalizedCursorTelemetry: ReturnType<typeof useTimelineState>["cursorTelemetry"];
	autoSuggestZoomsTrigger: number;
	handleAutoSuggestZoomsConsumed: () => void;
	disableSuggestedZooms: boolean;
	currentTime: number;
	handleSelectAnnotation: (id: string | null) => void;
};

export function EditorTimelinePanel(props: Props) {
	const {
		timelineRef,
		timeline,
		appearance,
		projection,
		playback,
		audio,
		zoomCommands,
		clipCommands,
		audioCommands,
		captionCommands,
		annotationCommands,
		videoPath,
		videoSourcePath,
		cursorTelemetrySourcePath,
		normalizedCursorTelemetry,
		autoSuggestZoomsTrigger,
		handleAutoSuggestZoomsConsumed,
		disableSuggestedZooms,
		currentTime,
		handleSelectAnnotation,
	} = props;
	const firstEffectTrackIndex = useMemo(() =>
		Math.max(-1, ...timeline.audioRegions.map((region) => region.trackIndex ?? 0)) + 1,
		[timeline.audioRegions],
	);
	const effectAudioRegions = useMemo(() => buildEffectAudioRegions({
		telemetry: normalizedCursorTelemetry,
		clips: timeline.clipRegions,
		zooms: timeline.zoomRegions,
		leftSound: appearance.leftClickSound,
		rightSound: appearance.rightClickSound,
		connectZooms: appearance.connectZooms,
		zoomInDurationMs: appearance.zoomInDurationMs,
		volumes: timeline.effectAudioVolumes,
		startOverrides: timeline.effectAudioStartOverrides,
		disabledIds: timeline.disabledEffectAudioIds,
		firstTrackIndex: firstEffectTrackIndex,
	}), [normalizedCursorTelemetry, timeline.clipRegions, timeline.zoomRegions, timeline.effectAudioVolumes, timeline.effectAudioStartOverrides, timeline.disabledEffectAudioIds,
		appearance.leftClickSound, appearance.rightClickSound, appearance.connectZooms,
		appearance.zoomInDurationMs, firstEffectTrackIndex]);
	const selectTrackItem = (kind: "zoom" | "clip" | "audio", id: string | null, additive = false) => {
		const current = timeline.selectedTrackItems?.kind === kind ? timeline.selectedTrackItems.ids : [];
		const ids = !id ? [] : additive
			? current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]
			: [id];
		timeline.setSelectedTrackItems(ids.length ? { kind, ids } : null);
		const primary = ids.includes(id ?? "") ? id : (ids[ids.length - 1] ?? null);
		if (kind === "zoom") zoomCommands.handleSelectZoom(primary);
		if (kind === "clip") clipCommands.handleSelectClip(primary);
		if (kind === "audio") audioCommands.handleSelectAudio(primary);
	};
	const selectTrackItems = (kind: "zoom" | "clip" | "audio", ids: string[]) => {
		const validIds = [...new Set(ids)];
		timeline.setSelectedTrackItems(validIds.length ? { kind, ids: validIds } : null);
		const primary = validIds[validIds.length - 1] ?? null;
		if (kind === "zoom") zoomCommands.handleSelectZoom(primary);
		if (kind === "clip") clipCommands.handleSelectClip(primary);
		if (kind === "audio") audioCommands.handleSelectAudio(primary);
	};

	return (
		<div
			ref={props.panelRef}
			tabIndex={-1}
			data-timeline-panel
			className="outline-none flex flex-shrink-0 flex-col bg-transparent px-4 pb-4 pt-2"
			style={{ height: "22%", minHeight: 180, maxHeight: 280 }}
		>
			<TimelineEditor
				ref={timelineRef}
				videoDuration={projection.timelineDuration}
				currentTime={currentTime}
				playheadTime={projection.timelinePlayheadTime}
				onSeek={playback.handleTimelineSeek}
				videoPath={videoPath}
				videoSourcePath={videoSourcePath}
				cursorTelemetrySourcePath={cursorTelemetrySourcePath}
				cursorTelemetry={normalizedCursorTelemetry}
				autoSuggestZoomsTrigger={autoSuggestZoomsTrigger}
				onAutoSuggestZoomsConsumed={handleAutoSuggestZoomsConsumed}
				disableSuggestedZooms={disableSuggestedZooms}
				zoomRegions={timeline.zoomRegions}
				onZoomAdded={zoomCommands.handleZoomAdded}
				onZoomSuggested={zoomCommands.handleZoomSuggested}
				onZoomSpanChange={zoomCommands.handleZoomSpanChange}
				onZoomDelete={zoomCommands.handleZoomDelete}
				selectedZoomId={timeline.selectedZoomId}
				selectedZoomIds={timeline.selectedTrackItems?.kind === "zoom" && timeline.selectedZoomId && timeline.selectedTrackItems.ids.includes(timeline.selectedZoomId) ? timeline.selectedTrackItems.ids : []}
				onSelectZoom={(id, additive) => selectTrackItem("zoom", id, additive)}
				trimRegions={timeline.trimRegions}
				clipRegions={timeline.clipRegions}
				onClipSplit={clipCommands.handleClipSplit}
				onClipDelete={clipCommands.handleClipDelete}
				onClipSpanChange={clipCommands.handleClipSpanChange}
				selectedClipId={timeline.selectedClipId}
				selectedClipIds={timeline.selectedTrackItems?.kind === "clip" && timeline.selectedClipId && timeline.selectedTrackItems.ids.includes(timeline.selectedClipId) ? timeline.selectedTrackItems.ids : []}
				onSelectClip={(id, additive) => selectTrackItem("clip", id, additive)}
				audioRegions={timeline.audioRegions}
				effectAudioRegions={effectAudioRegions}
				onAudioAdded={audioCommands.handleAudioAdded}
				onAudioSpanChange={audioCommands.handleAudioSpanChange}
				onAudioDelete={audioCommands.handleAudioDelete}
				selectedAudioId={timeline.selectedAudioId}
				selectedAudioIds={timeline.selectedTrackItems?.kind === "audio" && timeline.selectedAudioId && timeline.selectedTrackItems.ids.includes(timeline.selectedAudioId) ? timeline.selectedTrackItems.ids : []}
				onSelectAudio={(id, additive) => selectTrackItem("audio", id, additive)}
				onSelectTrackItems={selectTrackItems}
				captionRegions={projection.effectiveCaptionRegions}
				onCaptionSpanChange={(id, span) => {
					const fragment = projection.effectiveCaptionRegions.find(
						(cue) => cue.id === id,
					);
					if (!fragment) return;
					captionCommands.handleCaptionRetime(
						fragment.sourceCueId,
						retimeCaptionFragment(fragment, span),
					);
				}}
				selectedCaptionId={
					projection.effectiveCaptionRegions.find(
						(cue) =>
							cue.sourceCueId === timeline.selectedCaptionId &&
							currentTime * 1000 >= cue.startMs &&
							currentTime * 1000 < cue.endMs,
					)?.id ??
					projection.effectiveCaptionRegions.find(
						(cue) => cue.sourceCueId === timeline.selectedCaptionId,
					)?.id ??
					null
				}
				onSelectCaption={(id) => {
					const fragment = projection.effectiveCaptionRegions.find(
						(cue) => cue.id === id,
					);
					captionCommands.handleSelectCaption(fragment?.sourceCueId ?? null);
					if (fragment) playback.handleTimelineSeek(fragment.startMs / 1000);
				}}
				onCaptionDelete={(id) => {
					const fragment = projection.effectiveCaptionRegions.find(
						(cue) => cue.id === id,
					);
					if (fragment) captionCommands.handleCaptionDelete(fragment.sourceCueId);
				}}
				onCaptionAdded={captionCommands.handleCaptionAdded}
				captionsEnabled={timeline.autoCaptionSettings.enabled}
				captionQuickAddEnabled={timeline.autoCaptionSettings.timelineQuickAdd}
				annotationRegions={timeline.annotationRegions}
				onAnnotationAdded={annotationCommands.handleAnnotationAdded}
				onAnnotationSpanChange={annotationCommands.handleAnnotationSpanChange}
				onAnnotationDelete={annotationCommands.handleAnnotationDelete}
				selectedAnnotationId={timeline.selectedAnnotationId}
				onSelectAnnotation={handleSelectAnnotation}
				showSourceAudioTrack={timeline.clipRegions.some((clip) => clip.showSourceAudio)}
				sourceAudioResourceVersion={timeline.sourceAudioFallbackRefreshKey}
				sourceAudioTrackSettings={audio.activeSourceAudioTrackSettings}
				getSourceAudioTrackSettingsForClip={audio.getSourceAudioTrackSettingsForClip}
				onSourceAudioAvailabilityChange={timeline.setHasClipSourceAudio}
				onSourceAudioTracksMetaChange={audio.onSourceAudioTracksMetaChange}
			/>
		</div>
	);
}
