/** Original cursor drawings inspired by the supplied light, dark, ice and crystal packs. */
import fineOutlineSvg from "@/assets/cursors/reference/fine-outline.svg?raw";
import miniSolidSvg from "@/assets/cursors/reference/mini-solid.svg?raw";
import roundedOutlineSvg from "@/assets/cursors/reference/rounded-outline.svg?raw";
import slateFacetSvg from "@/assets/cursors/reference/slate-facet.svg?raw";

type CursorPackSource = {
	defaultUrl: string;
	pointerUrl: string;
	defaultAnchor: { x: number; y: number };
	pointerAnchor: { x: number; y: number };
};

function svgDataUrl(shape: string) {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100">${shape}</svg>`)}`;
}

function svgFileDataUrl(svg: string) {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const arrowPath = "M12 7 12 79 30 61 44 91 58 84 44 56 76 55Z";
const handPath = "M40 11c-5 0-9 4-9 9v38l-8-8c-5-5-12-5-16 0-4 4-4 10 0 15l21 24c4 5 10 8 17 8h18c10 0 19-6 22-15l8-21c2-6-1-12-7-14-4-1-8 0-11 3-2-5-8-8-13-6-3-5-10-7-15-4V20c0-5-3-9-7-9Z";

const themes = {
	"ice-outline": { fill: "#E8F8FF", stroke: "#194D76", width: 5 },
	"night-ink": { fill: "#151C2D", stroke: "#FFFFFF", width: 5 },
	"crystal-blue": { fill: "#F5FEFF", stroke: "#16A2C4", width: 5 },
	"lighttech": { fill: "#FFFFFF", stroke: "#273049", width: 4.5 },
} as const;

export const builtinCursorPackSources: Record<string, CursorPackSource> = {
	...Object.fromEntries(Object.entries(themes).map(([style, theme]) => [
		style,
		{
			defaultUrl: svgDataUrl(
				`<path d="${arrowPath}" fill="${theme.fill}" stroke="${theme.stroke}" stroke-width="${theme.width}" stroke-linejoin="round"/>`,
			),
			pointerUrl: svgDataUrl(
				`<path d="${handPath}" fill="${theme.fill}" stroke="${theme.stroke}" stroke-width="${theme.width}" stroke-linejoin="round"/>`,
			),
			defaultAnchor: { x: 0.12, y: 0.07 },
			pointerAnchor: { x: 0.4, y: 0.11 },
		},
	])),
	"rounded-outline": {
		defaultUrl: svgFileDataUrl(roundedOutlineSvg),
		pointerUrl: svgDataUrl(`<path d="${handPath}" fill="#fff" stroke="#171717" stroke-width="4.5" stroke-linejoin="round"/>`),
		defaultAnchor: { x: 5 / 29, y: 4 / 34 },
		pointerAnchor: { x: 0.4, y: 0.11 },
	},
	"slate-facet": {
		defaultUrl: svgFileDataUrl(slateFacetSvg),
		pointerUrl: svgDataUrl(`<path d="${handPath}" fill="#fff" stroke="#4d4d4d" stroke-width="5" stroke-linejoin="round"/>`),
		defaultAnchor: { x: 5 / 29, y: 5 / 35 },
		pointerAnchor: { x: 0.4, y: 0.11 },
	},
	"fine-outline": {
		defaultUrl: svgFileDataUrl(fineOutlineSvg),
		pointerUrl: svgDataUrl(`<path d="${handPath}" fill="#fff" stroke="#2b2b2b" stroke-width="3.4" stroke-linejoin="round"/>`),
		defaultAnchor: { x: 5.5 / 27, y: 5 / 33 },
		pointerAnchor: { x: 0.4, y: 0.11 },
	},
	"mini-solid": {
		defaultUrl: svgFileDataUrl(miniSolidSvg),
		pointerUrl: svgDataUrl(`<path d="${handPath}" fill="#0a0a0a" stroke="#f7f7f7" stroke-width="3.5" stroke-linejoin="round"/>`),
		defaultAnchor: { x: 4 / 20, y: 3 / 24 },
		pointerAnchor: { x: 0.4, y: 0.11 },
	},
};
