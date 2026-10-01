import { lazy, Suspense, useEffect, useState } from "react";
import { useI18n } from "./contexts/I18nContext";

const HudWindow = lazy(() => import("./components/launch/HudWindow"));
const SourceSelector = lazy(() =>
	import("./components/launch/SourceSelector").then((module) => ({
		default: module.SourceSelector,
	})),
);
const CountdownOverlay = lazy(() =>
	import("./components/countdown/CountdownOverlay").then((module) => ({
		default: module.CountdownOverlay,
	})),
);
const UpdateToastWindow = lazy(() =>
	import("./components/launch/UpdateToastWindow").then((module) => ({
		default: module.UpdateToastWindow,
	})),
);
const EditorWindow = lazy(() => import("./components/video-editor/EditorWindow"));

export default function App() {
	const [windowType] = useState(
		() => new URLSearchParams(window.location.search).get("windowType") || "",
	);
	const { t } = useI18n();
	const appIconSrc = "/app-icons/recordio-128.png";

	useEffect(() => {
		document.documentElement.dataset.windowType = windowType;

		if (
			windowType === "hud-overlay" ||
			windowType === "source-selector" ||
			windowType === "countdown" ||
			windowType === "update-toast"
		) {
			document.body.style.background = "transparent";
			document.documentElement.style.background = "transparent";
			document.getElementById("root")?.style.setProperty("background", "transparent");
		}

		if (windowType === "hud-overlay") {
			document.documentElement.classList.add("hud-overlay-window");
			document.body.classList.add("hud-overlay-window");
			document.getElementById("root")?.classList.add("hud-overlay-window");
			window.electronAPI?.hudOverlaySetIgnoreMouse?.(true);
		} else if (windowType === "update-toast") {
			document.documentElement.style.overflow = "visible";
			document.body.style.overflow = "visible";
			document.getElementById("root")?.style.setProperty("overflow", "visible");
		}
	}, [windowType]);

	useEffect(() => {
		document.title =
			windowType === "editor"
				? t("app.editorTitle", "Recordio Editor")
				: t("app.name", "Recordio");
	}, [windowType, t]);

	useEffect(() => {
		const generated = new WeakSet<Element>();
		const selector = 'button, [role="button"], [role="menuitem"], [role="tab"]';
		const findControl = (target: EventTarget | null) =>
			target instanceof Element ? target.closest(selector) : null;
		const onMouseOver = (event: MouseEvent) => {
			const control = findControl(event.target);
			if (!control || control.hasAttribute("title")) return;
			const label =
				control.getAttribute("aria-label") ||
				(control instanceof HTMLElement ? control.innerText : control.textContent) ||
				"";
			const tooltip = label.replace(/\s+/g, " ").trim();
			if (!tooltip) return;
			control.setAttribute("title", tooltip);
			generated.add(control);
		};
		const onMouseOut = (event: MouseEvent) => {
			const control = findControl(event.target);
			if (!control || !generated.has(control)) return;
			if (event.relatedTarget instanceof Node && control.contains(event.relatedTarget)) return;
			control.removeAttribute("title");
			generated.delete(control);
		};
		document.addEventListener("mouseover", onMouseOver);
		document.addEventListener("mouseout", onMouseOut);
		return () => {
			document.removeEventListener("mouseover", onMouseOver);
			document.removeEventListener("mouseout", onMouseOut);
		};
	}, []);

	let content;
	switch (windowType) {
		case "hud-overlay":
			content = <HudWindow />;
			break;
		case "source-selector":
			content = <SourceSelector />;
			break;
		case "countdown":
			content = <CountdownOverlay />;
			break;
		case "update-toast":
			content = <UpdateToastWindow />;
			break;
		case "editor":
			content = <EditorWindow />;
			break;
		default:
			content = (
				<div className="flex h-full w-full items-center justify-center bg-editor-bg text-foreground">
					<div className="flex items-center gap-4 rounded-xl px-6 py-5">
						<img
							src={appIconSrc}
							alt={t("app.name", "Recordio")}
							className="h-12 w-12 rounded-xl"
						/>
						<div>
							<h1 className="text-xl font-semibold tracking-tight">
								{t("app.name", "Recordio")}
							</h1>
							<p className="text-sm text-foreground/65">
								{t("app.subtitle", "Screen recording and editing")}
							</p>
						</div>
					</div>
				</div>
			);
	}

	return <Suspense fallback={null}>{content}</Suspense>;
}
