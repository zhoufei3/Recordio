import { describe, expect, it } from "vitest";
import { CURSOR_MOTION_PRESETS, resolveCursorMotionPresetId } from "../cursorMotionPresets";
import { createEdgeRippleState, getEdgeRippleWaves, updateEdgeRipple } from "./edgeRipple";

const input = {
	enabled: true,
	regionId: "zoom-1",
	progress: 1,
	focus: { cx: 1 / 3, cy: 0.5 },
	cursorFocus: { cx: 0.05, cy: 0.6 },
	zoomScale: 1.5,
	timeMs: 1000,
	stageSize: { width: 1000, height: 700 },
	mask: { x: 100, y: 100, width: 800, height: 500 },
};

describe("edge ripple", () => {
	it("recognizes the selected edge ripple preset", () => {
		expect(resolveCursorMotionPresetId(CURSOR_MOTION_PRESETS["elastic-edge-ripple"]))
			.toBe("elastic-edge-ripple");
	});

	it("triggers at the clamped 1.5x camera boundary and projects the mouse onto the edge", () => {
		const frame = updateEdgeRipple(createEdgeRippleState(), input);
		expect(frame?.origin.x).toBe(100);
		expect(frame?.origin.y).toBeCloseTo(425);
	});

	it("emits broad translucent waves in sequence and fades them as they expand", () => {
		const frame = updateEdgeRipple(createEdgeRippleState(), input)!;
		expect(getEdgeRippleWaves(frame)).toHaveLength(0);
		const early = getEdgeRippleWaves({ ...frame, ageMs: 100 });
		const later = getEdgeRippleWaves({ ...frame, ageMs: 500 });
		expect(early).toHaveLength(1);
		expect(later).toHaveLength(3);
		expect(later[0].radius).toBeGreaterThan(early[0].radius);
		expect(later[0].alpha).toBeLessThan(early[0].alpha);
		expect(later.every((wave) => wave.width >= 28 && wave.alpha > 0 && wave.alpha < 1)).toBe(true);
	});

	it("chooses the edge nearest the mouse when the camera reaches a corner", () => {
		const frame = updateEdgeRipple(createEdgeRippleState(), {
			...input,
			focus: { cx: 1 / 3, cy: 1 / 3 },
			cursorFocus: { cx: 0.2, cy: 0.02 },
		});
		expect(frame?.origin.y).toBe(100);
		expect(frame?.origin.x).toBeCloseTo(340);
	});

	it("does not trigger while the camera is centered", () => {
		expect(updateEdgeRipple(createEdgeRippleState(), {
			...input, focus: { cx: 0.5, cy: 0.5 },
		})).toBeNull();
	});

	it("finishes expansion after the zoom ends without retriggering a held zoom", () => {
		const state = createEdgeRippleState();
		updateEdgeRipple(state, input);
		expect(updateEdgeRipple(state, { ...input, regionId: undefined, progress: 0, timeMs: 1500 })?.ageMs)
			.toBe(500);
		expect(updateEdgeRipple(state, { ...input, timeMs: 2200 })).toBeNull();
		expect(updateEdgeRipple(state, { ...input, timeMs: 2300 })).toBeNull();
	});
});
