import { ProjectFolderChips } from "./ProjectFolderChips";
import { RawThumbnail } from "./RawRecordings";
import { AccountAvatar } from "@/components/ui/account-avatar";
import { Dropdown } from "@heroui/react";
import { Check, DotsThree, FolderSimple, Plus } from "@/components/ui/icons";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useScopedT } from "@/contexts/I18nContext";
import { getProjectShareLink, moveProjectShareLink } from "../cloud/projectShareLinks";
import type { ProjectLibraryEntry } from "../ProjectBrowserDialog";
import { ProjectThumbnail } from "./ProjectThumbnail";
import type { DashboardProps } from "./types";
import type { DashboardModel } from "./useDashboardModel";

type Props = Pick<
	DashboardProps & DashboardModel,
	| "accountLabel"
	| "busy"
	| "selecting"
	| "selected"
	| "toggleSelected"
	| "openEntry"
	| "run"
	| "onShareProject"
	| "onRenameProject"
	| "folders"
	| "save"
	| "assignFolder"
	| "requestDeleteWithVideo"
> & { entry: ProjectLibraryEntry };
export function ProjectCard({
	accountLabel,
	entry,
	busy,
	selecting,
	selected,
	toggleSelected,
	openEntry,
	run,
	onShareProject,
	onRenameProject,
	folders,
	save,
	assignFolder,
	requestDeleteWithVideo,
}: Props) {
	const t = useScopedT("editor");
	const [hovering, setHovering] = useState(false);
	const [editing, setEditing] = useState(false);
	const renaming = useRef(false);
	const [name, setName] = useState(entry.name);
	const assignedFolders = folders.filter((folder) => folder.paths.includes(entry.path));
	const folder = assignedFolders[0];
	const shareUrl = getProjectShareLink(entry.path);
	const rename = () => {
		if (renaming.current) return;
		renaming.current = true;
		void run(async () => {
			if (!name.trim() || name.trim() === entry.name) {
				setEditing(false);
				return;
			}
			const target = await onRenameProject(entry.path, name.trim());
			save(
				folders.map((folder) => ({
					...folder,
					paths: folder.paths.map((path) => (path === entry.path ? target : path)),
				})),
			);
			moveProjectShareLink(entry.path, target);
			setEditing(false);
		}).finally(() => {
			renaming.current = false;
		});
	};
	return (
		<li className="group min-w-0 rounded-2xl p-2 transition-colors hover:bg-default/35 focus-within:bg-default/35">
			<Button
				variant="ghost"
				disabled={busy}
				aria-label={entry.name}
				onPointerEnter={(event) => {
					if (event.pointerType === "mouse") setHovering(true);
				}}
				onPointerLeave={() => setHovering(false)}
				onFocus={() => setHovering(true)}
				onBlur={() => setHovering(false)}
				onClick={() => (selecting ? toggleSelected(entry.path) : openEntry(entry))}
				aria-pressed={selecting ? selected.includes(entry.path) : undefined}
				className="relative block h-auto w-full min-w-0 overflow-hidden rounded-xl p-0 transition-shadow hover:shadow-md focus-visible:shadow-md"
			>
				{entry.rawSource ? (
					<RawThumbnail
						entry={entry.rawSource}
						active={hovering && !selecting && !busy}
					/>
				) : (
					<ProjectThumbnail
						key={`${entry.thumbnailPath}-${entry.updatedAt}`}
						revision={entry.updatedAt}
						path={entry.thumbnailPath}
						projectPath={entry.path}
						previewActive={hovering && !selecting && !busy}
					/>
				)}
				{selecting && (
					<span
						className={`absolute right-2 top-2 flex size-5 items-center justify-center rounded-md ${selected.includes(entry.path) ? "bg-accent text-white" : "bg-background/90"}`}
					>
						{selected.includes(entry.path) && <Check className="size-3.5" />}
					</span>
				)}
			</Button>
			<div className="relative flex items-start justify-between gap-3 px-1 pt-3">
				<AccountAvatar label={accountLabel} className="!size-9" />
				<div data-project-caption className="h-12 min-w-0 flex-1">
					{editing ? (
						<form
							onSubmit={(event) => {
								event.preventDefault();
								rename();
							}}
						>
							<input
								autoFocus
								aria-label={t(entry.rawSource ? "dashboard.project.rawName" : "dashboard.project.name", entry.rawSource ? "Raw file name" : "Project name")}
								className="inline-project-name h-5 w-full pr-8 text-[12px] font-medium"
								value={name}
								disabled={busy}
								maxLength={120}
								onChange={(event) => setName(event.target.value)}
								onBlur={rename}
								onKeyDown={(event) => {
									if (event.key === "Escape") {
										event.preventDefault();
										setEditing(false);
									}
								}}
							/>
						</form>
					) : (
						<p
							title={entry.name}
							className="truncate pr-8 text-[13px] font-semibold leading-5"
						>
							{entry.name}
						</p>
					)}
					<div className="mt-1 flex h-6 min-w-0 items-center gap-2">
						<p className="shrink-0 text-[11px] text-muted-foreground">
							{new Date(entry.updatedAt).toLocaleDateString(undefined, {
								month: "short",
								day: "numeric",
							})}
						</p>
						<ProjectFolderChips
							folders={assignedFolders}
							name={entry.name}
							onRemove={(id) => assignFolder(entry.path, id)}
						/>
						<Dropdown>
							<Button
								variant="ghost"
								size="sm"
								aria-label={`${t("dashboard.project.addFolder", "Add folder")} to ${entry.name}`}
								className="h-6 min-w-0 shrink-0 gap-1.5 rounded-full px-2.5 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
							>
								<Plus className="size-3" />
							{t("dashboard.project.addFolder", "Add folder")}
							</Button>
							<Dropdown.Popover>
								<Dropdown.Menu aria-label={t("dashboard.project.assignFolder", "Assign project folder")}>
									{folders.map((item) => (
										<Dropdown.Item
											key={item.id}
											id={item.id}
											textValue={item.name}
											onAction={() => assignFolder(entry.path, item.id)}
										>
											<FolderSimple
												weight="fill"
												style={{ color: item.color }}
											/>
											{item.name}
											{item.paths.includes(entry.path) && (
												<Check className="size-3" />
											)}
										</Dropdown.Item>
									))}
									{folder && (
										<Dropdown.Item
											id="remove"
											onAction={() => assignFolder(entry.path, "none")}
										>
											{t("dashboard.project.removeAllFolders", "Remove from all folders")}
										</Dropdown.Item>
									)}
									{!folders.length && (
										<Dropdown.Item id="empty" isDisabled>
											{t("dashboard.project.createFolder", "Create a folder in the sidebar")}
										</Dropdown.Item>
									)}
								</Dropdown.Menu>
							</Dropdown.Popover>
						</Dropdown>
					</div>
				</div>
				<Dropdown>
					<Button
						variant="ghost"
						size="icon"
						aria-label={`${t("dashboard.project.options", "Project options")}: ${entry.name}`}
						className="absolute right-0 top-5 size-6 min-w-6 text-muted-foreground"
					>
						<DotsThree weight="bold" className="size-5" />
					</Button>
					<Dropdown.Popover>
						<Dropdown.Menu aria-label={t("dashboard.project.options", "Project options")}>
							<Dropdown.Item id="open" onAction={() => openEntry(entry)}>
								{t(entry.rawSource ? "dashboard.project.preview" : "dashboard.project.open", entry.rawSource ? "Preview file" : "Open project")}
							</Dropdown.Item>
							<Dropdown.Item
								id="rename"
								onAction={() => {
									setName(entry.name);
									setEditing(true);
								}}
							>
								{t("dashboard.folders.rename", "Rename")}
							</Dropdown.Item>
							{!entry.rawSource && (
								<Dropdown.Item
									id="share"
									onAction={() =>
										void run(async () => {
											if (shareUrl)
												await window.electronAPI.openExternalUrl(shareUrl);
											else await onShareProject(entry.path);
										})
									}
								>
									{t(shareUrl ? "dashboard.project.viewWeb" : "dashboard.project.share", shareUrl ? "View in web" : "Share")}
								</Dropdown.Item>
							)}
							<Dropdown.Item
								aria-label={
								entry.rawSource ? `${t("dashboard.project.showInFolder", "Show in folder")}: ${entry.name}` : undefined
								}
								id="reveal"
								onAction={() =>
									void run(async () => {
										await window.electronAPI.revealInFolder(entry.path);
									})
								}
							>
								{t("dashboard.project.showInFolder", "Show in folder")}
							</Dropdown.Item>
							{!entry.rawSource && (
								<Dropdown.Item
									id="delete-with-video"
									textValue={t("dashboard.project.delete", "Delete")}
									onAction={() => requestDeleteWithVideo(entry)}
								>
									{t("dashboard.project.delete", "Delete")}
								</Dropdown.Item>
							)}
						</Dropdown.Menu>
					</Dropdown.Popover>
				</Dropdown>
			</div>
		</li>
	);
}
