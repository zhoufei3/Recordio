import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { useScopedT } from "@/contexts/I18nContext";
import styles from "../LaunchWindow.module.css";
import type { RecordingMode } from "../recordingMode";
import { useLaunchPopoverCoordinator } from "./LaunchPopoverCoordinator";
import { HudPopover } from "./PopoverScaffold";

const POPOVER_ID = "recording-mode";

export function RecordingModePopover({
	mode,
	trigger,
	onConfirm,
}: {
	mode: RecordingMode;
	trigger: ReactElement;
	onConfirm: (mode: RecordingMode) => void;
}) {
	const t = useScopedT("launch");
	const { isOpen, requestOpen, requestClose } = useLaunchPopoverCoordinator();
	const open = isOpen(POPOVER_ID);
	const nextMode = mode === "editor" ? "standard" : "editor";
	const modeName = (value: RecordingMode) =>
		t(value === "editor" ? "recording.modeEditorAction" : "recording.modeStandardAction");

	return (
		<HudPopover
			open={open}
			onOpenChange={(nextOpen) => {
				if (nextOpen) requestOpen(POPOVER_ID);
				else requestClose(POPOVER_ID);
			}}
			trigger={trigger}
			align="center"
		>
			<div className={styles.recordingModeTitle}>
				{t(mode === "editor" ? "recording.modeEditorTitle" : "recording.modeStandardTitle")}
			</div>
			<p className="px-3 pb-3 text-xs leading-5 text-[var(--launch-text-muted)]">
				{t(
					mode === "standard"
						? "recording.standardModeDescription"
						: "recording.editorModeDescription",
				)}
			</p>
			<div className="flex flex-wrap justify-end gap-2 px-2 pb-2">
				<Button variant="ghost" size="sm" onClick={() => requestClose(POPOVER_ID)}>
					{t("recording.cancelModeChange")}
				</Button>
				<Button
					variant="default"
					size="sm"
					onClick={() => {
						onConfirm(nextMode);
						requestClose(POPOVER_ID);
					}}
				>
					{t("recording.confirmModeChange", undefined, { mode: modeName(nextMode) })}
				</Button>
			</div>
		</HudPopover>
	);
}
