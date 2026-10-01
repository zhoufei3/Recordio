import type { Graphics } from "pixi.js";
import { drawSquircleOnGraphics } from "./squircle";

export const DEFAULT_VIDEO_OUTLINE_COLOR = "#ffffff";

/** Rasterize the static export outline above output resolution, then sample it smoothly. */
export function cacheExportVideoOutline(graphics: Graphics, width: number, height: number): void {
	const resolution = Math.max(
		1,
		Math.min(2, 4096 / Math.max(width, height), Math.sqrt(16_000_000 / (width * height))),
	);
	if (graphics.isCachedAsTexture) {
		graphics.updateCacheTexture();
	} else {
		graphics.cacheAsTexture({ resolution, antialias: true });
	}
}

export function drawVideoOutline(
	graphics: Graphics,
	rect: { x: number; y: number; width: number; height: number; radius: number },
	width: number,
	color: string,
	stageWidth: number,
): void {
	graphics.clear();
	if (!Number.isFinite(width) || width <= 0 || rect.width <= 0 || rect.height <= 0) return;
	const strokeWidth = Math.min((width * stageWidth) / 1920, rect.width / 2, rect.height / 2);
	const inset = strokeWidth / 2;
	const path = {
		x: rect.x + inset,
		y: rect.y + inset,
		width: rect.width - strokeWidth,
		height: rect.height - strokeWidth,
		radius: Math.max(0, rect.radius - inset),
	};
	const strokeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_VIDEO_OUTLINE_COLOR;
	// A translucent fringe softens the single-pixel edge after GPU composition.
	drawSquircleOnGraphics(graphics, path);
	graphics.stroke({ color: strokeColor, width: strokeWidth + 1.5, alpha: 0.22, join: "round" });
	drawSquircleOnGraphics(graphics, path);
	graphics.stroke({
		color: strokeColor,
		width: strokeWidth,
		join: "round",
	});
}
