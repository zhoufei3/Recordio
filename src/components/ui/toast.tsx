import { Toast, toast as heroToast } from "@heroui/react";
import { isValidElement, type ReactNode } from "react";
import { copyText } from "@/lib/copyText";

type Options = {
	id?: string | number;
	description?: ReactNode;
	copyText?: string;
	duration?: number;
	action?: { label: ReactNode; onClick: () => void };
	onDismiss?: () => void;
};
type Variant = "default" | "accent" | "success" | "warning" | "danger";
const ids = new Map<string | number, string>();

// Some notifications originate in Electron or older editor hooks without access to React i18n.
const zhNotifications: Record<string, string> = {
	"Copy": "复制",
	"Error copied": "错误信息已复制",
	"Could not copy error": "无法复制错误信息",
	"Show in Folder": "在文件夹中显示",
	"No video loaded": "尚未加载视频",
	"No source video is loaded": "尚未加载源视频",
	"Video not ready": "视频尚未就绪",
	"Video metadata is still loading": "正在加载视频信息",
	"Export canceled": "已取消导出",
	"Save canceled. You can try again.": "已取消保存，可以重试。",
	"Save canceled. You can save again without re-exporting.": "已取消保存，可直接重新保存，无需再次导出。",
	"Project save canceled": "已取消保存项目",
	"Project name is required": "请输入项目名称",
	"No media file selected": "尚未选择媒体文件",
	"Media imported": "媒体文件已导入",
	"Project loaded": "项目已加载",
	"Please select a video file (mp4, webm, mov, etc.)": "请选择视频文件（如 MP4、WebM 或 MOV）。",
	"Could not save library preferences": "无法保存素材库偏好设置",
	"Could not save folders": "无法保存文件夹",
	"Could not open announcement": "无法打开公告",
	"Share created, but its link could not be saved locally": "分享已创建，但链接未能保存到本地",
	"Whisper executable selected": "已选择 Whisper 程序",
	"Whisper model selected": "已选择 Whisper 模型",
	"Whisper small model deleted": "已删除 Whisper small 模型",
	"Select a Whisper model or download the small model first": "请先选择 Whisper 模型或下载 small 模型",
	"Recording changed; generated captions were not applied.": "录制内容已更改，生成的字幕未应用。",
	"Failed to download Whisper small model": "无法下载 Whisper small 模型",
	"Failed to delete Whisper small model": "无法删除 Whisper small 模型",
	"Failed to generate captions": "字幕生成失败",
	"Unsupported format": "不支持的格式",
	"Video background added": "已添加视频背景",
	"Failed to import video background": "导入视频背景失败",
	"Failed to import file": "导入文件失败",
	"Failed to save project": "保存项目失败",
	"Failed to save video": "保存视频失败",
	"Failed to save GIF": "保存 GIF 失败",
	"GIF export failed": "GIF 导出失败",
	"Failed to reveal item in folder.": "无法在文件夹中显示文件。",
	"No pending export to save": "没有待保存的导出文件",
	"Native Windows capture is unavailable. Falling back to browser capture.": "原生 Windows 捕获不可用，已切换为浏览器捕获。",
	"Unable to check native Windows capture. Falling back to browser capture.": "无法检查原生 Windows 捕获，已切换为浏览器捕获。",
	"Native Windows capture failed to start. Falling back to browser capture.": "原生 Windows 捕获启动失败，已切换为浏览器捕获。",
	"Could not load companion audio sources. Playback and export may miss microphone audio.": "无法加载辅助音轨，播放和导出时可能缺少麦克风声音。",
};

function localizeText(value: ReactNode): ReactNode {
	if (typeof value !== "string" || typeof document === "undefined" || !document.documentElement.lang.toLowerCase().startsWith("zh")) return value;
	const exact = zhNotifications[value];
	if (exact) return exact;
	const patterns: Array<[RegExp, string]> = [
		[/^Exported successfully to (.+)$/, "已成功导出到 $1"],
		[/^Project loaded from (.+)$/, "已从 $1 加载项目"],
		[/^Generated (\d+) captions$/, "已生成 $1 条字幕"],
		[/^Could not (remove|restore|add) videos?: (.+)$/, "无法处理视频：$2"],
		[/^Could not stop import processing: (.+)$/, "无法停止导入处理：$1"],
		[/^(?:Failed|Error) to reveal item in folder: (.+)$/, "无法在文件夹中显示文件：$1"],
		[/^Error revealing in folder: (.+)$/, "无法在文件夹中显示文件：$1"],
		[/^Could not save project: (.+)$/, "无法保存项目：$1"],
		[/^Could not load companion audio sources?: (.+)$/, "无法加载辅助音轨：$1"],
		[/^(.+)\. Recording was saved without the fallback microphone track\.$/, "$1。录制已保存，但不包含备用麦克风音轨。"],
	];
	for (const [pattern, replacement] of patterns) {
		if (pattern.test(value)) return value.replace(pattern, replacement);
	}
	return value;
}

function plainText(value: ReactNode): string {
	if (typeof value === "string" || typeof value === "number") return String(value);
	if (Array.isArray(value)) return value.map(plainText).join("");
	if (isValidElement<{ children?: ReactNode }>(value)) return plainText(value.props.children);
	return "";
}

// Keep existing callers compatible while HeroUI owns the queue and presentation.
function notify(title: ReactNode, options: Options = {}, variant: Variant = "default") {
	title = localizeText(title);
	options = {
		...options,
		description: localizeText(options.description),
		action: options.action ? { ...options.action, label: localizeText(options.action.label) } : undefined,
	};
	const errorText = options.copyText ?? [plainText(title), plainText(options.description)]
		.filter(Boolean)
		.join("\n\n");
	const action = options.action;
	const nativeOptions = {
		variant,
		description: options.description,
		timeout:
			options.duration === Infinity
				? 0
				: (options.duration ?? (variant === "danger" ? 8000 : 4000)),
		onClose: () => {
			if (options.id !== undefined) ids.delete(options.id);
			options.onDismiss?.();
		},
		actionProps: action
			? {
					children: action.label,
					onPress: action.onClick,
				}
			: variant === "danger" && errorText
				? {
						children: localizeText("Copy"),
						onPress: () => {
							void copyText(errorText).then(
								() => heroToast.success(localizeText("Error copied")),
								() =>
									heroToast.danger(localizeText("Could not copy error")),
							);
						},
					}
				: undefined,
	};
	const previous = options.id === undefined ? undefined : ids.get(options.id);
	const key = previous
		? heroToast.update(previous, title, nativeOptions)
		: heroToast(title, nativeOptions);
	if (options.id !== undefined) ids.set(options.id, key);
	return key;
}
export const toast = Object.assign(notify, {
	success: (message: ReactNode, options?: Options) => notify(message, options, "success"),
	error: (message: ReactNode, options?: Options) => notify(message, options, "danger"),
	info: (message: ReactNode, options?: Options) => notify(message, options, "accent"),
	warning: (message: ReactNode, options?: Options) => notify(message, options, "warning"),
	dismiss: (id?: string | number) => {
		if (id === undefined) {
			heroToast.clear();
			ids.clear();
		} else heroToast.close(ids.get(id) ?? String(id));
	},
});
export function Toaster({ className }: { className?: string }) {
	return <Toast.Provider placement="bottom end" className={className} />;
}
