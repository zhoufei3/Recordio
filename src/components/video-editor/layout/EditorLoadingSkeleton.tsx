import { Card, Skeleton } from "@heroui/react";
import { useScopedT } from "@/contexts/I18nContext";

/** Keep the editor's proportions visible while project media is being opened. */
export function EditorLoadingSkeleton() {
	const t = useScopedT("editor");
	return (
		<div
			className="flex h-screen flex-col overflow-hidden bg-editor-bg"
			role="status"
			aria-label={t("playback.openingProject")}
			aria-busy="true"
		>
			<div className="absolute left-1/2 top-1/2 z-10 w-64 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background/90 px-5 py-4 text-center shadow-lg">
				<div className="text-sm font-medium">{t("playback.openingProject")}</div>
				<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full w-1/3 animate-pulse rounded-full bg-primary" /></div>
			</div>
			<div
				aria-hidden="true"
				className="flex h-14 shrink-0 items-center justify-between px-5"
			>
				<Skeleton className="h-7 w-24 rounded-lg" />
				<Skeleton className="h-4 w-36" />
				<Skeleton className="h-8 w-24 rounded-full" />
			</div>
			<div aria-hidden="true" className="flex min-h-0 flex-1 pt-3">
				<div className="flex w-16 shrink-0 flex-col items-center gap-3 py-2.5">
					{Array.from({ length: 6 }, (_, i) => (
						<Skeleton key={i} className="size-8 rounded-lg" />
					))}
				</div>
				<Card className="mb-3 min-h-0 w-[320px] shrink-0 gap-7 overflow-hidden p-5">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-8 w-full rounded-full" />
					<div className="grid grid-cols-3 gap-2">
						{Array.from({ length: 6 }, (_, i) => (
							<Skeleton key={i} className="aspect-square rounded-lg" />
						))}
					</div>
					{Array.from({ length: 3 }, (_, i) => (
						<div key={i} className="space-y-4">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="h-2 w-full rounded-full" />
						</div>
					))}
				</Card>
				<div className="flex min-w-0 flex-1 flex-col gap-4 px-6 py-3">
					<Skeleton className="min-h-0 w-full flex-1 rounded-xl" />
					<Skeleton className="mx-auto h-8 w-48 shrink-0 rounded-full" />
				</div>
			</div>
			<div
				aria-hidden="true"
				className="flex shrink-0 flex-col gap-3 px-4 pb-4 pt-2"
				style={{ height: "22%", minHeight: 180, maxHeight: 280 }}
			>
				<Skeleton className="h-7 w-64 rounded-lg" />
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-[54px] w-4/5 rounded-lg" />
				<Skeleton className="h-6 w-1/3 rounded-lg" />
			</div>
		</div>
	);
}
