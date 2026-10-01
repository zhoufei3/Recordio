import { MagnifyingGlass, UploadSimple } from "@/components/ui/icons";
import { type CSSProperties } from "react";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { useScopedT } from "@/contexts/I18nContext";

import type { DashboardProps } from "./types";

import type { DashboardModel } from "./useDashboardModel";

export function DashboardToolbar({
	onImportFile,
	isRaw,
	query,
	setQuery,
	run,
	busy,
}: Pick<
	DashboardProps & DashboardModel,
	"onImportFile" | "query" | "setQuery" | "run" | "busy" | "isRaw"
	>) {
	const t = useScopedT("editor");
	return (
		<>
			<header
				className="flex h-24 shrink-0 items-center gap-4 px-7 pt-4 lg:px-10"
				style={{ WebkitAppRegion: "drag" } as CSSProperties}
			>
				<h1 className="hidden shrink-0 text-xl font-semibold tracking-tight text-foreground sm:block">
					{t(isRaw ? "dashboard.grid.rawList" : "dashboard.grid.projectList", isRaw ? "Raw files" : "Your projects")}
				</h1>
				<div
					className="relative ml-auto min-w-0 flex-1 sm:max-w-md"
					style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
				>
					<MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground/60" />
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						aria-label={t(
							isRaw ? "dashboard.toolbar.searchRaw" : "dashboard.toolbar.searchProjects",
							isRaw ? "Search raw files" : "Search projects",
						)}
						placeholder={t(
							isRaw ? "dashboard.toolbar.searchRaw" : "dashboard.toolbar.searchProjects",
							isRaw ? "Search raw files…" : "Search projects…",
						)}
						className="h-10 w-full border border-separator bg-surface pl-10 shadow-none transition-colors focus-within:border-accent"
					/>
				</div>
				<div style={{ WebkitAppRegion: "no-drag" } as CSSProperties}>
					<Button
						variant="secondary"
						disabled={busy}
						onClick={() => void run(onImportFile)}
						className="h-10 shrink-0 gap-2 text-[13px]"
					>
						<UploadSimple className="size-4" />
						{t("dashboard.toolbar.import", "Import")}
					</Button>
				</div>
			</header>
		</>
	);
}
