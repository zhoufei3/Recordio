import { useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { MusicNotes } from "@/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CLICK_SOUNDS } from "../clickSounds";
import { ZOOM_SOUNDS } from "../zoomSounds";
import { getTypingSoundUrl, TYPING_SOUND_OPTIONS } from "../typingSounds";

type Category = "click" | "transition" | "typing";
type SoundChoice = { id: string; label: string; path: string };

type Props = {
	t: (key: string, fallback?: string) => string;
	onAdd: (path: string, label: string) => Promise<void>;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	triggerRef?: RefObject<HTMLElement | null>;
	hideTrigger?: boolean;
};

export function BuiltInSoundPicker({ t, onAdd, open: controlledOpen, onOpenChange, triggerRef, hideTrigger }: Props) {
	const [internalOpen, setInternalOpen] = useState(false);
	const open = controlledOpen ?? internalOpen;
	const setOpen = (nextOpen: boolean) => {
		setInternalOpen(nextOpen);
		onOpenChange?.(nextOpen);
	};
	const [category, setCategory] = useState<Category>("click");
	const [addingId, setAddingId] = useState<string | null>(null);
	const categories: Array<{ id: Category; label: string }> = [
		{ id: "click", label: t("timeline.soundPicker.categories.click", "鼠标点击音效") },
		{ id: "transition", label: t("timeline.soundPicker.categories.transition", "转场音效") },
		{ id: "typing", label: t("timeline.soundPicker.categories.typing", "键盘打字音效") },
	];
	const sounds: SoundChoice[] =
		category === "click"
			? CLICK_SOUNDS.map((sound, index) => ({
					id: sound.id,
					path: sound.url,
					label: t(`settings.effects.clickSounds.sound${index + 1}`, `Sound ${index + 1}`),
				}))
			: category === "transition"
				? ZOOM_SOUNDS.map((sound) => ({
						id: sound.id,
						path: sound.url,
						label: t(`settings.zoom.sounds.${sound.id}`, sound.label),
					}))
				: TYPING_SOUND_OPTIONS.map((sound) => ({
						id: sound.id,
						path: getTypingSoundUrl(sound.id),
						label: t(`settings.${sound.translationKey}`, sound.id),
					}));

	const addSound = async (sound: SoundChoice) => {
		setAddingId(sound.id);
		try {
			await onAdd(sound.path, sound.label);
			setOpen(false);
		} finally {
			setAddingId(null);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			{!hideTrigger && <PopoverTrigger asChild>
				<Button
				type="button"
					variant="ghost"
					size="sm"
					className="h-9 gap-2 px-3"
					title={t("timeline.soundPicker.title", "内置音效")}
				>
					<MusicNotes className="h-4 w-4" />
					<span className="font-medium">{t("timeline.soundPicker.button", "音效")}</span>
				</Button>
			</PopoverTrigger>}
			<PopoverContent
				triggerRef={triggerRef}
				align="start"
				side="top"
				sideOffset={8}
				aria-label={t("timeline.soundPicker.title", "内置音效")}
				className="w-[min(360px,calc(100vw-24px))] p-0"
			>
				<div className="border-b border-border px-3 pb-2.5 pt-3">
					<h3 className="text-sm font-semibold">
						{t("timeline.soundPicker.title", "内置音效")}
					</h3>
					<div className="mt-2.5 flex gap-1 rounded-lg bg-primary/10 p-1">
						{categories.map((item) => (
							<button
								key={item.id}
								type="button"
								aria-pressed={category === item.id}
								onClick={() => setCategory(item.id)}
								className={`min-w-0 flex-1 rounded-md px-1.5 py-1.5 text-[11px] leading-tight transition-colors ${category === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"}`}
							>
								{item.label}
							</button>
						))}
					</div>
				</div>
				<div className="sound-picker-scrollbar max-h-[min(42vh,340px)] overflow-y-auto p-1.5">
					{sounds.map((sound) => (
						<button
							key={sound.id}
							type="button"
							disabled={addingId !== null}
							onClick={() => void addSound(sound)}
							className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-primary/15 hover:text-foreground focus-visible:bg-primary/15 active:bg-primary active:text-primary-foreground disabled:cursor-wait disabled:opacity-60"
						>
							<MusicNotes className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
							<span className="min-w-0 flex-1 truncate">{sound.label}</span>
							{addingId === sound.id && (
								<span className="text-xs text-muted-foreground">
									{t("timeline.soundPicker.adding", "添加中…")}
								</span>
							)}
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
