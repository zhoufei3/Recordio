import { SettingsSections, SettingsCategory } from "../SettingsSections";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SettingsRow } from "../SettingsRow";
import { Switch } from "@/components/ui/switch";
import { supportsHudCaptureProtection } from "@/lib/hudCaptureProtection";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useScopedT } from "@/contexts/I18nContext";
export const DashboardSettingsContext = createContext<ReactNode>(null);
export function DashboardSettings({ onImportFile }: { onImportFile: () => Promise<void> }) {
	const t = useScopedT("settings");
	const settingsContent = useContext(DashboardSettingsContext);
	const [directory, setDirectory] = useState("");
	const [recordings, setRecordings] = useState("");
	const [hideHud, setHideHud] = useState(true);
	const [captureSupported, setCaptureSupported] = useState(false);
	const [busy, setBusy] = useState(false);
	const run = async (action: () => Promise<void>) => {
		setBusy(true);
		try {
			await action();
		} catch (error) {
			toast.error(String(error));
		} finally {
			setBusy(false);
		}
	};
	useEffect(() => {
		let active = true;
		void Promise.all([
			window.electronAPI.getRecordingsDirectory(),
			window.electronAPI.getHudOverlayCaptureProtection(),
			window.electronAPI.getPlatform(),
		])
			.then(([directory, protection, platform]) => {
				if (!active) return;
				if (directory.success) setRecordings(directory.path);
				if (protection.success) setHideHud(protection.enabled);
				setCaptureSupported(supportsHudCaptureProtection(platform));
			})
			.catch((error) => toast.error(String(error)));
		return () => {
			active = false;
		};
	}, []);
	return (
		<section aria-label={t("dashboard.title", "Settings")} className="dashboard-settings max-w-2xl py-10">
			<h1 className="mb-8 text-lg font-semibold">{t("dashboard.title", "Settings")}</h1>
			<SettingsSections categories={["general", "motion", "recording", "files", "advanced", "about"]}>
				<SettingsCategory category={["general", "motion", "advanced"]}>
					{settingsContent}
				</SettingsCategory>
				<SettingsCategory category="files">
					<SettingsRow title={t("dashboard.openVideoOrProject", "Open video or project")}>
						<Button
							variant="secondary"
							size="sm"
							disabled={busy}
							onClick={() => void run(onImportFile)}
						>
							{t("dashboard.openFile", "Open file")}
						</Button>
					</SettingsRow>
				</SettingsCategory>
				<SettingsCategory category="recording">
					<SettingsRow
						title={t("dashboard.recordingsFolder", "Recordings folder")}
						description={
							<span className="block truncate" title={recordings}>
								{recordings}
							</span>
						}
					>
						<Button
							variant="secondary"
							size="sm"
							disabled={busy}
							onClick={() =>
								void run(async () => {
									const result =
										await window.electronAPI.chooseRecordingsDirectory();
									if (result.canceled) return;
									if (!result.success || !result.path)
										throw Error(t("dashboard.changeRecordingsFolderFailed", "Could not change recordings folder"));
									setRecordings(result.path);
								})
							}
						>
							{t("dashboard.changeFolder", "Change folder")}
						</Button>
					</SettingsRow>
					{captureSupported && (
						<SettingsRow
							title={t("dashboard.hideHud", "Hide HUD from recordings")}
							description={t("dashboard.hideHudDescription", "Only while recording. The idle HUD stays visible in captures.")}
						>
							<Switch
								aria-label={t("dashboard.hideHud", "Hide HUD from recordings")}
								checked={hideHud}
								disabled={busy}
								onCheckedChange={(enabled) =>
									void run(async () => {
										const result =
											await window.electronAPI.setHudOverlayCaptureProtection(
												enabled,
											);
										if (!result.success)
											throw Error(t("dashboard.updateCaptureProtectionFailed", "Could not update capture protection"));
										setHideHud(result.enabled);
									})
								}
							/>
						</SettingsRow>
					)}
				</SettingsCategory>
				<SettingsCategory category="advanced">
					{import.meta.env.DEV && (
						<SettingsRow title={t("dashboard.previewUpdateUi", "Preview update UI")}>
							<Button
								variant="secondary"
								size="sm"
								disabled={busy}
								onClick={() =>
									void run(async () => {
										await window.electronAPI.previewUpdateToast();
									})
								}
							>
								{t("dashboard.preview", "Preview")}
							</Button>
						</SettingsRow>
					)}
				</SettingsCategory>
				<SettingsCategory category="files">
					<SettingsRow
						title={t("dashboard.projectsFolder", "Projects folder")}
						description={directory || t("dashboard.projectsSaveAutomatically", "Named projects save automatically.")}
					>
						<Button
							variant="secondary"
							size="sm"
							onClick={async () => {
								try {
									const result = await window.electronAPI.getProjectsDirectory();
									if (!result.success || !result.path)
										throw Error(t("dashboard.openProjectsFolderFailed", "Could not open projects folder"));
									setDirectory(result.path);
									await window.electronAPI.revealInFolder(result.path);
								} catch (e) {
									toast.error(String(e));
								}
							}}
						>
							{t("dashboard.showFolder", "Show folder")}
						</Button>
					</SettingsRow>
					<p className="text-xs text-muted-foreground">
						{t("dashboard.projectsRefreshHint", "Named projects save automatically. Previews refresh when you return to Projects.")}
					</p>
				</SettingsCategory>
				<SettingsCategory category="about">
					<div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-sm leading-7">
						<h2 className="text-base font-semibold">{t("about.title", "About Recordio")}</h2>
						<p>{t("about.attribution", "Recordio is an independently modified version of the open-source screen recorder and editor Recordly by webadderall. It is not an official Recordly release.")}</p>
						<p>{t("about.license", "The original project is licensed under GNU AGPLv3. Copyright © 2026 webadderall. This version retains the applicable copyright and license notices.")}</p>
						<p>
							{t("about.repository", "Original repository")}{": "}
							<a className="text-primary underline underline-offset-4" href="https://github.com/webadderallorg/Recordly" onClick={(event) => { event.preventDefault(); void window.electronAPI.openExternalUrl(event.currentTarget.href); }}>
								https://github.com/webadderallorg/Recordly
							</a>
						</p>
						<p>
							{t("about.licenseLink", "Original license")}{": "}
							<a className="text-primary underline underline-offset-4" href="https://github.com/webadderallorg/Recordly/blob/main/LICENSE.md" onClick={(event) => { event.preventDefault(); void window.electronAPI.openExternalUrl(event.currentTarget.href); }}>
								GNU AGPLv3
							</a>
						</p>
					</div>
				</SettingsCategory>
			</SettingsSections>
		</section>
	);
}
