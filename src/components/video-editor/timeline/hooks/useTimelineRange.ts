import type { Range } from "dnd-timeline";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type RefObject,
	type SetStateAction,
} from "react";
import { createInitialRange, normalizeWheelDeltaToPixels } from "../core/time";

interface UseTimelineRangeParams {
	totalMs: number;
	timelineContainerRef: RefObject<HTMLDivElement | null>;
}

export interface TimelineWheelPanDeltaInput {
	deltaX: number;
	deltaY: number;
	deltaMode: number;
	shiftKey?: boolean;
	ctrlKey?: boolean;
	metaKey?: boolean;
	canScrollVertically?: boolean;
}

export function resolveTimelineWheelPanDeltaPx({
	deltaX,
	deltaY,
	deltaMode,
	shiftKey = false,
	ctrlKey = false,
	metaKey = false,
	canScrollVertically = true,
}: TimelineWheelPanDeltaInput) {
	if ((ctrlKey || metaKey) && !shiftKey) {
		return 0;
	}

	if (Math.abs(deltaX) > 0) {
		return normalizeWheelDeltaToPixels(deltaX, deltaMode);
	}

	if ((shiftKey || !canScrollVertically) && Math.abs(deltaY) > 0) {
		return normalizeWheelDeltaToPixels(deltaY, deltaMode);
	}

	return 0;
}

export function useTimelineRange({ totalMs, timelineContainerRef }: UseTimelineRangeParams) {
	// Store viewport fractions so edits that change duration preserve the selected zoom.
	const [relativeRange, setRelativeRange] = useState<Range>({ start: 0, end: 1 });
	const range = useMemo<Range>(
		() =>
			totalMs > 0
				? { start: relativeRange.start * totalMs, end: relativeRange.end * totalMs }
				: createInitialRange(totalMs),
		[relativeRange, totalMs],
	);
	const clampedRange = range;
	const zoomFrameRef = useRef<number | null>(null);
	const pendingZoomRef = useRef({ steps: 0, position: 0.5 });
	const setRange = useCallback(
		(update: SetStateAction<Range>) => {
			if (totalMs <= 0) return;
			setRelativeRange((previous) => {
				const current = { start: previous.start * totalMs, end: previous.end * totalMs };
				const next = typeof update === "function" ? update(current) : update;
				if (!Number.isFinite(next.start) || !Number.isFinite(next.end)) return previous;
				const span = Math.max(1 / 20, Math.min(1, (next.end - next.start) / totalMs));
				const start = Math.max(0, Math.min(next.start / totalMs, 1 - span));
				const end = start + span;
				if (Math.abs(start - previous.start) < 1e-12 && Math.abs(end - previous.end) < 1e-12) return previous;
				return { start, end };
			});
		},
		[totalMs],
	);

	useEffect(() => {
		if (totalMs <= 0) return;
		const zoom = 1 / (relativeRange.end - relativeRange.start);
		window.dispatchEvent(new CustomEvent("recordio:timeline-zoom", { detail: zoom }));
	}, [relativeRange, totalMs]);

	const panTimelineRange = useCallback(
		(deltaMs: number) => {
			if (!Number.isFinite(deltaMs) || deltaMs === 0 || totalMs <= 0) {
				return;
			}

			setRange((previous) => {
				const visibleSpan = Math.max(1, previous.end - previous.start);
				const maxStart = Math.max(0, totalMs - visibleSpan);
				const nextStart = Math.max(0, Math.min(previous.start + deltaMs, maxStart));
				return { start: nextStart, end: nextStart + visibleSpan };
			});
		},
		[setRange, totalMs],
	);

	const handleTimelineWheel = useCallback(
		(event: WheelEvent) => {
			// Keep the vertical track scrollbar under direct drag control only.
			event.preventDefault();
			if (totalMs <= 0) {
				return;
			}
			if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
				if (!Number.isFinite(event.deltaY) || event.deltaY === 0) return;
				const container = timelineContainerRef.current;
				const viewport = container?.querySelector<HTMLElement>("[data-timeline-viewport]");
				const rect = (viewport ?? container)?.getBoundingClientRect();
				const position = rect && rect.width > 0
					? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
					: 0.5;
				pendingZoomRef.current.steps -= normalizeWheelDeltaToPixels(event.deltaY, event.deltaMode) / 100;
				pendingZoomRef.current.position = position;
				if (zoomFrameRef.current === null) {
					zoomFrameRef.current = requestAnimationFrame(() => {
						zoomFrameRef.current = null;
						const { steps, position: anchorPosition } = pendingZoomRef.current;
						pendingZoomRef.current.steps = 0;
						setRange((previous) => {
							const previousSpan = previous.end - previous.start;
							if (previousSpan <= 0) return previous;
							const zoom = Math.max(1, Math.min(20, (totalMs / previousSpan) * Math.pow(1.12, steps)));
							const span = totalMs / zoom;
							const anchor = previous.start + previousSpan * anchorPosition;
							const start = Math.max(0, Math.min(anchor - span * anchorPosition, totalMs - span));
							return { start, end: start + span };
						});
					});
				}
				return;
			}

			const container = timelineContainerRef.current;
			const horizontalDeltaPx = resolveTimelineWheelPanDeltaPx({
				deltaX: event.deltaX,
				deltaY: event.deltaY,
				deltaMode: event.deltaMode,
				shiftKey: event.shiftKey,
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
				canScrollVertically: container
					? container.scrollHeight > container.clientHeight + 1
					: true,
			});

			if (horizontalDeltaPx === 0) {
				return;
			}

			const containerWidth = container?.clientWidth ?? 0;
			const visibleRangeMs = clampedRange.end - clampedRange.start;
			if (containerWidth <= 0 || visibleRangeMs <= 0) {
				return;
			}

			event.preventDefault();
			const deltaMs = (horizontalDeltaPx / containerWidth) * visibleRangeMs;
			panTimelineRange(deltaMs);
		},
		[
			clampedRange.end,
			clampedRange.start,
			panTimelineRange,
			setRange,
			timelineContainerRef,
			totalMs,
		],
	);

	useEffect(() => {
		const container = timelineContainerRef.current;
		if (!container) return;
		container.addEventListener("wheel", handleTimelineWheel, { passive: false });
		return () => container.removeEventListener("wheel", handleTimelineWheel);
	}, [handleTimelineWheel, timelineContainerRef]);

	useEffect(() => () => {
		if (zoomFrameRef.current !== null) cancelAnimationFrame(zoomFrameRef.current);
		zoomFrameRef.current = null;
		pendingZoomRef.current.steps = 0;
	}, [totalMs]);

	return {
		range,
		setRange,
		clampedRange,
		handleTimelineWheel,
	};
}
