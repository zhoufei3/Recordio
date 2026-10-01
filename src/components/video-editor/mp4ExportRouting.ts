import type { ExportBackendPreference, ExportPipelineModel, ExportSettings } from "@/lib/exporter";
import {
	normalizeLightningRuntimePlatform,
	shouldPreferNativeAutoBackend,
} from "@/lib/exporter/backendPolicy";
import type { SmokeExportConfig } from "./smokeExportConfig";

export function shouldUseNativeMp4Dimensions(
	pipelineModel: ExportPipelineModel,
	backendPreference: ExportBackendPreference,
): boolean {
	if (pipelineModel !== "modern" || !window.electronAPI?.nativeVideoExportStart) return false;
	if (backendPreference === "breeze") return true;
	return (
		backendPreference === "auto" &&
		shouldPreferNativeAutoBackend(
			normalizeLightningRuntimePlatform(navigator.platform || navigator.userAgent),
		)
	);
}

export type Mp4ExportRouting = {
	pipelineModel: ExportPipelineModel;
	useExperimentalNativeExport: boolean;
	useExperimentalNvidiaCudaExport: boolean;
	backendPreference: ExportBackendPreference;
};

export function resolveMp4ExportRouting({
	smokeExportConfig,
	settings,
	exportPipelineModel,
	exportBackendPreference,
	experimentalNvidiaCudaExport,
	nvidiaCudaExportAvailable,
}: {
	smokeExportConfig: Pick<
		SmokeExportConfig,
		"enabled" | "pipelineModel" | "useNativeExport" | "backendPreference"
	>;
	settings: Pick<ExportSettings, "pipelineModel" | "backendPreference">;
	exportPipelineModel: ExportPipelineModel;
	exportBackendPreference: ExportBackendPreference;
	experimentalNvidiaCudaExport: boolean;
	nvidiaCudaExportAvailable: boolean;
}): Mp4ExportRouting {
	const pipelineModel = smokeExportConfig.enabled
		? (smokeExportConfig.pipelineModel ?? "modern")
		: (settings.pipelineModel ?? exportPipelineModel);
	const useExperimentalNativeExport =
		pipelineModel === "modern" &&
		(smokeExportConfig.enabled ? smokeExportConfig.useNativeExport : true);
	const useExperimentalNvidiaCudaExport =
		useExperimentalNativeExport && experimentalNvidiaCudaExport && nvidiaCudaExportAvailable;
	const backendPreference =
		pipelineModel === "legacy"
			? "webcodecs"
			: smokeExportConfig.enabled
				? (smokeExportConfig.backendPreference ??
					(smokeExportConfig.useNativeExport ? "breeze" : "webcodecs"))
				: useExperimentalNativeExport
					? "auto"
					: (settings.backendPreference ?? exportBackendPreference);

	return {
		pipelineModel,
		useExperimentalNativeExport,
		useExperimentalNvidiaCudaExport,
		backendPreference,
	};
}
