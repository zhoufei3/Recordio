export interface DesktopSource {
	id: string;
	name: string;
	thumbnail: string | null;
	display_id: string;
	appIcon: string | null;
	sourceType?: "screen" | "window";
	appName?: string;
	windowTitle?: string;
}

/**
 * Check if a source is a screen/display
 */
export function isScreenSource(s: DesktopSource): boolean {
	return s.sourceType === "screen" || s.id.startsWith("screen:");
}

/**
 * Check if a source is an application window
 */
export function isWindowSource(s: DesktopSource): boolean {
	return s.sourceType === "window" || s.id.startsWith("window:");
}

export function mapRawSource(s: DesktopSource): DesktopSource {
	const isWindow = isWindowSource(s);
	const type = s.sourceType ?? (isWindow ? "window" : "screen");
	let displayName = s.name;
	let appName = s.appName;
	if (isWindow && s.windowTitle) {
		displayName = s.windowTitle;
	} else if (isWindow && !appName && s.name.includes(" — ")) {
		const parts = s.name.split(" — ");
		appName = parts[0]?.trim();
		displayName = parts.slice(1).join(" — ").trim() || s.name;
	}
	return {
		id: s.id,
		name: displayName,
		thumbnail: s.thumbnail,
		display_id: s.display_id,
		appIcon: s.appIcon,
		sourceType: type,
		appName,
		windowTitle: s.windowTitle ?? displayName,
	};
}

export function retainSourceThumbnails(
	sources: DesktopSource[],
	previous: DesktopSource[],
): DesktopSource[] {
	const thumbnails = new Map(previous.map((source) => [source.id, source.thumbnail]));
	return sources.map((source) => ({
		...source,
		thumbnail: source.thumbnail ?? thumbnails.get(source.id) ?? null,
	}));
}

export async function fetchDesktopSourcesProgressively(
	onSources: (sources: DesktopSource[], preliminary: boolean) => void,
): Promise<void> {
	let listed = false;
	try {
		const rawSources = await window.electronAPI.getSources({
			types: ["screen", "window"],
			thumbnailSize: { width: 0, height: 0 },
			fetchWindowIcons: false,
		});
		onSources(rawSources.map((source) => mapRawSource(source as DesktopSource)), true);
		listed = true;
	} catch (error) {
		console.warn("Failed to list capture sources without previews:", error);
	}

	try {
		const rawSources = await window.electronAPI.getSources({
			types: ["screen", "window"],
			thumbnailSize: { width: 96, height: 64 },
			fetchWindowIcons: false,
		});
		onSources(rawSources.map((source) => mapRawSource(source as DesktopSource)), false);
	} catch (error) {
		if (!listed) throw error;
		console.warn("Failed to update capture source previews:", error);
	}
}

export interface DeviceOption {
	deviceId: string;
	label: string;
}
