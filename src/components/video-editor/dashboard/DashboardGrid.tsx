import { RecordNewButton } from "./RecordNewButton";
import { RawPreview } from "./RawRecordings";
import { Cloud, ImageSquare } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";

import { DashboardSettings } from "./DashboardSettings";

import { ProjectCard } from "./ProjectCard";
import { useScopedT } from "@/contexts/I18nContext";
import type { DashboardProps } from "./types";

import type { DashboardModel } from "./useDashboardModel";

export function DashboardGrid({
	onImportFile,
	isRaw,
	rawPreview,
	setRawPreview,
	rawLoading,
	rawError,
	refreshRaw,
	error,
	section,
	accountLabel,
	onSignIn,
	onShareProject,
	visible,
	busy,
	selecting,
	toggleSelected,
	onRenameProject,
	folders,
	save,
	assignFolder,
	selected,
	openEntry,
	query,
	hasActiveFilters,
	setQuery,
	run,
	requestDeleteWithVideo,
}: Pick<
	DashboardProps & DashboardModel,
	| "onImportFile"
	| "isRaw"
	| "rawPreview"
	| "setRawPreview"
	| "rawLoading"
	| "rawError"
	| "refreshRaw"
	| "error"
	| "section"
	| "accountLabel"
	| "onSignIn"
	| "onShareProject"
	| "visible"
	| "busy"
	| "selecting"
	| "toggleSelected"
	| "onRenameProject"
	| "folders"
	| "save"
	| "assignFolder"
	| "selected"
	| "openEntry"
	| "query"
	| "hasActiveFilters"
	| "setQuery"
	| "run"
	| "requestDeleteWithVideo"
>) {
	const t = useScopedT("editor");
	return (
		<>
			<main className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-7 pb-10 lg:px-10">
				{error && (
					<p role="alert" className="mb-4 text-sm text-danger">
						{error}
					</p>
				)}
				{section === "settings" ? (
					<DashboardSettings onImportFile={onImportFile} />
				) : section === "shared" ? (
					<div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
						<Cloud weight="fill" className="size-8 opacity-40" />
						<p>
							{accountLabel
								? t("dashboard.grid.sharedSignedIn", "Shared videos are managed in your cloud library.")
								: t("dashboard.grid.sharedSignIn", "Sign in to manage shared videos.")}
						</p>
						<Button variant="secondary" onClick={onSignIn}>
							{accountLabel
								? t("dashboard.grid.account", "Account")
								: t("dashboard.nav.signIn", "Sign in")}
						</Button>
					</div>
				) : visible.length ? (
					<ul
						aria-label={t(isRaw ? "dashboard.grid.rawList" : "dashboard.grid.projectList", isRaw ? "Raw files" : "Your projects")}
						className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-x-7 gap-y-10 lg:gap-x-9"
					>
						{visible.map((entry) => (
							<ProjectCard
								key={entry.path}
								{...{
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
								}}
							/>
						))}
					</ul>
				) : (
					<div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
						<div className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
							<ImageSquare weight="regular" className="size-7" />
						</div>
						<p>
							{isRaw
								? rawLoading
									? t("dashboard.grid.loadingRaw", "Loading recordings…")
									: rawError ||
										(hasActiveFilters
										? t("dashboard.grid.noMatchingRaw", "No matching raw files")
										: t("dashboard.grid.noRaw", "No raw recordings yet"))
								: hasActiveFilters
									? t("dashboard.grid.noMatchingProjects", "No matching projects")
									: t("dashboard.grid.empty", "It's looking empty in here...")}
						</p>
						{!isRaw && !hasActiveFilters && (
							<RecordNewButton busy={busy} run={run} first className="mt-2" />
						)}
						{isRaw && rawError && (
						<Button onClick={() => void refreshRaw()}>
							{t("dashboard.grid.retry", "Retry")}
						</Button>
						)}
						{query && (
							<Button variant="ghost" size="sm" onClick={() => setQuery("")}>
								Clear search
							</Button>
						)}
					</div>
				)}
				<RawPreview entry={rawPreview} onClose={() => setRawPreview(null)} />
			</main>
		</>
	);
}
