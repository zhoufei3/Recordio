import { removeProjectShareLinks } from "../cloud/projectShareLinks";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";

import type { DashboardProps } from "./types";

import type { DashboardModel } from "./useDashboardModel";

export function DashboardDialogs({
	isRaw,
	folders,
	busy,
	confirmDelete,
	setConfirmDelete,
	selected,
	run,
	onDeleteProjects,
	save,
	setSelected,
	setSelecting,
	deleteWithVideoTarget,
	setDeleteWithVideoTarget,
	onDeleteProjectWithVideo,
}: Pick<
	DashboardProps & DashboardModel,
	| "isRaw"
	| "folders"
	| "busy"
	| "confirmDelete"
	| "setConfirmDelete"
	| "selected"
	| "run"
	| "onDeleteProjects"
	| "save"
	| "setSelected"
	| "setSelecting"
	| "deleteWithVideoTarget"
	| "setDeleteWithVideoTarget"
	| "onDeleteProjectWithVideo"
>) {
	const t = useScopedT("editor");
	return (
		<>
			<Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>
							{isRaw
								? t("dashboard.dialog.removeRawTitle", "Remove {{count}} raw file(s)?", {
										count: selected.length,
									})
								: selected.length === 1
									? t("dashboard.dialog.deleteProjectOne", "Delete this project?")
									: t("dashboard.dialog.deleteProjectMany", "Delete {{count}} projects?", {
											count: selected.length,
										})}
						</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						{isRaw
						? t("dashboard.dialog.removeDescription", "Remove these files from the library. Original files stay on disk so existing projects keep working.")
						: t("dashboard.dialog.deleteDescription", "Project files move to Trash. Source recordings are kept.")}
					</p>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setConfirmDelete(false)}>
							{t("dashboard.filters.cancel", "Cancel")}
						</Button>
						<Button
							variant="destructive"
							disabled={busy}
							onClick={() =>
								void run(async () => {
									const deleted = await onDeleteProjects(selected);
									removeProjectShareLinks(deleted);
									save(
										folders.map((f) => ({
											...f,
											paths: f.paths.filter((p) => !deleted.includes(p)),
										})),
									);
									setSelected(selected.filter((p) => !deleted.includes(p)));
									setConfirmDelete(false);
									if (deleted.length === selected.length) setSelecting(false);
								})
							}
						>
							{t(isRaw ? "dashboard.dialog.removeFromLibrary" : "dashboard.dialog.moveToTrash", isRaw ? "Remove from library" : "Move to Trash")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog
				open={Boolean(deleteWithVideoTarget)}
				onOpenChange={(open) => {
					if (!open) setDeleteWithVideoTarget(null);
				}}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{t("dashboard.dialog.deleteWithVideoTitle", "Delete the project and video?")}
						</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						{t("dashboard.dialog.deleteWithVideoDescription", "The project file and its source video will move to Trash. Other projects that use this video will prevent deletion.")}
					</p>
					{deleteWithVideoTarget && (
						<div className="rounded-lg bg-default p-3 text-xs">
							<p className="font-semibold">{deleteWithVideoTarget.name}</p>
							<p className="mt-1 break-all text-muted-foreground">{deleteWithVideoTarget.videoPath}</p>
						</div>
					)}
					<DialogFooter>
						<Button variant="ghost" onClick={() => setDeleteWithVideoTarget(null)}>
							{t("dashboard.filters.cancel", "Cancel")}
						</Button>
						<Button
							variant="destructive"
							disabled={busy || !deleteWithVideoTarget}
							onClick={() => {
								if (!deleteWithVideoTarget) return;
								const { path, videoPath } = deleteWithVideoTarget;
								setDeleteWithVideoTarget(null);
								void run(async () => {
									await onDeleteProjectWithVideo(path, videoPath);
									removeProjectShareLinks([path]);
									save(folders.map((folder) => ({
										...folder,
										paths: folder.paths.filter((item) => item !== path),
									})));
									setSelected(selected.filter((item) => item !== path));
								});
							}}
						>
							{t("dashboard.dialog.deleteWithVideoConfirm", "Delete project and video")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
