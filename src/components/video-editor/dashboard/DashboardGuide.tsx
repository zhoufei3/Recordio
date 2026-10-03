import { useScopedT } from "@/contexts/I18nContext";

const sections = [
	{
		id: "recording",
		title: "Recording modes and capture",
		steps: [
			"Presentation recording is selected by default and remembers your last choice. Change modes from the floating bar; switching modes asks you to confirm, and the countdown identifies the mode for this recording.",
			"Presentation recording keeps editable cursor and click data, then opens the editor. Standard recording captures the screen and audio as an HD MP4 without editable cursor data or a webcam overlay; it skips the editor and opens the recordings folder when finished.",
			"Choose a display or window and enable system audio or a microphone as needed. Check the audio input before starting; use the countdown to prepare your screen.",
			"Stop from the recording controls and wait for saving to finish, especially for long recordings. Presentation recordings and their cursor/audio sidecars are saved in the recordings folder.",
		],
	},
	{
		id: "projects",
		title: "Projects and files",
		steps: [
			"Home opens to the project list. Choose a project to open it, or import an existing video or project file. Named projects save your editing changes automatically.",
			"A project file stores edits and points to its source video. Keep both files available when moving a project to another computer.",
			"Use a project's menu to rename it or reveal it in its folder. Settings → Files shows the project and recording locations.",
			"Deleting only a project keeps its source video. The separate 'Delete project and video' action also moves matching recording sidecars to Trash after confirmation.",
		],
	},
	{
		id: "timeline",
		title: "Edit on the timeline",
		steps: [
			"Drag the playhead to find a moment; use Play/Pause to review the edit. Select a video clip or effect block before changing it.",
			"Split the current clip with the scissors button or the default Ctrl+B shortcut. Customize shortcuts in Settings if needed.",
			"Set the stepping slider from 1 frame to 10 seconds. The buttons beside Play and the Left/Right arrow keys use that interval.",
			"Use the timeline zoom slider or Ctrl+mouse wheel to inspect frames or see the whole project. The full-screen control expands the editor view.",
		],
	},
	{
		id: "motion",
		title: "Zoom and motion",
		steps: [
			"Add a zoom region above the video track, then drag its edges to set when the emphasis begins and ends.",
			"Choose a motion preset in Settings. Options range from smooth camera moves to elastic presets, including Strong Bounce, Ripple Bounce, and Edge Ripple Bounce.",
			"Preview the transition at normal playback speed and adjust the region if it hides important content.",
			"Use 'Clear all zooms' in the timeline toolbar when you want to remove every zoom effect from the project.",
		],
	},
	{
		id: "cursor",
		title: "Cursor and click effects",
		steps: [
			"Open the cursor settings in the editor to choose a built-in cursor style and adjust its size and appearance.",
			"Configure left and right clicks separately. Each button can have its own visual effect and color.",
			"Import custom sounds for click and zoom effects. They stay in their sound lists, where you can select or delete them.",
			"Enable Cursor Trail and adjust its size, length, duration, and color. Preview cursor and click effects before exporting; they are rendered into the final video.",
		],
	},
	{
		id: "appearance",
		title: "Style the video",
		steps: [
			"Use the scene panel to add an image, video, solid color, or gradient background.",
			"Adjust blur, padding, rounded corners, outline, and shadow to separate the recording from its background.",
			"Crop the source frame if it contains unwanted edges, and check that important screen content stays visible.",
			"Preview the finished composition at the intended aspect ratio before you export.",
		],
	},
	{
		id: "export",
		title: "Export and troubleshoot",
		steps: [
			"Choose the output format, resolution, frame rate, and quality. Higher bitrates improve detail but increase file size.",
			"Choose a save location before rendering begins. Keep enough free disk space for the output file.",
			"The export window shows progress, elapsed time, and an estimate that updates with rendering speed. A sound plays when export succeeds.",
			"If export fails, try a different encoder mode or lower output settings, update graphics drivers, and keep the error details for diagnosis.",
		],
	},
] as const;

export function DashboardGuide() {
	const t = useScopedT("editor");
	return (
		<section aria-label={t("dashboard.guide.title", "Recordio guide")} className="mx-auto max-w-5xl py-10">
			<h1 className="text-xl font-semibold">{t("dashboard.guide.title", "Recordio guide")}</h1>
			<p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
				{t("dashboard.guide.intro", "Follow these steps from your first recording through editing and export. You can return to this guide from Home at any time.")}
			</p>
			<div className="mt-7 grid gap-4 xl:grid-cols-2">
				{sections.map((section, index) => (
					<article key={section.id} className="rounded-2xl border border-border bg-card p-6">
						<div className="mb-4 flex items-center gap-3">
							<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-foreground">
								{index + 1}
							</span>
							<h2 className="text-base font-semibold">{t(`dashboard.guide.${section.id}.title`, section.title)}</h2>
						</div>
						<ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
							{section.steps.map((step, stepIndex) => (
								<li key={step}>{t(`dashboard.guide.${section.id}.step${stepIndex + 1}`, step)}</li>
							))}
						</ol>
					</article>
				))}
			</div>
		</section>
	);
}
