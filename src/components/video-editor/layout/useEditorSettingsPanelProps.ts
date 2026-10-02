import type { ComponentProps, Dispatch, SetStateAction } from "react";
import type { AspectRatio } from "@/utils/aspectRatioUtils";
import { useClipAudioReset } from "../audio/useClipAudioReset";
import type { useAutoCaptionController } from "../captions/useAutoCaptionController";
import type { useAnnotationRegionCommands } from "../hooks/useAnnotationRegionCommands";
import type { useAudioRegionCommands } from "../hooks/useAudioRegionCommands";
import type { useCaptionCommands } from "../hooks/useCaptionCommands";
import type { useClipRegionCommands } from "../hooks/useClipRegionCommands";
import type { useZoomRegionCommands } from "../hooks/useZoomRegionCommands";
import { SettingsPanel } from "../SettingsPanel";
import { getEffectAudioVolume, isEffectAudioId } from "../effectAudio";
import { normalizeZoomSoundId } from "../zoomSounds";
import type { useAppearanceState } from "../state/useAppearanceState";
import type { useTimelineState } from "../state/useTimelineState";
import { type EditorEffectSection, mapTimelineTimeToSourceTime } from "../types";

type Input = {
	activeEffectSection: EditorEffectSection;
	appearance: ReturnType<typeof useAppearanceState>;
	timeline: ReturnType<typeof useTimelineState>;
	zoomCommands: ReturnType<typeof useZoomRegionCommands>;
	clipCommands: ReturnType<typeof useClipRegionCommands>;
	audioCommands: ReturnType<typeof useAudioRegionCommands>;
	captionCommands: ReturnType<typeof useCaptionCommands>;
	annotationCommands: ReturnType<typeof useAnnotationRegionCommands>;
	autoCaptionController: ReturnType<typeof useAutoCaptionController>;
	effectiveShowCursor: boolean;
	handleShowCursorChange: (show: boolean) => void;
	currentTime: number;
	isPlaying: boolean;
	aspectRatio: AspectRatio;
	setAspectRatio: Dispatch<SetStateAction<AspectRatio>>;
	whisperExecutablePath: string | null;
	whisperModelPath: string | null;
	whisperModelDownloadStatus: "idle" | "downloading" | "downloaded" | "error";
	whisperModelDownloadProgress: number;
	isGeneratingCaptions: boolean;
	sessionNativeCaptureUnavailable: boolean;
	setNativeCaptureUnavailableModalOpen: Dispatch<SetStateAction<boolean>>;
	handleUploadWebcam: () => void;
	handleClearWebcam: () => void;
};

export function useEditorSettingsPanelProps(input: Input): ComponentProps<typeof SettingsPanel> {
	const {
		activeEffectSection,
		appearance,
		timeline,
		zoomCommands,
		clipCommands,
		audioCommands,
		captionCommands,
		annotationCommands,
		autoCaptionController,
		effectiveShowCursor,
		handleShowCursorChange,
		currentTime,
		isPlaying,
		aspectRatio,
		setAspectRatio,
		whisperExecutablePath,
		whisperModelPath,
		whisperModelDownloadStatus,
		whisperModelDownloadProgress,
		isGeneratingCaptions,
		sessionNativeCaptureUnavailable,
		setNativeCaptureUnavailableModalOpen,
		handleUploadWebcam,
		handleClearWebcam,
	} = input;
	const selectedZoom = timeline.zoomRegions.find(
		(region) => region.id === timeline.selectedZoomId,
	);
	const selectedClip = timeline.clipRegions.find(
		(region) => region.id === timeline.selectedClipId,
	);
	const selectedAudio = timeline.audioRegions.find(
		(region) => region.id === timeline.selectedAudioId,
	);
	const selectedAudioIsEffect = isEffectAudioId(timeline.selectedAudioId);
	const selectedAudioEffectKind = selectedAudioIsEffect
		? timeline.selectedAudioId?.startsWith("click-sound-") ? "click" as const : "zoom" as const
		: null;

	const clipAudioReset = useClipAudioReset(timeline);

	return {
		...clipAudioReset,
		panelMode: "editor",
		selectedTrackItemCount: timeline.selectedTrackItems?.ids.includes(
			timeline.selectedZoomId ?? timeline.selectedClipId ?? timeline.selectedAudioId ?? "",
		) ? timeline.selectedTrackItems.ids.length : 1,
		activeEffectSection,
		selected: appearance.wallpaper,
		onWallpaperChange: appearance.setWallpaper,
		selectedZoomDepth: selectedZoom?.depth ?? null,
		onZoomDepthChange: (depth) =>
			timeline.selectedZoomId && zoomCommands.handleZoomDepthChange(depth),
		selectedZoomId: timeline.selectedZoomId,
		selectedZoomMode: selectedZoom?.mode ?? (timeline.selectedZoomId ? "auto" : null),
		selectedZoomSoundId: normalizeZoomSoundId(selectedZoom?.soundId),
		selectedZoomPanSoundId: normalizeZoomSoundId(selectedZoom?.panSoundId),
		selectedZoomOutSoundId: normalizeZoomSoundId(selectedZoom?.outSoundId),
		onZoomSoundChange: zoomCommands.handleZoomSoundChange,
		onZoomPanSoundChange: zoomCommands.handleZoomPanSoundChange,
		onZoomOutSoundChange: zoomCommands.handleZoomOutSoundChange,
		onApplyZoomSoundToAll: () => {
			const soundId = normalizeZoomSoundId(selectedZoom?.soundId ?? appearance.defaultZoomSoundId);
			const panSoundId = normalizeZoomSoundId(selectedZoom?.panSoundId ?? appearance.defaultZoomPanSoundId);
			const outSoundId = normalizeZoomSoundId(selectedZoom?.outSoundId ?? appearance.defaultZoomOutSoundId);
			appearance.setDefaultZoomSoundId(soundId);
			appearance.setDefaultZoomPanSoundId(panSoundId);
			appearance.setDefaultZoomOutSoundId(outSoundId);
			zoomCommands.handleApplyZoomSoundToAll();
		},
		onRemoveCustomZoomSound: (id) => {
			if (appearance.defaultZoomSoundId === id) appearance.setDefaultZoomSoundId("none");
			if (appearance.defaultZoomPanSoundId === id) appearance.setDefaultZoomPanSoundId("none");
			if (appearance.defaultZoomOutSoundId === id) appearance.setDefaultZoomOutSoundId("none");
			timeline.setZoomRegions((regions) => regions.map((region) => ({
				...region,
				soundId: region.soundId === id ? "none" : region.soundId,
				panSoundId: region.panSoundId === id ? "none" : region.panSoundId,
				outSoundId: region.outSoundId === id ? "none" : region.outSoundId,
			})));
		},
		onZoomModeChange: (mode) =>
			timeline.selectedZoomId && zoomCommands.handleZoomModeChange(mode),
		onZoomDelete: zoomCommands.handleZoomDelete,
		selectedClipId: timeline.selectedClipId,
		selectedClipSpeed: selectedClip?.speed ?? (timeline.selectedClipId ? 1 : null),
		selectedClipMuted: selectedClip?.muted ?? (timeline.selectedClipId ? false : null),
		onClipSpeedChange: clipCommands.handleClipSpeedChange,
		onClipMutedChange: clipCommands.handleClipMutedChange,
		onClipDelete: clipCommands.handleClipDelete,
		selectedAudioId: timeline.selectedAudioId,
		selectedAudioVolume: selectedAudio?.volume ?? (selectedAudioIsEffect && timeline.selectedAudioId
			? getEffectAudioVolume(timeline.selectedAudioId, timeline.effectAudioVolumes) : null),
		selectedAudioEffectKind,
		selectedAudioNormalize:
			selectedAudio?.normalize ?? (timeline.selectedAudioId ? false : null),
		onAudioVolumeChange: audioCommands.handleAudioVolumeChange,
		onAudioNormalizeChange: audioCommands.handleAudioNormalizeChange,
		onAudioDelete: audioCommands.handleAudioDelete,
		shadowIntensity: appearance.shadowIntensity,
		onShadowChange: appearance.setShadowIntensity,
		backgroundBlur: appearance.backgroundBlur,
		onBackgroundBlurChange: appearance.setBackgroundBlur,
		autoApplyFreshRecordingAutoZooms: appearance.autoApplyFreshRecordingAutoZooms,
		onAutoApplyFreshRecordingAutoZoomsChange: appearance.setAutoApplyFreshRecordingAutoZooms,
		connectZooms: appearance.connectZooms,
		onConnectZoomsChange: appearance.setConnectZooms,
		zoomInDurationMs: appearance.zoomInDurationMs,
		onZoomInDurationMsChange: appearance.setZoomInDurationMs,
		zoomInOverlapMs: appearance.zoomInOverlapMs,
		onZoomInOverlapMsChange: appearance.setZoomInOverlapMs,
		zoomOutDurationMs: appearance.zoomOutDurationMs,
		onZoomOutDurationMsChange: appearance.setZoomOutDurationMs,
		connectedZoomGapMs: appearance.connectedZoomGapMs,
		onConnectedZoomGapMsChange: appearance.setConnectedZoomGapMs,
		connectedZoomDurationMs: appearance.connectedZoomDurationMs,
		onConnectedZoomDurationMsChange: appearance.setConnectedZoomDurationMs,
		zoomInEasing: appearance.zoomInEasing,
		onZoomInEasingChange: appearance.setZoomInEasing,
		zoomOutEasing: appearance.zoomOutEasing,
		onZoomOutEasingChange: appearance.setZoomOutEasing,
		connectedZoomEasing: appearance.connectedZoomEasing,
		onConnectedZoomEasingChange: appearance.setConnectedZoomEasing,
		showCursor: effectiveShowCursor,
		onShowCursorChange: handleShowCursorChange,
		loopCursor: appearance.loopCursor,
		onLoopCursorChange: appearance.setLoopCursor,
		cursorStyle: appearance.cursorStyle,
		onCursorStyleChange: appearance.setCursorStyle,
		cursorSize: appearance.cursorSize,
		onCursorSizeChange: appearance.setCursorSize,
		cursorSmoothing: appearance.cursorSmoothing,
		onCursorSmoothingChange: appearance.setCursorSmoothing,
		cursorSpringStiffnessMultiplier: appearance.cursorSpringStiffnessMultiplier,
		onCursorSpringStiffnessMultiplierChange: appearance.setCursorSpringStiffnessMultiplier,
		cursorSpringDampingMultiplier: appearance.cursorSpringDampingMultiplier,
		onCursorSpringDampingMultiplierChange: appearance.setCursorSpringDampingMultiplier,
		cursorSpringMassMultiplier: appearance.cursorSpringMassMultiplier,
		onCursorSpringMassMultiplierChange: appearance.setCursorSpringMassMultiplier,
		cameraSpringStiffnessMultiplier: appearance.cameraSpringStiffnessMultiplier,
		onCameraSpringStiffnessMultiplierChange: appearance.setCameraSpringStiffnessMultiplier,
		cameraSpringDampingMultiplier: appearance.cameraSpringDampingMultiplier,
		onCameraSpringDampingMultiplierChange: appearance.setCameraSpringDampingMultiplier,
		cameraSpringMassMultiplier: appearance.cameraSpringMassMultiplier,
		onCameraSpringMassMultiplierChange: appearance.setCameraSpringMassMultiplier,
		zoomClassicMode: appearance.zoomClassicMode,
		onZoomClassicModeChange: appearance.setZoomClassicMode,
		cursorClickEffect: appearance.cursorClickEffect,
		cursorClickEffectColor: appearance.cursorClickEffectColor,
		onCursorClickEffectChange: appearance.setCursorClickEffect,
		onCursorClickEffectColorChange: appearance.setCursorClickEffectColor,
		cursorClickEffectScale: appearance.cursorClickEffectScale,
		onCursorClickEffectScaleChange: appearance.setCursorClickEffectScale,
		cursorClickEffectOpacity: appearance.cursorClickEffectOpacity,
		onCursorClickEffectOpacityChange: appearance.setCursorClickEffectOpacity,
		cursorClickEffectDurationMs: appearance.cursorClickEffectDurationMs,
		onCursorClickEffectDurationMsChange: appearance.setCursorClickEffectDurationMs,
		rightClickEffect: appearance.rightClickEffect,
		onRightClickEffectChange: appearance.setRightClickEffect,
		leftClickSound: appearance.leftClickSound,
		onLeftClickSoundChange: appearance.setLeftClickSound,
		rightClickSound: appearance.rightClickSound,
		onRightClickSoundChange: appearance.setRightClickSound,
		defaultZoomSoundId: appearance.defaultZoomSoundId,
		defaultZoomPanSoundId: appearance.defaultZoomPanSoundId,
		defaultZoomOutSoundId: appearance.defaultZoomOutSoundId,
		onDefaultZoomSoundChange: (id) => {
			appearance.setDefaultZoomSoundId(id);
			timeline.setZoomRegions((regions) => regions.map((region) => ({ ...region, soundId: id })));
		},
		onDefaultZoomPanSoundChange: (id) => {
			appearance.setDefaultZoomPanSoundId(id);
			timeline.setZoomRegions((regions) => regions.map((region) => ({ ...region, panSoundId: id })));
		},
		onDefaultZoomOutSoundChange: (id) => {
			appearance.setDefaultZoomOutSoundId(id);
			timeline.setZoomRegions((regions) => regions.map((region) => ({ ...region, outSoundId: id })));
		},
		deletedClickSoundCount: timeline.disabledEffectAudioIds.filter((id) => id.startsWith("click-sound-")).length,
		onRestoreDeletedClickSounds: () => timeline.setDisabledEffectAudioIds((ids) => ids.filter((id) => !id.startsWith("click-sound-"))),
		cursorClickBounce: appearance.cursorClickBounce,
		cursorTrailEnabled: appearance.cursorTrailEnabled,
		onCursorTrailEnabledChange: appearance.setCursorTrailEnabled,
		cursorTrailSize: appearance.cursorTrailSize,
		onCursorTrailSizeChange: appearance.setCursorTrailSize,
		cursorTrailLength: appearance.cursorTrailLength,
		onCursorTrailLengthChange: appearance.setCursorTrailLength,
		cursorTrailDurationMs: appearance.cursorTrailDurationMs,
		onCursorTrailDurationMsChange: appearance.setCursorTrailDurationMs,
		cursorTrailColor: appearance.cursorTrailColor,
		onCursorTrailColorChange: appearance.setCursorTrailColor,
		onCursorClickBounceChange: appearance.setCursorClickBounce,
		cursorClickBounceDuration: appearance.cursorClickBounceDuration,
		onCursorClickBounceDurationChange: appearance.setCursorClickBounceDuration,
		cursorSway: appearance.cursorSway,
		onCursorSwayChange: appearance.setCursorSway,
		borderRadius: appearance.borderRadius,
		onBorderRadiusChange: appearance.setBorderRadius,
		videoOutlineWidth: appearance.videoOutlineWidth,
		onVideoOutlineWidthChange: appearance.setVideoOutlineWidth,
		videoOutlineColor: appearance.videoOutlineColor,
		onVideoOutlineColorChange: appearance.setVideoOutlineColor,
		webcam: appearance.webcam,
		webcamPreviewSrc: appearance.webcam.sourcePath ? appearance.resolvedWebcamVideoUrl : null,
		webcamPreviewCurrentTime:
			mapTimelineTimeToSourceTime(currentTime * 1000, timeline.clipRegions) / 1000,
		webcamPreviewPlaying: isPlaying,
		onWebcamChange: appearance.setWebcam,
		onUploadWebcam: handleUploadWebcam,
		onClearWebcam: handleClearWebcam,
		padding: appearance.padding,
		onPaddingChange: appearance.setPadding,
		cropRegion: appearance.cropRegion,
		onCropChange: appearance.setCropRegion,
		aspectRatio,
		onAspectRatioChange: setAspectRatio,
		selectedAnnotationId: timeline.selectedAnnotationId,
		annotationRegions: timeline.annotationRegions,
		autoCaptions: timeline.autoCaptions,
		autoCaptionSettings: timeline.autoCaptionSettings,
		whisperExecutablePath,
		whisperModelPath,
		whisperModelDownloadStatus,
		whisperModelDownloadProgress,
		isGeneratingCaptions,
		onAutoCaptionSettingsChange: timeline.setAutoCaptionSettings,
		onPickWhisperExecutable: autoCaptionController.handlePickWhisperExecutable,
		onPickWhisperModel: autoCaptionController.handlePickWhisperModel,
		onGenerateAutoCaptions: autoCaptionController.handleGenerateAutoCaptions,
		onClearAutoCaptions: captionCommands.handleClearAutoCaptions,
		captionCurrentTimeMs: mapTimelineTimeToSourceTime(currentTime * 1000, timeline.clipRegions),
		selectedCaptionId: timeline.selectedCaptionId,
		onBeginCaptionEdit: captionCommands.handleBeginCaptionEdit,
		onCaptionTextEdit: captionCommands.handleCaptionTextEdit,
		onCaptionRetime: captionCommands.handleCaptionRetime,
		onCaptionSplit: captionCommands.handleCaptionSplit,
		onCaptionMerge: captionCommands.handleCaptionMerge,
		onCaptionDelete: captionCommands.handleCaptionDelete,
		onDownloadWhisperSmallModel: autoCaptionController.handleDownloadWhisperSmallModel,
		onDeleteWhisperSmallModel: autoCaptionController.handleDeleteWhisperSmallModel,
		nativeCaptureUnavailableSession: sessionNativeCaptureUnavailable,
		onOpenNativeCaptureUnavailableModal: () => setNativeCaptureUnavailableModalOpen(true),
		onAnnotationContentChange: annotationCommands.handleAnnotationContentChange,
		onAnnotationTypeChange: annotationCommands.handleAnnotationTypeChange,
		onAnnotationStyleChange: annotationCommands.handleAnnotationStyleChange,
		onAnnotationFigureDataChange: annotationCommands.handleAnnotationFigureDataChange,
		onAnnotationBlurIntensityChange: annotationCommands.handleAnnotationBlurIntensityChange,
		onAnnotationBlurColorChange: annotationCommands.handleAnnotationBlurColorChange,
		onAnnotationDelete: annotationCommands.handleAnnotationDelete,
	};
}
