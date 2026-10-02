import { type RefObject, useCallback, useEffect, useState } from "react";
import type { TimelineEditorHandle } from "../timeline/TimelineEditor";
import type { VideoPlaybackRef } from "../VideoPlayback";

interface UseEditorPlaybackControlsParams {
	videoPlaybackRef: RefObject<VideoPlaybackRef | null>;
	timelineRef: RefObject<TimelineEditorHandle | null>;
	playSourceAudioPreview: () => void;
	timelinePlayheadTime: number;
	timelineDuration: number;
}

export function useEditorPlaybackControls({
	videoPlaybackRef,
	playSourceAudioPreview,
	timelinePlayheadTime,
	timelineDuration,
}: UseEditorPlaybackControlsParams) {
	const [stepIndex, setStepIndex] = useState(1);
	const stepOptions = [1 / 60, 5 / 60, 10 / 60, 20 / 60, 30 / 60, 60 / 60, 1, 2, 3, 4, 5, 10];
	const stepSeconds = stepOptions[stepIndex];
	const getActivePlayback = useCallback(() => videoPlaybackRef.current, [videoPlaybackRef]);

	const startPlayback = useCallback(() => {
		const playback = getActivePlayback();
		if (!playback?.video) return;

		playSourceAudioPreview();
		playback.play().catch((error) => console.error("Video play failed:", error));
	}, [getActivePlayback, playSourceAudioPreview]);

	const togglePlayPause = useCallback(() => {
		const playback = getActivePlayback();
		const video = playback?.video;
		if (!playback || !video) return;

		if (playback.isPlaying) playback.pause();
		else startPlayback();
	}, [getActivePlayback, startPlayback]);

	const handleSeek = useCallback(
		(time: number, options: { pause?: boolean } = {}) => {
			const playback = getActivePlayback();
			const video = playback?.video;
			if (!video) return;

			if (options.pause) playback.pause();
			playback.seekTimeline(time);
		},
		[getActivePlayback],
	);

	const handleTimelineSeek = useCallback(
		(time: number) => handleSeek(time, { pause: true }),
		[handleSeek],
	);

	const handlePreviewSkipBack = useCallback(() => {
		handleSeek(Math.max(0, timelinePlayheadTime - stepSeconds), { pause: true });
	}, [handleSeek, timelinePlayheadTime, stepSeconds]);

	const handlePreviewSkipForward = useCallback(() => {
		handleSeek(Math.min(timelineDuration, timelinePlayheadTime + stepSeconds), { pause: true });
	}, [handleSeek, timelineDuration, timelinePlayheadTime, stepSeconds]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
			if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return;
			const target = event.target as HTMLElement | null;
			if (target?.closest("input,textarea,select,[contenteditable='true'],[role='slider'],[role='dialog']")) return;
			event.preventDefault();
			if (event.key === "ArrowLeft") handlePreviewSkipBack();
			else handlePreviewSkipForward();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handlePreviewSkipBack, handlePreviewSkipForward]);

	return {
		startPlayback,
		togglePlayPause,
		handleSeek,
		handleTimelineSeek,
		handlePreviewSkipBack,
		handlePreviewSkipForward,
		stepIndex,
		setStepIndex,
	};
}
