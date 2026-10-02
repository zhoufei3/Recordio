import { Card } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/contexts/I18nContext";

export function CountdownOverlay() {
	const { t } = useI18n();
	const [countdown, setCountdown] = useState<number | null>(null);
	const [mode, setMode] = useState<"editor" | "standard" | null>(null);

	useEffect(() => {
		void window.electronAPI.getActiveCountdown().then((result) => {
			if (result.success && typeof result.seconds === "number") {
				setCountdown(result.seconds);
				setMode(result.mode ?? null);
			}
		});

		const cleanup = window.electronAPI.onCountdownTick((seconds, nextMode) => {
			setCountdown(seconds);
			setMode(nextMode ?? null);
		});

		return cleanup;
	}, []);

	const handleCancel = useCallback(() => {
		window.electronAPI.cancelCountdown();
	}, []);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === "Escape") {
				handleCancel();
			}
		},
		[handleCancel],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	if (countdown === null) {
		return null;
	}

	return (
		<div className="fixed inset-0 flex items-center justify-center" onClick={handleCancel}>
			<Card className="size-48 items-center justify-center gap-2" aria-live="assertive">
				<span
					className="text-[5.5rem] font-bold leading-none tabular-nums tracking-[-0.07em]"
					style={{ fontFamily: 'Bahnschrift, "DIN Alternate", "DM Sans", sans-serif' }}
				>
					{countdown}
				</span>
				{mode && (
					<span className="text-xl font-bold text-accent">
						{t(
							mode === "editor"
								? "launch.recording.modeEditor"
								: "launch.recording.modeStandard",
							mode === "editor" ? "Presentation recording" : "Standard recording",
						)}
					</span>
				)}
				<Button
					variant="ghost"
					size="sm"
					onClick={(event) => {
						event.stopPropagation();
						handleCancel();
					}}
				>
					{t("common.actions.cancel", "Cancel")}
				</Button>
			</Card>
		</div>
	);
}
