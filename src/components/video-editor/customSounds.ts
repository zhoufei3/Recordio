export type CustomSoundKind = "click" | "zoom";

export type CustomSound = {
	id: string;
	label: string;
	url: string;
	durationMs: number;
};

const STORAGE_KEY = "recordly.editor.custom-sounds";

export function getCustomSounds(kind?: CustomSoundKind): CustomSound[] {
	try {
		const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
		const sounds = kind ? value[kind] : [...(value.click ?? []), ...(value.zoom ?? [])];
		return Array.isArray(sounds)
			? sounds.filter(
					(sound): sound is CustomSound =>
						sound &&
						typeof sound.id === "string" &&
						typeof sound.label === "string" &&
						typeof sound.url === "string" &&
						Number.isFinite(sound.durationMs) &&
						sound.durationMs > 0,
					)
			: [];
	} catch {
		return [];
	}
}

export function saveCustomSound(kind: CustomSoundKind, sound: CustomSound): CustomSound[] {
	const current = getCustomSounds();
	const next = [...current.filter((item) => item.id !== sound.id), sound];
	const click = kind === "click" ? [...getCustomSounds("click"), sound] : getCustomSounds("click");
	const zoom = kind === "zoom" ? [...getCustomSounds("zoom"), sound] : getCustomSounds("zoom");
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ click, zoom }));
	return next;
}

export function removeCustomSound(kind: CustomSoundKind, id: string): void {
	const click = getCustomSounds("click").filter((sound) => kind !== "click" || sound.id !== id);
	const zoom = getCustomSounds("zoom").filter((sound) => kind !== "zoom" || sound.id !== id);
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ click, zoom }));
}
