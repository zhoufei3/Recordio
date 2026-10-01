import { DEFAULT_ZOOM_IN_DURATION_MS, DEFAULT_ZOOM_OUT_DURATION_MS } from "./types";

export type CursorMotionPresetId =
	| "focused"
	| "brisk"
	| "balanced"
	| "narrative"
	| "smooth"
	| "immersive"
	| "elastic-soft"
	| "elastic-vivid";

export interface CursorMotionPreset {
	id: CursorMotionPresetId;
	label: string;
	zoomSmoothness: number;
	zoomInDurationMs: number;
	zoomOutDurationMs: number;
	cursorSize: number;
	cursorSmoothing: number;
	cursorSpringStiffnessMultiplier: number;
	cursorSpringDampingMultiplier: number;
	cursorSpringMassMultiplier: number;
	cameraSpringStiffnessMultiplier: number;
	cameraSpringDampingMultiplier: number;
	cameraSpringMassMultiplier: number;
	cursorClickBounce: number;
	cursorClickBounceDuration: number;
}

export interface CursorMotionPresetSelectionInput {
	zoomInDurationMs: number;
	zoomOutDurationMs: number;
	cursorSize: number;
	cursorSmoothing: number;
	cursorSpringStiffnessMultiplier: number;
	cursorSpringDampingMultiplier: number;
	cursorSpringMassMultiplier: number;
	cameraSpringStiffnessMultiplier?: number;
	cameraSpringDampingMultiplier?: number;
	cameraSpringMassMultiplier?: number;
	cursorClickBounce: number;
	cursorClickBounceDuration: number;
}

const SHARED_CURSOR_PRESET_VALUES = {
	cursorSize: 2.5,
	cursorSmoothing: 0.67,
	cursorSpringMassMultiplier: 1.29,
	cursorClickBounce: 2,
	cursorClickBounceDuration: 350,
} as const;

const DEFAULT_CAMERA_SPRING = {
	cameraSpringStiffnessMultiplier: 1,
	cameraSpringDampingMultiplier: 1.13,
	cameraSpringMassMultiplier: 1.12,
} as const;

export const CURSOR_MOTION_PRESETS: Record<CursorMotionPresetId, CursorMotionPreset> = {
	focused: {
		id: "focused",
		label: "Focused",
		zoomSmoothness: 0.5,
		zoomInDurationMs: 200,
		zoomOutDurationMs: 200,
		...SHARED_CURSOR_PRESET_VALUES,
		...DEFAULT_CAMERA_SPRING,
		cursorSpringStiffnessMultiplier: 1.35,
		cursorSpringDampingMultiplier: 0.79,
	},
	brisk: {
		id: "brisk",
		label: "Brisk",
		zoomSmoothness: 0.5,
		zoomInDurationMs: 350,
		zoomOutDurationMs: 300,
		...SHARED_CURSOR_PRESET_VALUES,
		...DEFAULT_CAMERA_SPRING,
		cursorSpringStiffnessMultiplier: 1.25,
		cursorSpringDampingMultiplier: 1,
	},
	balanced: {
		id: "balanced",
		label: "Balanced",
		zoomSmoothness: 0.5,
		zoomInDurationMs: 650,
		zoomOutDurationMs: 550,
		...SHARED_CURSOR_PRESET_VALUES,
		...DEFAULT_CAMERA_SPRING,
		cursorSpringStiffnessMultiplier: 1.12,
		cursorSpringDampingMultiplier: 1.12,
	},
	narrative: {
		id: "narrative",
		label: "Narrative",
		zoomSmoothness: 0.5,
		zoomInDurationMs: 1100,
		zoomOutDurationMs: 850,
		...SHARED_CURSOR_PRESET_VALUES,
		...DEFAULT_CAMERA_SPRING,
		cursorSpringStiffnessMultiplier: 1,
		cursorSpringDampingMultiplier: 1.25,
	},
	smooth: {
		id: "smooth",
		label: "Smooth",
		zoomSmoothness: 0.5,
		zoomInDurationMs: DEFAULT_ZOOM_IN_DURATION_MS,
		zoomOutDurationMs: DEFAULT_ZOOM_OUT_DURATION_MS,
		...SHARED_CURSOR_PRESET_VALUES,
		...DEFAULT_CAMERA_SPRING,
		cursorSpringStiffnessMultiplier: 0.92,
		cursorSpringDampingMultiplier: 1.36,
	},
	immersive: {
		id: "immersive",
		label: "Immersive",
		zoomSmoothness: 0.5,
		zoomInDurationMs: 1900,
		zoomOutDurationMs: 1350,
		...SHARED_CURSOR_PRESET_VALUES,
		...DEFAULT_CAMERA_SPRING,
		cursorSpringStiffnessMultiplier: 0.85,
		cursorSpringDampingMultiplier: 1.45,
	},
	"elastic-soft": {
		id: "elastic-soft",
		label: "Soft Spring",
		zoomSmoothness: 0.5,
		zoomInDurationMs: 700,
		zoomOutDurationMs: 650,
		...SHARED_CURSOR_PRESET_VALUES,
		cursorSpringStiffnessMultiplier: 1.08,
		cursorSpringDampingMultiplier: 0.7,
		cameraSpringStiffnessMultiplier: 1.08,
		cameraSpringDampingMultiplier: 0.78,
		cameraSpringMassMultiplier: 1.1,
		cursorClickBounce: 2.5,
		cursorClickBounceDuration: 390,
	},
	"elastic-vivid": {
		id: "elastic-vivid",
		label: "Lively Spring",
		zoomSmoothness: 0.5,
		zoomInDurationMs: 480,
		zoomOutDurationMs: 520,
		...SHARED_CURSOR_PRESET_VALUES,
		cursorSpringStiffnessMultiplier: 1.3,
		cursorSpringDampingMultiplier: 0.6,
		cursorSpringMassMultiplier: 1.25,
		cameraSpringStiffnessMultiplier: 1.35,
		cameraSpringDampingMultiplier: 0.72,
		cameraSpringMassMultiplier: 1.05,
		cursorClickBounce: 3,
		cursorClickBounceDuration: 430,
	},
};

export function getMatchingCursorMotionPresetId(
	values: CursorMotionPresetSelectionInput,
): CursorMotionPresetId | null {
	for (const presetId of Object.keys(CURSOR_MOTION_PRESETS) as CursorMotionPresetId[]) {
		const preset = CURSOR_MOTION_PRESETS[presetId];
		if (
			preset.zoomInDurationMs === values.zoomInDurationMs &&
			preset.zoomOutDurationMs === values.zoomOutDurationMs &&
			preset.cursorSize === values.cursorSize &&
			preset.cursorSmoothing === values.cursorSmoothing &&
			preset.cursorSpringStiffnessMultiplier === values.cursorSpringStiffnessMultiplier &&
			preset.cursorSpringDampingMultiplier === values.cursorSpringDampingMultiplier &&
			preset.cursorSpringMassMultiplier === values.cursorSpringMassMultiplier &&
			(values.cameraSpringStiffnessMultiplier === undefined ||
				preset.cameraSpringStiffnessMultiplier === values.cameraSpringStiffnessMultiplier) &&
			(values.cameraSpringDampingMultiplier === undefined ||
				preset.cameraSpringDampingMultiplier === values.cameraSpringDampingMultiplier) &&
			(values.cameraSpringMassMultiplier === undefined ||
				preset.cameraSpringMassMultiplier === values.cameraSpringMassMultiplier) &&
			preset.cursorClickBounce === values.cursorClickBounce &&
			preset.cursorClickBounceDuration === values.cursorClickBounceDuration
		) {
			return presetId;
		}
	}

	return null;
}

export function resolveCursorMotionPresetId(
	values: CursorMotionPresetSelectionInput,
	fallback: CursorMotionPresetId = "focused",
): CursorMotionPresetId {
	return getMatchingCursorMotionPresetId(values) ?? fallback;
}
