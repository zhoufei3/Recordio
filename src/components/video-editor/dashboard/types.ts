import type { ProjectLibraryEntry } from "../ProjectBrowserDialog";
export type DashboardProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	entries: ProjectLibraryEntry[];
	onOpenProject: (path: string) => Promise<unknown>;
	onImportFile: () => Promise<void>;
	error: string | null;
	onSignIn: () => void;
	onDeleteProjects: (paths: string[]) => Promise<string[]>;
	onDeleteProjectWithVideo: (projectPath: string, videoPath: string) => Promise<void>;
	onRenameProject: (path: string, name: string) => Promise<string>;
	onShareProject: (path: string) => Promise<void>;
	accountLabel?: string;
};
