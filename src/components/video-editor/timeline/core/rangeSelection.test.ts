import { expect, it } from "vitest";
import { getTimelineRangeSelection } from "./rangeSelection";
import type { TimelineRenderItem } from "./timelineTypes";

const item = (id: string, start: number, variant: TimelineRenderItem["variant"] = "clip", rowId = "clips"): TimelineRenderItem => ({
	id, rowId, span: { start, end: start + 100 }, variant, label: id,
});

it("selects the inclusive chronological range without changing the input order", () => {
	const items = [item("c", 200), item("a", 0), item("d", 300), item("b", 100)];
	expect(getTimelineRangeSelection(items, "a", "c")).toEqual(["a", "b", "c"]);
	expect(items.map((entry) => entry.id)).toEqual(["c", "a", "d", "b"]);
});

it("supports reverse ranges and clicking the anchor itself", () => {
	const items = [item("a", 0), item("b", 100), item("c", 200)];
	expect(getTimelineRangeSelection(items, "c", "a")).toEqual(["a", "b", "c"]);
	expect(getTimelineRangeSelection(items, "b", "b")).toEqual(["b"]);
});

it("keeps other item types out of the range", () => {
	const items = [item("a", 0, "zoom"), item("clip", 50), item("b", 100, "zoom"), item("c", 200, "zoom")];
	expect(getTimelineRangeSelection(items, "a", "c")).toEqual(["a", "b", "c"]);
	expect(getTimelineRangeSelection(items, "a", "clip")).toEqual([]);
});

it("selects audio across lanes in time order", () => {
	const items = [item("c", 200, "audio", "audio-0"), item("b", 100, "audio", "audio-1"), item("a", 0, "audio", "audio-0")];
	expect(getTimelineRangeSelection(items, "a", "c")).toEqual(["a", "b", "c"]);
});

it("rejects stale anchors or endpoints deleted by editing", () => {
	expect(getTimelineRangeSelection([item("a", 0)], "deleted", "a")).toEqual([]);
	expect(getTimelineRangeSelection([item("a", 0)], "a", "deleted")).toEqual([]);
});
