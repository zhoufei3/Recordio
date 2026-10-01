import type { Dispatch, RefObject, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	BoundingBox,
	CaretDown,
	Check,
	Crop,
	MagicWand,
	MagnifyingGlassPlus,
	Pause,
	Play,
	Plus,
	Scissors,
	SkipBack,
	SkipForward,
	SpeakerHigh,
	SpeakerLow,
	SpeakerX,
	Trash,
} from "@/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import type { useI18n } from "@/contexts/I18nContext";
import { ASPECT_RATIOS, type AspectRatio, getAspectRatioLabel } from "@/utils/aspectRatioUtils";
import type { useVideoEditorAudio } from "../audio/useVideoEditorAudio";
import type { CaptionEditTarget } from "../captionEditing";
import type { useAnnotationRegionCommands } from "../hooks/useAnnotationRegionCommands";
import type { useEditorPlaybackControls } from "../hooks/useEditorPlaybackControls";
import type { useTimelineProjection } from "../hooks/useTimelineProjection";
import type { useZoomRegionCommands } from "../hooks/useZoomRegionCommands";
import type { useAppearanceState } from "../state/useAppearanceState";
import type { useTimelineState } from "../state/useTimelineState";
import type { TimelineEditorHandle } from "../timeline/TimelineEditor";
import type { VideoPlaybackRef } from "../VideoPlayback";
import { EditorVideoPreview } from "./EditorVideoPreview";

type Props = {
	t: ReturnType<typeof useI18n>["t"];
	videoPath: string | null;
	previewVersion: number;
	aspectRatio: AspectRatio;
	setAspectRatio: Dispatch<SetStateAction<AspectRatio>>;
	previewAspectRatioValue: number;
	videoPlaybackRef: RefObject<VideoPlaybackRef | null>;
	timelineRef: RefObject<TimelineEditorHandle | null>;
	currentTime: number;
	isPlaying: boolean;
	previewVolume: number;
	setPreviewVolume: Dispatch<SetStateAction<number>>;
	suspendRendering: boolean;
	appearance: ReturnType<typeof useAppearanceState>;
	timeline: ReturnType<typeof useTimelineState>;
	audio: ReturnType<typeof useVideoEditorAudio>;
	projection: ReturnType<typeof useTimelineProjection>;
	playback: ReturnType<typeof useEditorPlaybackControls>;
	zoomCommands: ReturnType<typeof useZoomRegionCommands>;
	annotationCommands: ReturnType<typeof useAnnotationRegionCommands>;
	effectiveCursorTelemetry: ReturnType<typeof useTimelineState>["cursorTelemetry"];
	effectiveShowCursor: boolean;
	isCropped: boolean;
	handleOpenCropEditor: () => void;
	handleSaveAutoCaptionEdit: (target: CaptionEditTarget, text: string) => void;
	handleSelectAnnotation: (id: string | null) => void;
	setDuration: Dispatch<SetStateAction<number>>;
	isPreviewReady: boolean;
	setIsPreviewReady: Dispatch<SetStateAction<boolean>>;
	setCurrentTime: Dispatch<SetStateAction<number>>;
	setIsPlaying: Dispatch<SetStateAction<boolean>>;
	setError: (message: string | null) => void;
	onFullscreenChange: (fullscreen: boolean) => void;
};

function formatTime(seconds: number) {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function EditorPreviewPanel(props: Props) {
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [timelineZoom, setTimelineZoom] = useState(1);
	useEffect(() => {
		const update = (event: Event) => setTimelineZoom((event as CustomEvent<number>).detail);
		window.addEventListener("recordio:timeline-zoom", update);
		return () => window.removeEventListener("recordio:timeline-zoom", update);
	}, []);
	const updateFullscreen = useCallback((fullscreen: boolean) => {
		setIsFullscreen(fullscreen);
		props.onFullscreenChange(fullscreen);
	}, [props.onFullscreenChange]);
	const panelRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const onFullscreenChange = () => {
			updateFullscreen(document.fullscreenElement === panelRef.current);
		};
		const unsubscribeWindowFullscreen = window.electronAPI.onWindowFullscreenChanged(updateFullscreen);
		void window.electronAPI.isWindowFullscreen().then(updateFullscreen).catch(() => undefined);
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && isFullscreen) {
				if (document.fullscreenElement === panelRef.current)
					void document.exitFullscreen().catch(() => undefined);
				else void window.electronAPI.setWindowFullscreen(false);
			}
		};
		document.addEventListener("fullscreenchange", onFullscreenChange);
		window.addEventListener("keydown", onKeyDown);
		return () => {
			unsubscribeWindowFullscreen();
			document.removeEventListener("fullscreenchange", onFullscreenChange);
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [isFullscreen, updateFullscreen]);
	const toggleFullscreen = async () => {
		try {
			await window.electronAPI.setWindowFullscreen(!isFullscreen);
		} catch {
			if (isFullscreen) {
				await document.exitFullscreen().catch(() => undefined);
			} else {
				updateFullscreen(true);
				await panelRef.current?.requestFullscreen().catch(() => undefined);
			}
		}
	};
	const {
		t,
		videoPath,
		previewVersion,
		aspectRatio,
		setAspectRatio,
		previewAspectRatioValue,
		videoPlaybackRef,
		timelineRef,
		currentTime,
		isPlaying,
		previewVolume,
		setPreviewVolume,
		suspendRendering,
		appearance,
		timeline,
		audio,
		projection,
		playback,
		zoomCommands,
		annotationCommands,
		effectiveCursorTelemetry,
		effectiveShowCursor,
		isCropped,
		handleOpenCropEditor,
		handleSaveAutoCaptionEdit,
		handleSelectAnnotation,
		setDuration,
		isPreviewReady,
		setIsPreviewReady,
		setCurrentTime,
		setIsPlaying,
		setError,
	} = props;

	return (
		<div
			ref={panelRef}
			className={
				isFullscreen
					? "fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-black text-white"
					: "flex min-h-0 min-w-0 flex-1 flex-col"
			}
		>
			<div className="flex min-h-0 flex-1 flex-col">
				<div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
					{!isFullscreen && (
						<div className="flex h-10 shrink-0 items-center justify-center gap-3">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="h-7 gap-1 px-2 text-xs"
									>
										<span className="font-medium">
											{getAspectRatioLabel(aspectRatio)}
										</span>
										<CaretDown className="h-3 w-3" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="center">
									{ASPECT_RATIOS.map((ratio) => (
										<DropdownMenuItem
											key={ratio}
											onClick={() => setAspectRatio(ratio)}
											className="flex cursor-pointer items-center justify-between gap-3 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
										>
											<span>{getAspectRatioLabel(ratio)}</span>
											{aspectRatio === ratio ? (
												<Check className="h-3 w-3 text-[#2563EB]" />
											) : null}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
							<div className="h-4 w-px bg-foreground/20" />
							<Button
								variant="ghost"
								size="sm"
								onClick={handleOpenCropEditor}
								className="h-7 gap-1.5 px-2 text-xs"
							>
								<Crop className="h-3.5 w-3.5" />
								<span className="font-medium">{t("settings.crop.title")}</span>
								{isCropped ? (
									<span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
								) : null}
							</Button>
						</div>
					)}
					<div
						className="flex min-h-0 w-full flex-1 items-stretch px-4 py-3"
						style={{ flex: "1 1 auto", margin: 0 }}
					>
						<div
							className="editor-preview-stage flex min-h-0 min-w-0 flex-1 items-center justify-center"
							style={{ containerType: "size" }}
						>
							<div
								className="editor-preview-frame relative"
								style={{
									width: `min(100cqw, calc(100cqh * ${previewAspectRatioValue}))`,
									height: `min(100cqh, calc(100cqw / ${previewAspectRatioValue}))`,
									aspectRatio: previewAspectRatioValue,
									maxWidth: "100%",
									margin: "0 auto",
									boxSizing: "border-box",
								}}
							>
								{videoPath && !isPreviewReady && (
									<Skeleton
										aria-label={t("editor.playback.loadingPreview", "Loading preview")}
										className="pointer-events-none absolute inset-0 z-20 h-full w-full rounded-xl"
									/>
								)}
								<EditorVideoPreview
									videoPath={videoPath}
									previewVersion={previewVersion}
									aspectRatio={aspectRatio}
									playbackRef={videoPlaybackRef}
									currentTime={currentTime}
									isPlaying={isPlaying}
									previewVolume={previewVolume}
									suspendRendering={suspendRendering}
									appearance={appearance}
									timeline={timeline}
									audio={audio}
									effectiveZoomRegions={projection.effectiveZoomRegions}
									effectiveCursorTelemetry={effectiveCursorTelemetry}
									effectiveShowCursor={effectiveShowCursor}
									setDuration={setDuration}
									setIsPreviewReady={setIsPreviewReady}
									setCurrentTime={setCurrentTime}
									setIsPlaying={setIsPlaying}
									setError={setError}
									handlers={{
										onSelectZoom: zoomCommands.handleSelectZoom,
										onZoomFocusChange: zoomCommands.handleZoomFocusChange,
										onEditAutoCaption: handleSaveAutoCaptionEdit,
										onSelectAnnotation: handleSelectAnnotation,
										onAnnotationPositionChange:
											annotationCommands.handleAnnotationPositionChange,
										onAnnotationSizeChange:
											annotationCommands.handleAnnotationSizeChange,
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			{!isFullscreen && (
				<div className="editor-playback relative grid min-h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
				<div className="editor-playback-tools z-10 flex min-w-0 items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="h-9 gap-2 px-3">
								<Plus className="h-3.5 w-3.5" />
								<span className="font-medium">{t("editor.toolbar.addLayer")}</span>
								<CaretDown className="h-3 w-3" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							<DropdownMenuItem
								onClick={() => {
									const nextTrack =
										timeline.annotationRegions.length > 0
											? Math.max(
													...timeline.annotationRegions.map(
														(region) => region.trackIndex ?? 0,
													),
												) + 1
											: 0;
									timelineRef.current?.addAnnotation(nextTrack);
								}}
								className="cursor-pointer text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
							>
								{t("timeline.annotation.label")}
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => {
									const nextTrack =
										timeline.audioRegions.length > 0
											? Math.max(
													...timeline.audioRegions.map(
														(region) => region.trackIndex ?? 0,
													),
												) + 1
											: 0;
									timelineRef.current?.addAudio(nextTrack);
								}}
								className="cursor-pointer text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
							>
								{t("timeline.audio.label")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<Button
						onClick={() => timelineRef.current?.addZoom()}
						variant="ghost"
						size="icon"
						className="h-9 w-9"
						title={t("timeline.zoom.addZoom")}
					>
						<MagnifyingGlassPlus className="h-4 w-4" />
					</Button>
					<Button
						onClick={() => timelineRef.current?.suggestZooms()}
						variant="ghost"
						size="icon"
						className="h-9 w-9"
						title={t("timeline.zoom.suggestZooms")}
					>
						<MagicWand className="h-4 w-4" />
					</Button>
					<Button
						onClick={() => timelineRef.current?.splitClip()}
						variant="ghost"
						size="icon"
						className="h-9 w-9"
						title={t("editor.toolbar.splitClip")}
					>
						<Scissors className="h-4 w-4" />
					</Button>
					<Button
						onClick={zoomCommands.handleClearAllZooms}
						variant="ghost"
						size="icon"
						className="h-9 w-9"
						disabled={timeline.zoomRegions.length === 0}
						title={t("editor.toolbar.clearAllZooms", "Clear all zooms")}
						aria-label={t("editor.toolbar.clearAllZooms", "Clear all zooms")}
					>
						<Trash className="h-4 w-4" />
					</Button>
				</div>

				<div className="editor-playback-center z-10 flex items-center justify-center">
					<div className="pointer-events-auto flex items-center gap-1.5">
						<span className="mr-1 text-[10px] font-medium tabular-nums text-muted-foreground">
							{formatTime(projection.timelinePlayheadTime)}
						</span>
						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9"
							title={t("editor.playback.skipBack")}
							onClick={playback.handlePreviewSkipBack}
						>
							<SkipBack className="h-3.5 w-3.5" weight="fill" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className={`h-9 w-9  ${isPlaying ? "bg-foreground/10 text-foreground hover:bg-foreground/20" : "bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-white/90"} `}
							onClick={playback.togglePlayPause}
							title={t(isPlaying ? "editor.playback.pause" : "editor.playback.play", isPlaying ? "Pause" : "Play")}
						>
							{isPlaying ? (
								<Pause className="h-3.5 w-3.5" weight="fill" />
							) : (
								<Play className="h-3.5 w-3.5" weight="fill" />
							)}
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9"
							title={t("editor.playback.skipForward")}
							onClick={playback.handlePreviewSkipForward}
						>
							<SkipForward className="h-3.5 w-3.5" weight="fill" />
						</Button>
						<span className="ml-1 text-[10px] font-medium tabular-nums text-muted-foreground/70">
							{formatTime(projection.timelineDuration)}
						</span>
					</div>
				</div>

				<div className="editor-playback-volume z-10 ml-auto flex items-center gap-2">
					<label className="flex items-center gap-1 text-[10px] text-muted-foreground" title={t("editor.playback.stepHint")}>
						<span className="whitespace-nowrap">{t("editor.playback.step")}</span>
						<input aria-label={t("editor.playback.stepHint")} type="range" min="0" max="11" step="1" value={playback.stepIndex} onChange={(event) => playback.setStepIndex(Number(event.target.value))} className="w-20 accent-[#d95050]" />
						<span className="w-7 whitespace-nowrap text-right">{playback.stepIndex < 6 ? `${[1, 5, 10, 20, 30, 60][playback.stepIndex]}${t("editor.playback.frames")}` : `${[1, 2, 3, 4, 5, 10][playback.stepIndex - 6]}${t("editor.playback.seconds")}`}</span>
					</label>
					<label className="flex items-center gap-1 text-[10px] text-muted-foreground" title={t("editor.playback.timelineZoomHint")}>
						<span className="whitespace-nowrap">{t("editor.playback.timelineZoom")}</span>
						<input aria-label={t("editor.playback.timelineZoomHint")} type="range" min="1" max="20" step="0.25" value={timelineZoom} onChange={(event) => { const level = Number(event.target.value); setTimelineZoom(level); timelineRef.current?.setZoom(level); }} className="w-20 accent-[#d95050]" />
						<span className="w-7 text-right">{timelineZoom.toFixed(1)}×</span>
					</label>
					<Button
						variant="ghost"
						size="icon"
						aria-label={t(
							isFullscreen
								? "editor.playback.exitFullscreen"
								: "editor.playback.fullscreen",
						)}
						aria-pressed={isFullscreen}
						title={t(
							isFullscreen
								? "editor.playback.exitFullscreen"
								: "editor.playback.fullscreen",
						)}
						disabled={!videoPath}
						onClick={() => void toggleFullscreen()}
					>
						<BoundingBox className="size-4" />
					</Button>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								aria-label={t("editor.playback.volume", "Preview volume")}
								title={t("editor.playback.volume", "Preview volume")}
							>
								{previewVolume <= 0.001 ? (
									<SpeakerX className="size-3.5" />
								) : previewVolume < 0.5 ? (
									<SpeakerLow className="size-3.5" />
								) : (
									<SpeakerHigh className="size-3.5" />
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent
							side="top"
							sideOffset={10}
							aria-label="Preview volume"
							className="flex w-14 flex-col items-center gap-3 p-3"
						>
							<span className="text-[10px] tabular-nums text-muted-foreground">
								{Math.round(previewVolume * 100)}%
							</span>
							<Slider
								aria-label={t("editor.playback.volume", "Preview volume")}
								orientation="vertical"
								min={0}
								max={1}
								step={0.01}
								value={[previewVolume]}
								onValueChange={([value]) => setPreviewVolume(value)}
								className="h-28"
							/>
						</PopoverContent>
					</Popover>
				</div>
				</div>
			)}
		</div>
	);
}
