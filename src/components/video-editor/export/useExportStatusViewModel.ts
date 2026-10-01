import { useEffect, useState } from "react";
import type { useI18n } from "@/contexts/I18nContext";
import { resolveExportStatusModel } from "../exportStatusModel";
import type { useExportSession } from "./useExportSession";
import type { useExportSettings } from "./useExportSettings";

type Input = {
	t: ReturnType<typeof useI18n>["t"];
	session: ReturnType<typeof useExportSession>;
	settings: ReturnType<typeof useExportSettings>;
};

export function useExportStatusViewModel({ t, session, settings }: Input) {
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	useEffect(() => {
		if (!session.isExporting) {
			setElapsedSeconds(0);
			return;
		}
		const startedAt = Date.now();
		const update = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
		update();
		const interval = window.setInterval(update, 1000);
		return () => window.clearInterval(interval);
	}, [session.isExporting]);
	const formatDuration = (seconds: number) => {
		const value = Math.max(0, Math.round(seconds));
		const hours = Math.floor(value / 3600);
		const minutes = Math.floor((value % 3600) / 60);
		const remainder = value % 60;
		return hours > 0
			? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
			: `${minutes}:${String(remainder).padStart(2, "0")}`;
	};
	const status = resolveExportStatusModel({
		isExporting: session.isExporting,
		exportProgress: session.exportProgress,
		exportFormat: settings.exportFormat,
		exportPipelineModel: settings.exportPipelineModel,
	});
	const exportRenderSpeedLabel = status.renderSpeedFps
		? t("editor.exportStatus.renderSpeed", "Render speed {{fps}} FPS", {
				fps: status.renderSpeedFps,
			})
		: null;
	const progress = session.exportProgress;
	const remainingSeconds =
		progress &&
		!status.isExportPreparing &&
		!status.isExportFinalizing &&
		!status.isExportSaving &&
		progress.currentFrame > 0 &&
		progress.totalFrames > progress.currentFrame &&
		elapsedSeconds > 0
			? (progress.totalFrames - progress.currentFrame) /
				(progress.renderFps && progress.renderFps > 0
					? (progress.renderFps + progress.currentFrame / elapsedSeconds) / 2
					: progress.currentFrame / elapsedSeconds)
			: null;
	const exportElapsedLabel = formatDuration(elapsedSeconds);
	const exportRemainingLabel =
		remainingSeconds !== null && Number.isFinite(remainingSeconds)
			? formatDuration(remainingSeconds)
			: t("editor.exportStatus.calculating", "Calculating...");
	const exportPercentLabel = progress
		? status.isExportPreparing
			? t("editor.exportStatus.preparing", "Preparing export...")
			: status.isExportSaving
				? t("editor.exportStatus.saving", "Opening save dialog...")
				: status.isRenderingAudio
					? t("editor.exportStatus.renderingAudio", "Rendering audio {{percent}}%", {
							percent: Math.round((progress.audioProgress ?? 0) * 100),
						})
					: status.isExportFinalizing
						? settings.exportFormat === "mp4" &&
							settings.exportPipelineModel === "modern"
							? status.isExportFinalSaveIndeterminate
								? t(
										"editor.exportStatus.muxingAndSaving",
										"Muxing audio and saving file...",
									)
								: t(
										"editor.exportStatus.muxingAndSavingPercent",
										"Muxing and saving {{percent}}%",
										{ percent: status.exportFinalizingPercent ?? 100 },
									)
							: t(
									"editor.exportStatus.finalizingPercent",
									"Finalizing {{percent}}%",
									{ percent: status.exportFinalizingPercent ?? 100 },
								)
						: t("editor.exportStatus.completePercent", "{{percent}}% complete", {
								percent: Math.round(progress.percentage),
							})
		: t("editor.exportStatus.preparing", "Preparing export...");

	return {
		...status,
		exportRenderSpeedLabel,
		exportPercentLabel,
		exportElapsedLabel,
		exportRemainingLabel,
	};
}
