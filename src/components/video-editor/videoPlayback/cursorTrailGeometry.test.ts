import { describe, expect, it } from "vitest";
import { buildCursorTrailEdges, recordCursorTrailPosition, sampleCursorTrail, type TrailPosition } from "./cursorTrailGeometry";

describe("displayed cursor trail", () => {
	it("samples the rendered cursor history and ends exactly at the displayed hotspot", () => {
		const history: TrailPosition[] = [];
		for (const point of [{ x: 0, y: 0, timeMs: 0 }, { x: 8, y: 2, timeMs: 100 }, { x: 10, y: 3, timeMs: 200 }]) {
			recordCursorTrailPosition(history, point, 300);
		}
		const points = sampleCursorTrail(history, 300, 8);
		expect(points[points.length - 1]).toEqual({ x: 10, y: 3, fade: 1 });
		expect(points.every((point) => point.x <= 10)).toBe(true);
	});

	it("retains duration independently of the requested ribbon segment count", () => {
		const history: TrailPosition[] = [];
		for (let timeMs = 0; timeMs <= 2000; timeMs += 20) {
			recordCursorTrailPosition(history, { x: timeMs, y: 0, timeMs }, 1200);
		}
		expect(history[0].timeMs).toBe(780);
		expect(history[1].timeMs).toBe(800);
		expect(sampleCursorTrail(history, 1200, 3)[0].x).toBe(1100);
	});

	it("replaces duplicate timestamps and clears history on seeking or resetting", () => {
		const history: TrailPosition[] = [];
		recordCursorTrailPosition(history, { x: 1, y: 0, timeMs: 100 }, 1200);
		recordCursorTrailPosition(history, { x: 2, y: 0, timeMs: 100 }, 1200);
		expect(history).toHaveLength(1);
		recordCursorTrailPosition(history, { x: 3, y: 0, timeMs: 50 }, 1200);
		expect(history).toEqual([{ x: 3, y: 0, timeMs: 50 }]);
		recordCursorTrailPosition(history, { x: 4, y: 0, timeMs: 80 }, 1200, true);
		expect(history).toHaveLength(1);
	});

	for (const coordinates of [
		[[0, 0], [5, 2], [9, -3], [10, 0]],
		[[0, 0], [20, 0], [15, 2], [10, 0]],
		[[0, 0], [5, 3], [5, 3], [10, 4], [10, 4]],
	]) {
		it(`caps a wide turning ribbon at the hotspot: ${JSON.stringify(coordinates)}`, () => {
			const points = coordinates.map(([x, y], index) => ({ x, y, fade: (index + 1) / coordinates.length }));
			const head = points[points.length - 1];
			const previous = [...points].reverse().find((point) => point.x !== head.x || point.y !== head.y)!;
			const { left, right } = buildCursorTrailEdges(points, 40);
			expect(left[left.length - 1]).toEqual({ x: head.x, y: head.y });
			expect(right[right.length - 1]).toEqual({ x: head.x, y: head.y });
			for (const vertex of [...left, ...right]) {
				const ahead = (vertex.x - head.x) * (head.x - previous.x) + (vertex.y - head.y) * (head.y - previous.y);
				expect(ahead).toBeLessThanOrEqual(0.000001);
			}
		});
	}
});
