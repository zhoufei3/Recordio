import type { ZoomFocus } from "../types";

const RIPPLE_START_PROGRESS = 0.62;
const RIPPLE_DURATION_MS = 1100;
const RIPPLE_SPEED_PX_PER_MS = 0.48;
const RIPPLE_RING_COUNT = 3;

export type EdgeRipplePoint = { x: number; y: number };

export type EdgeRippleState = {
	regionId: string | null;
	startedAtMs: number | null;
	lastTimeMs: number | null;
	origin: EdgeRipplePoint | null;
};

export type EdgeRippleFrame = {
	origin: EdgeRipplePoint;
	ageMs: number;
	stageSize: { width: number; height: number };
	mask: { x: number; y: number; width: number; height: number };
};

export function createEdgeRippleState(): EdgeRippleState {
	return { regionId: null, startedAtMs: null, lastTimeMs: null, origin: null };
}

function resolveNearestEdgePoint(
	focus: ZoomFocus,
	cursorFocus: ZoomFocus | undefined,
	zoomScale: number,
	stageSize: { width: number; height: number },
	mask: { x: number; y: number; width: number; height: number },
): EdgeRipplePoint | null {
	if (mask.width <= 0 || mask.height <= 0 || zoomScale <= 1) return null;

	const x = Math.min(1, Math.max(0, focus.cx));
	const y = Math.min(1, Math.max(0, focus.cy));
	// The camera center stops half a visible viewport from the source edge.
	// At 1.5x this is 1/3, not the amount cropped away (1/6).
	const edgeThreshold = 1 / (2 * zoomScale) + 0.025;
	const cursorX = Math.min(1, Math.max(0, ((cursorFocus?.cx ?? x) - x) * zoomScale + 0.5));
	const cursorY = Math.min(1, Math.max(0, ((cursorFocus?.cy ?? y) - y) * zoomScale + 0.5));
	const candidates = [
		{
			distance: x * mask.width,
			cursorDistance: cursorX * mask.width,
			limit: edgeThreshold * mask.width,
			point: { x: mask.x, y: mask.y + cursorY * mask.height },
		},
		{
			distance: (1 - x) * mask.width,
			cursorDistance: (1 - cursorX) * mask.width,
			limit: edgeThreshold * mask.width,
			point: { x: mask.x + mask.width, y: mask.y + cursorY * mask.height },
		},
		{
			distance: y * mask.height,
			cursorDistance: cursorY * mask.height,
			limit: edgeThreshold * mask.height,
			point: { x: mask.x + cursorX * mask.width, y: mask.y },
		},
		{
			distance: (1 - y) * mask.height,
			cursorDistance: (1 - cursorY) * mask.height,
			limit: edgeThreshold * mask.height,
			point: { x: mask.x + cursorX * mask.width, y: mask.y + mask.height },
		},
	].filter((candidate) => candidate.distance <= candidate.limit);
	if (candidates.length === 0) return null;
	const nearest = candidates.reduce((best, candidate) =>
		candidate.cursorDistance < best.cursorDistance ? candidate : best,
	);

	return {
		x: Math.min(stageSize.width, Math.max(0, nearest.point.x)),
		y: Math.min(stageSize.height, Math.max(0, nearest.point.y)),
	};
}

export function updateEdgeRipple(
	state: EdgeRippleState,
	{
		enabled,
		regionId,
		progress,
		focus,
		cursorFocus,
		zoomScale,
		timeMs,
		stageSize,
		mask,
	}: {
		enabled: boolean;
		regionId?: string;
		progress: number;
		focus: ZoomFocus;
		cursorFocus?: ZoomFocus;
		zoomScale: number;
		timeMs: number;
		stageSize: { width: number; height: number };
		mask: { x: number; y: number; width: number; height: number };
	},
): EdgeRippleFrame | null {
	if (!enabled || timeMs < (state.lastTimeMs ?? timeMs) - 1) {
		Object.assign(state, createEdgeRippleState());
		return null;
	}

	if (regionId && state.regionId !== regionId) {
		state.regionId = regionId;
		state.startedAtMs = null;
		state.origin = null;
	}
	state.lastTimeMs = timeMs;

	// Keep the ripple alive after its zoom region ends. Zoom regions can be
	// shorter than the ripple duration, so resetting as soon as regionId becomes
	// empty made the expanding rings disappear before they could be seen.
	if (regionId && progress >= RIPPLE_START_PROGRESS && !state.origin) {
		state.origin = resolveNearestEdgePoint(focus, cursorFocus, zoomScale, stageSize, mask);
		if (state.origin) state.startedAtMs = timeMs;
	}
	if (!state.origin || state.startedAtMs === null) return null;

	const ageMs = timeMs - state.startedAtMs;
	if (ageMs < 0 || ageMs > RIPPLE_DURATION_MS) return null;

	return { origin: state.origin, ageMs, stageSize, mask };
}

export function getEdgeRippleWaves(frame: EdgeRippleFrame) {
	const scale = Math.max(0.5, Math.min(frame.stageSize.width, frame.stageSize.height) / 700);
	const waves: Array<{ radius: number; width: number; alpha: number }> = [];
	for (let index = 0; index < RIPPLE_RING_COUNT; index += 1) {
		const age = frame.ageMs - index * 140;
		if (age <= 0) continue;
		const fadeIn = Math.min(1, age / 90);
		const fadeOut = Math.max(0, 1 - age / RIPPLE_DURATION_MS);
		waves.push({
			radius: (12 + age * RIPPLE_SPEED_PX_PER_MS) * scale,
			width: (28 + age * 0.012) * scale,
			alpha: fadeIn * fadeOut * (1 - index * 0.15),
		});
	}
	return waves;
}

/** Soft translucent crests and troughs, shared by preview and export. */
export function drawEdgeRippleSurface(
	context: CanvasRenderingContext2D,
	frame: EdgeRippleFrame | null,
) {
	context.clearRect(0, 0, context.canvas.width, context.canvas.height);
	if (!frame) return;
	const { x, y } = frame.origin;
	for (const wave of getEdgeRippleWaves(frame)) {
		const inner = Math.max(0, wave.radius - wave.width);
		const outer = wave.radius + wave.width;
		const gradient = context.createRadialGradient(x, y, inner, x, y, outer);
		// The broad highlight lifts the surface; the soft adjacent shadow gives it
		// depth without an outline or opaque tint obscuring the wallpaper.
		gradient.addColorStop(0, "rgba(255,255,255,0)");
		gradient.addColorStop(0.18, `rgba(225,247,255,${wave.alpha * 0.06})`);
		gradient.addColorStop(0.38, `rgba(255,255,255,${wave.alpha * 0.22})`);
		gradient.addColorStop(0.50, `rgba(255,255,255,${wave.alpha * 0.32})`);
		gradient.addColorStop(0.62, `rgba(210,240,250,${wave.alpha * 0.08})`);
		gradient.addColorStop(0.76, `rgba(16,43,58,${wave.alpha * 0.16})`);
		gradient.addColorStop(0.90, `rgba(16,43,58,${wave.alpha * 0.04})`);
		gradient.addColorStop(1, "rgba(16,43,58,0)");
		context.fillStyle = gradient;
		context.fillRect(x - outer, y - outer, outer * 2, outer * 2);
	}
}
