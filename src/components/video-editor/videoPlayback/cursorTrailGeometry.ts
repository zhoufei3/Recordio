export type TrailPosition = { x: number; y: number; timeMs: number };
export type TrailPoint = { x: number; y: number; fade: number };

export function recordCursorTrailPosition(
	history: TrailPosition[],
	point: TrailPosition,
	durationMs: number,
	reset = false,
) {
	const last = history[history.length - 1];
	if (reset || (last && point.timeMs < last.timeMs)) history.length = 0;
	if (history.length && history[history.length - 1].timeMs === point.timeMs) {
		history[history.length - 1] = point;
	} else history.push(point);
	// Retain one sample before the cutoff for interpolation at the tail.
	while (history.length > 2 && history[1].timeMs < point.timeMs - durationMs) history.shift();
}

export function sampleCursorTrail(history: TrailPosition[], durationMs: number, length: number): TrailPoint[] {
	const head = history[history.length - 1];
	if (!head) return [];
	const points: TrailPoint[] = [];
	let sampleIndex = 0;
	for (let index = length; index >= 1; index -= 1) {
		const progress = index / (length + 1);
		const time = head.timeMs - durationMs * progress;
		if (time < history[0].timeMs) continue;
		while (sampleIndex + 1 < history.length && history[sampleIndex + 1].timeMs < time) sampleIndex++;
		const start = history[sampleIndex];
		const end = history[Math.min(sampleIndex + 1, history.length - 1)];
		const blend = end.timeMs > start.timeMs ? (time - start.timeMs) / (end.timeMs - start.timeMs) : 0;
		points.push({ x: start.x + (end.x - start.x) * blend, y: start.y + (end.y - start.y) * blend, fade: 1 - progress });
	}
	points.push({ x: head.x, y: head.y, fade: 1 });
	return points;
}

export function buildCursorTrailEdges(points: TrailPoint[], halfWidth: number) {
	const distinct = points.filter((point, index) => index === 0 ||
		Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y) > 0.001);
	const left: Array<{ x: number; y: number }> = [];
	const right: Array<{ x: number; y: number }> = [];
	if (distinct.length < 2) return { left, right };
	const head = distinct[distinct.length - 1];
	const beforeHead = distinct[distinct.length - 2];
	const headingLength = Math.hypot(head.x - beforeHead.x, head.y - beforeHead.y);
	const headingX = (head.x - beforeHead.x) / headingLength;
	const headingY = (head.y - beforeHead.y) / headingLength;
	const capAtHead = (x: number, y: number) => {
		const ahead = Math.max(0, (x - head.x) * headingX + (y - head.y) * headingY);
		return { x: x - ahead * headingX, y: y - ahead * headingY };
	};
	for (let index = 0; index < distinct.length; index++) {
		const point = distinct[index];
		const previous = distinct[Math.max(0, index - 1)];
		const next = distinct[Math.min(distinct.length - 1, index + 1)];
		let dx = next.x - previous.x;
		let dy = next.y - previous.y;
		let distance = Math.hypot(dx, dy);
		if (distance < 0.001) {
			dx = point.x - previous.x;
			dy = point.y - previous.y;
			distance = Math.hypot(dx, dy);
		}
		if (distance < 0.001) continue;
		// End at the hotspot with a tapered tip. Every curve control point also
		// stays behind the head plane, so smoothing cannot extend past the cursor.
		const taper = Math.min(1, Math.hypot(point.x - head.x, point.y - head.y) / Math.max(1, halfWidth * 2));
		const width = halfWidth * point.fade * taper;
		const ox = -dy / distance * width;
		const oy = dx / distance * width;
		left.push(capAtHead(point.x + ox, point.y + oy));
		right.push(capAtHead(point.x - ox, point.y - oy));
	}
	return { left, right };
}
