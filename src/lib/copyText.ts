/** Copy from Electron's renderer even when the async Clipboard API is unavailable. */
export async function copyText(text: string): Promise<void> {
	try {
		if (typeof window !== "undefined" && typeof window.electronAPI?.copyTextToClipboard === "function") {
			await window.electronAPI.copyTextToClipboard(text);
			return;
		}
		if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
		await navigator.clipboard.writeText(text);
		return;
	} catch {
		const input = document.createElement("textarea");
		input.value = text;
		input.style.position = "fixed";
		input.style.opacity = "0";
		document.body.appendChild(input);
		const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		try {
			input.focus();
			input.select();
			if (!document.execCommand("copy")) throw new Error("Could not copy text");
		} finally {
			input.remove();
			previous?.focus();
		}
	}
}
