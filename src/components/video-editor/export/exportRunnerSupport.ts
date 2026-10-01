import type { RefObject } from "react";
import { useCallback } from "react";
import { toast } from "@/components/ui/toast";
import type { SupportedMp4Dimensions } from "@/lib/exporter";
import type { useVideoEditorAudio } from "../audio/useVideoEditorAudio";
import type { getSmokeExportConfig } from "../smokeExportConfig";
import type { useAppearanceState } from "../state/useAppearanceState";
import type { useTimelineState } from "../state/useTimelineState";
import type { CursorTelemetryPoint, SpeedRegion, ZoomRegion } from "../types";
import type { VideoPlaybackRef } from "../VideoPlayback";
import { summarizeErrorMessage } from "../videoEditorUtils";
import type { PendingExportSave } from "./exportPersistence";
import type { useExportSession } from "./useExportSession";
import type { useExportSettings } from "./useExportSettings";

export type ExportRunnerInput = {
	videoPath: string | null;
	videoPlaybackRef: RefObject<VideoPlaybackRef | null>;
	isPlaying: boolean;
	appearance: ReturnType<typeof useAppearanceState>;
	timeline: ReturnType<typeof useTimelineState>;
	exportSettings: ReturnType<typeof useExportSettings>;
	exportSession: ReturnType<typeof useExportSession>;
	audio: ReturnType<typeof useVideoEditorAudio>;
	smokeExportConfig: ReturnType<typeof getSmokeExportConfig>;
	effectiveSpeedRegions: SpeedRegion[];
	effectiveZoomRegions: ZoomRegion[];
	effectiveCursorTelemetry: CursorTelemetryPoint[];
	effectiveShowCursor: boolean;
	ensureSupportedMp4SourceDimensions: (
		frameRate: ReturnType<typeof useExportSettings>["mp4FrameRate"],
		options?: { preferNative?: boolean },
	) => Promise<SupportedMp4Dimensions>;
	captionSidecarPayload?: PendingExportSave["captionSidecar"];
	experimentalNvidiaCudaExport: boolean;
	nvidiaCudaExportAvailable: boolean;
	remountPreview: () => void;
};

export function showExportErrorToast(message: string) {
	const summary = summarizeErrorMessage(message);
	const reason = message.match(/^Reason:\s*(.+)$/m)?.[1];
	toast.error(summary, {
		description: reason && reason !== summary ? reason : undefined,
		copyText: message,
		duration: 20_000,
	});
}

export function useExportSuccessToast() {
	return useCallback((filePath: string) => {
		void playExportSuccessSound();
		toast.success(`Exported successfully to ${filePath}`, {
			action: {
				label: "Show in Folder",
				onClick: async () => {
					try {
						const result = await window.electronAPI.revealInFolder(filePath);
						if (!result.success) {
							toast.error(
								result.error ||
									result.message ||
									"Failed to reveal item in folder.",
							);
						}
					} catch (error) {
						toast.error(`Error revealing in folder: ${String(error)}`);
					}
				},
			},
		});
	}, []);
}

let exportSuccessAudioContext: AudioContext | null = null;

export function primeExportSuccessSound() {
	try {
		exportSuccessAudioContext ??= new AudioContext();
		void exportSuccessAudioContext.resume().catch(() => undefined);
	} catch {
		// Audio is optional when the output device is unavailable.
	}
}

async function playExportSuccessSound() {
	try {
		const context = exportSuccessAudioContext ?? new AudioContext();
		exportSuccessAudioContext = null;
		await context.resume();
		for (const [frequency, start] of [[660, 0], [880, 0.13]] as const) {
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			oscillator.type = "sine";
			oscillator.frequency.value = frequency;
			gain.gain.setValueAtTime(0.0001, context.currentTime + start);
			gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + start + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + 0.22);
			oscillator.connect(gain).connect(context.destination);
			oscillator.start(context.currentTime + start);
			oscillator.stop(context.currentTime + start + 0.23);
		}
		window.setTimeout(() => void context.close(), 500);
	} catch {
		// The export has already succeeded; audio output may be unavailable or muted.
	}
}
