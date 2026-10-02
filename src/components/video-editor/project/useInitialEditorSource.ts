/* biome-ignore-all lint/correctness/useExhaustiveDependencies: editor state setters are stable and initial source loading intentionally runs once per launch configuration. */
import { type MutableRefObject, useEffect, useRef } from "react";
import { fromFileUrl, resolveVideoUrl } from "../projectPersistence";
import type { getDevOpenRecordingConfig, getSmokeExportConfig } from "../smokeExportConfig";
import type { useAppearanceState } from "../state/useAppearanceState";
import type { useProjectState } from "../state/useProjectState";
import type { useTimelineState } from "../state/useTimelineState";
import { DEFAULT_WEBCAM_TIME_OFFSET_MS } from "../types";

type Input = {
	project: ReturnType<typeof useProjectState>;
	appearance: ReturnType<typeof useAppearanceState>;
	timeline: ReturnType<typeof useTimelineState>;
	smokeConfig: ReturnType<typeof getSmokeExportConfig>;
	devConfig: ReturnType<typeof getDevOpenRecordingConfig>;
	videoSourcePath: string | null;
	pendingFreshRecordingAutoZoomPathRef: MutableRefObject<string | null>;
	applyLoadedProject: (candidate: unknown, path?: string | null) => Promise<boolean>;
	resetSourceScopedEditorState: () => void;
};

export function useInitialEditorSource({
	project,
	appearance,
	timeline,
	smokeConfig,
	devConfig,
	videoSourcePath,
	pendingFreshRecordingAutoZoomPathRef,
	applyLoadedProject,
	resetSourceScopedEditorState,
}: Input) {
	const initialLoadStartedRef = useRef(false);

	useEffect(() => {
		// This effect owns launch-time hydration. Several of the callbacks it uses
		// intentionally close over live editor state, so their identities may change
		// after hydration updates that state. Never interpret that as a request to
		// reload the source and reset the editor again.
		if (initialLoadStartedRef.current) return;
		initialLoadStartedRef.current = true;

		async function loadInitialData() {
			try {
				if (smokeConfig.enabled && smokeConfig.projectPath) {
					const result = await window.electronAPI.openProjectFileAtPath(
						smokeConfig.projectPath,
					);
					if (!result.success || !result.project) {
						project.setError(
							`Smoke export failed to load project ${smokeConfig.projectPath}: ${result.error || result.message || "unknown error"}`,
						);
						return;
					}
					if (
						!(await applyLoadedProject(
							result.project,
							result.path ?? smokeConfig.projectPath,
						))
					) {
						project.setError(
							`Smoke export could not apply project ${smokeConfig.projectPath}`,
						);
						return;
					}
					project.setError(null);
					return;
				}

				if (!smokeConfig.enabled && devConfig.inputPath) {
					const sourcePath = fromFileUrl(devConfig.inputPath);
					const webcamPath = devConfig.webcamInputPath
						? fromFileUrl(devConfig.webcamInputPath)
						: null;
					if (webcamPath) {
						await window.electronAPI.setCurrentRecordingSession?.({
							videoPath: sourcePath,
							webcamPath,
							timeOffsetMs: DEFAULT_WEBCAM_TIME_OFFSET_MS,
						});
					} else {
						await window.electronAPI.setCurrentVideoPath(sourcePath);
					}
					const sourceUrl = await resolveVideoUrl(sourcePath);
					project.setVideoSourcePath(sourcePath);
					project.setVideoPath(sourceUrl);
					project.setCurrentProjectPath(null);
					project.setLastSavedSnapshot(null);
					resetSourceScopedEditorState();
					pendingFreshRecordingAutoZoomPathRef.current =
						appearance.autoApplyFreshRecordingAutoZooms ? sourceUrl : null;
					appearance.setWebcam((previous) => ({
						...previous,
						visibleRanges: undefined,
						enabled: Boolean(webcamPath),
						sourcePath: webcamPath,
						timeOffsetMs: DEFAULT_WEBCAM_TIME_OFFSET_MS,
					}));
					project.setError(null);
					return;
				}

				if (smokeConfig.enabled) {
					if (!smokeConfig.inputPath) {
						project.setError("Smoke export input path is missing.");
						return;
					}
					const sourcePath = fromFileUrl(smokeConfig.inputPath);
					const webcamPath = smokeConfig.webcamInputPath
						? fromFileUrl(smokeConfig.webcamInputPath)
						: null;
					if (webcamPath) {
						await window.electronAPI.setCurrentRecordingSession?.({
							videoPath: sourcePath,
							webcamPath,
							timeOffsetMs: DEFAULT_WEBCAM_TIME_OFFSET_MS,
						});
					} else {
						await window.electronAPI.setCurrentVideoPath(sourcePath);
					}
					const sourceUrl = await resolveVideoUrl(sourcePath);
					project.setVideoSourcePath(sourcePath);
					project.setVideoPath(sourceUrl);
					project.setCurrentProjectPath(null);
					project.setLastSavedSnapshot(null);
					resetSourceScopedEditorState();
					pendingFreshRecordingAutoZoomPathRef.current = null;
					appearance.setWebcam((previous) => ({
						...previous,
						visibleRanges: undefined,
						enabled: Boolean(webcamPath),
						sourcePath: webcamPath,
						timeOffsetMs: DEFAULT_WEBCAM_TIME_OFFSET_MS,
						shadow: smokeConfig.webcamShadow ?? previous.shadow,
						size: smokeConfig.webcamSize ?? previous.size,
						width: smokeConfig.webcamSize ?? previous.width ?? previous.size,
						height: smokeConfig.webcamSize ?? previous.height ?? previous.size,
					}));
					project.setError(null);
					return;
				}

				const recordingLaunch = await window.electronAPI.consumeRecordingEditorLaunch?.();
				if (recordingLaunch) {
					const sourcePath = fromFileUrl(recordingLaunch.videoPath);
					if (!sourcePath) throw new Error("The completed recording could not be found.");
					const webcamPath = recordingLaunch.webcamPath
						? fromFileUrl(recordingLaunch.webcamPath)
						: null;
					const sourceUrl = await resolveVideoUrl(sourcePath);
					project.setVideoSourcePath(sourcePath);
					project.setVideoPath(sourceUrl);
					project.setCurrentProjectPath(null);
					project.setLastSavedSnapshot(null);
					project.setProjectBrowserOpen(false);
					resetSourceScopedEditorState();
					pendingFreshRecordingAutoZoomPathRef.current =
						appearance.autoApplyFreshRecordingAutoZooms ? sourceUrl : null;
					appearance.setWebcam((previous) => ({
						...previous,
						visibleRanges: undefined,
						enabled: Boolean(webcamPath),
						sourcePath: webcamPath,
						timeOffsetMs: webcamPath
							? (recordingLaunch.timeOffsetMs ?? DEFAULT_WEBCAM_TIME_OFFSET_MS)
							: DEFAULT_WEBCAM_TIME_OFFSET_MS,
					}));
					project.setError(null);
					return;
				}

				// Normal launches always land on the project library. Restoring a previous
				// project or recording session must be an explicit user action.
				project.setProjectBrowserOpen(true);
			} catch (error) {
				project.setError(`Error loading video: ${String(error)}`);
			} finally {
				project.setLoading(false);
			}
		}
		void loadInitialData();
	}, [
		applyLoadedProject,
		devConfig,
		resetSourceScopedEditorState,
		smokeConfig,
	]);

	useEffect(() => {
		if (!window.electronAPI.onRecordingSessionChanged) return;
		return window.electronAPI.onRecordingSessionChanged((session) => {
			const sessionSourcePath = session?.videoPath ? fromFileUrl(session.videoPath) : null;
			const webcamPath = session?.webcamPath ? fromFileUrl(session.webcamPath) : null;
			if (!session || sessionSourcePath !== videoSourcePath) return;
			appearance.setWebcam((previous) => ({
				...previous,
				visibleRanges: undefined,
				enabled: Boolean(webcamPath),
				sourcePath: webcamPath,
				timeOffsetMs: webcamPath
					? (session.timeOffsetMs ?? previous.timeOffsetMs)
					: DEFAULT_WEBCAM_TIME_OFFSET_MS,
			}));
			timeline.setSourceAudioFallbackRefreshKey((key) => key + 1);
		});
	}, [videoSourcePath, appearance.setWebcam, timeline.setSourceAudioFallbackRefreshKey]);

	useEffect(() => {
		let cancelled = false;
		if (!appearance.webcam.sourcePath) {
			appearance.setResolvedWebcamVideoUrl(null);
			return;
		}
		void resolveVideoUrl(appearance.webcam.sourcePath).then((url) => {
			if (!cancelled) appearance.setResolvedWebcamVideoUrl(url);
		});
		return () => {
			cancelled = true;
		};
	}, [appearance.webcam.sourcePath, appearance.setResolvedWebcamVideoUrl]);

	useEffect(() => {
		if (!appearance.autoApplyFreshRecordingAutoZooms) {
			pendingFreshRecordingAutoZoomPathRef.current = null;
		}
	}, [appearance.autoApplyFreshRecordingAutoZooms, pendingFreshRecordingAutoZoomPathRef]);
}
