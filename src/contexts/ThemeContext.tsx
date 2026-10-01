import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { loadAppSetting, saveAppSetting } from "../lib/appSettings";

export type ThemePreference =
	| "light"
	| "dark"
	| "system"
	| "spruce"
	| "cream"
	| "aurora"
	| "vermilion";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
	/** The user's preference: light, dark, or system */
	preference: ThemePreference;
	/** The resolved theme applied to the DOM */
	theme: ResolvedTheme;
	setPreference: (pref: ThemePreference) => void;
	toggleTheme: () => void;
}

const THEME_STORAGE_KEY = "recordly.theme";
const THEME_PREFERENCES: readonly ThemePreference[] = [
	"light", "dark", "system", "spruce", "cream", "aurora", "vermilion",
];

function isThemePreference(value: unknown): value is ThemePreference {
	return THEME_PREFERENCES.some((preference) => preference === value);
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function loadThemePreference(): ThemePreference {
	const persisted = loadAppSetting<unknown>(THEME_STORAGE_KEY);
	if (isThemePreference(persisted)) {
		return persisted;
	}

	try {
		const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
		if (isThemePreference(stored)) {
			return stored;
		}
	} catch {
		// Ignore storage errors
	}
	return "vermilion";
}

export function persistThemePreference(pref: ThemePreference): void {
	saveAppSetting(THEME_STORAGE_KEY, pref);

	try {
		globalThis.localStorage?.setItem(THEME_STORAGE_KEY, pref);
	} catch {
		// Ignore storage errors
	}
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
	if (pref === "system") {
		return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	}
	return pref === "dark" || pref === "aurora" ? "dark" : "light";
}

function applyThemeToDOM(preference: ThemePreference, theme: ResolvedTheme) {
	const root = document.documentElement;
	root.dataset.theme = preference === "system" ? theme : preference;
	if (theme === "dark") {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [preference, setPreferenceState] = useState<ThemePreference>(() => {
		const stored = loadThemePreference();
		applyThemeToDOM(stored, resolveTheme(stored));
		return stored;
	});

	const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(preference));

	const setPreference = useCallback((pref: ThemePreference) => {
		setPreferenceState(pref);
		const r = resolveTheme(pref);
		setResolved(r);
		applyThemeToDOM(pref, r);
		persistThemePreference(pref);
	}, []);

	const toggleTheme = useCallback(() => {
		setPreference(resolved === "dark" ? "light" : "dark");
	}, [resolved, setPreference]);

	// Listen for system theme changes when preference is "system"
	useEffect(() => {
		if (preference !== "system") return;
		const mq = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
		if (!mq) return;
		const handler = () => {
			const r = resolveTheme("system");
			setResolved(r);
			applyThemeToDOM("system", r);
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [preference]);

	useEffect(() => {
		applyThemeToDOM(preference, resolved);
	}, [preference, resolved]);

	return (
		<ThemeContext.Provider value={{ preference, theme: resolved, setPreference, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
