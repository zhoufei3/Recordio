import undoIcon from "@/assets/icons/fad--undo.svg?url";
import redoIcon from "@/assets/icons/fad--redo.svg?url";

function HistoryIcon({ source }: { source: string }) {
	const image = `url("${source}")`;
	return (
		<span
			aria-hidden="true"
			className="block size-full bg-current"
			style={{
				maskImage: image,
				maskPosition: "center",
				maskRepeat: "no-repeat",
				maskSize: "contain",
				WebkitMaskImage: image,
				WebkitMaskPosition: "center",
				WebkitMaskRepeat: "no-repeat",
				WebkitMaskSize: "contain",
			}}
		/>
	);
}

export function FadUndoIcon() {
	return <HistoryIcon source={undoIcon} />;
}

export function FadRedoIcon() {
	return <HistoryIcon source={redoIcon} />;
}
