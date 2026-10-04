import type { TimelineRenderItem } from "./timelineTypes";

/** Inclusive range in timeline order, within the endpoints' item type. */
export function getTimelineRangeSelection(
	items: TimelineRenderItem[],
	anchorId: string,
	targetId: string,
): string[] {
	const anchor = items.find((item) => item.id === anchorId);
	const target = items.find((item) => item.id === targetId);
	if (!anchor || !target || anchor.variant !== target.variant) return [];
	const ordered = items.filter((item) => item.variant === target.variant).sort((a, b) =>
		a.span.start - b.span.start || a.span.end - b.span.end || a.rowId.localeCompare(b.rowId) || a.id.localeCompare(b.id),
	);
	const first = ordered.findIndex((item) => item.id === anchorId);
	const last = ordered.findIndex((item) => item.id === targetId);
	return ordered.slice(Math.min(first, last), Math.max(first, last) + 1).map((item) => item.id);
}
