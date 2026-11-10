import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import type { OverlayHandle, TUI } from "@earendil-works/pi-tui";
import { Input, Key, matchesKey, truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";

const MAX_CONTEXT_CHARS = 60_000;
const MAX_BODY_LINES = 18;

const SYSTEM_PROMPT = `You answer quick side questions about the current Pi session.
Use only the provided conversation context and this side-chat transcript.
Do not claim to inspect files, run commands, or search the web.
Be concise.`;

let activeBtw: { handle?: OverlayHandle; panel: BtwChatOverlay } | undefined;

export default function (pi: ExtensionAPI) {
	pi.registerShortcut(Key.ctrlShift("b"), {
		description: "Focus the /btw side chat",
		handler: () => activeBtw?.handle?.focus(),
	});

	pi.registerCommand("btw", {
		description: "Open a temporary side-chat overlay without adding it to chat history",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
				return;
			}

			if (activeBtw) {
				activeBtw.handle.focus();
				const question = (args || "").trim();
				if (question) activeBtw.panel.ask(question);
				return;
			}

			const sessionContext = currentSessionText(ctx);
			const initialQuestion = (args || "").trim();

			await ctx.ui.custom<void>(
				(tui, theme, _keybindings, done) => {
					const panel = new BtwChatOverlay({ tui, theme, ctx, sessionContext, initialQuestion, done });
					return panel;
				},
				{
					overlay: true,
					overlayOptions: {
						nonCapturing: true,
						anchor: "top-right",
						width: 92,
						maxHeight: 32,
						margin: { top: 1, right: 2 },
					},
					onHandle: (handle) => {
						const panel = activeBtw?.panel;
						if (panel) {
							panel.handle = handle;
							activeBtw = { panel, handle };
						}
						handle.focus();
					},
				},
			);
		},
	});
}

function currentSessionText(ctx: ExtensionContext): string {
	return ctx.sessionManager
		.getBranch()
		.filter((entry) => entry.type === "message")
		.map((entry) => {
			const message = entry.message;
			if (!("role" in message)) return "";
			const text = contentToText(message.content).trim();
			return text ? `${message.role.toUpperCase()}:\n${text}` : "";
		})
		.filter(Boolean)
		.join("\n\n")
		.slice(-MAX_CONTEXT_CHARS);
}

function contentToText(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.map((part) => {
			if (typeof part === "string") return part;
			if (part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part) {
				return String(part.text);
			}
			return "";
		})
		.filter(Boolean)
		.join("\n");
}

type ChatLine = { role: "you" | "btw" | "status"; text: string };

class BtwChatOverlay {
	focused = false;
	handle: OverlayHandle | undefined;

	private readonly input = new Input();
	private readonly lines: ChatLine[] = [];
	private closed = false;
	private busy = false;

	constructor(
		private readonly options: {
			tui: TUI;
			theme: Theme;
			ctx: ExtensionCommandContext;
			sessionContext: string;
			initialQuestion: string;
			done: () => void;
		},
	) {
		activeBtw = { panel: this };
		this.lines.push({ role: "status", text: "Side chat. No tools. Not saved to main history." });
		if (options.initialQuestion) this.ask(options.initialQuestion);
	}

	ask(question: string): void {
		void this.send(question);
	}

	handleInput(data: string): void {
		if (matchesKey(data, "ctrl+c")) {
			this.close();
			return;
		}
		if (matchesKey(data, "escape")) {
			this.close();
			return;
		}
		if (matchesKey(data, "return")) {
			const text = this.input.getValue().trim();
			if (!text || this.busy) return;
			this.input.setValue("");
			void this.send(text);
			return;
		}
		this.input.handleInput(data);
		this.options.tui.requestRender();
	}

	render(width: number): string[] {
		const theme = this.options.theme;
		const outerWidth = Math.min(92, Math.max(36, width));
		const innerWidth = outerWidth - 4;
		const borderColor: "accent" | "dim" = this.focused ? "accent" : "dim";
		const border = theme.fg(borderColor, "─".repeat(outerWidth - 2));
		const out: string[] = [theme.fg(borderColor, `╭${border}╮`)];

		out.push(this.row(`${theme.fg("accent", "BTW")} ${theme.fg("dim", this.focused ? "focused" : "visible; Ctrl+Shift+B to focus")}`, innerWidth, borderColor));
		out.push(this.row("", innerWidth, borderColor));

		const bodyLines = this.lines.flatMap((line) => {
			const prefix = line.role === "you" ? theme.fg("success", "you: ") : line.role === "btw" ? theme.fg("accent", "btw: ") : theme.fg("dim", "· ");
			return wrapTextWithAnsi(prefix + line.text, innerWidth);
		});
		for (const line of bodyLines.slice(-MAX_BODY_LINES)) out.push(this.row(line, innerWidth, borderColor));

		out.push(this.row("", innerWidth, borderColor));
		this.input.focused = this.focused;
		const [inputLine = ""] = this.input.render(Math.max(1, innerWidth - 4));
		out.push(this.row(`${this.busy ? theme.fg("warning", "…") : ">"} ${inputLine}`, innerWidth, borderColor));
		out.push(this.row(theme.fg("dim", "Enter send · Esc/Ctrl+C close · Ctrl+Shift+B focus"), innerWidth, borderColor));
		out.push(theme.fg(borderColor, `╰${border}╯`));
		return out;
	}

	private async send(question: string): Promise<void> {
		if (this.closed) return;
		this.busy = true;
		this.lines.push({ role: "you", text: question });
		this.options.tui.requestRender();

		try {
			const sideTranscript = this.lines
				.filter((line) => line.role !== "status")
				.map((line) => `${line.role.toUpperCase()}: ${line.text}`)
				.join("\n");
			const response = await this.options.ctx.modelRegistry.complete(this.options.ctx.model!, {
				systemPrompt: SYSTEM_PROMPT,
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: `Current session context:\n\n${this.options.sessionContext}\n\nSide chat so far:\n${sideTranscript}`,
							},
						],
						timestamp: Date.now(),
					},
				],
			});
			const answer = contentToText(response.content).trim();
			this.lines.push({ role: "btw", text: answer || "No answer." });
		} catch (error) {
			this.lines.push({ role: "status", text: error instanceof Error ? error.message : String(error) });
		} finally {
			this.busy = false;
			this.options.tui.requestRender();
		}
	}

	private row(content: string, innerWidth: number, borderColor: "accent" | "dim"): string {
		const clipped = truncateToWidth(content, innerWidth);
		const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(clipped)));
		return `${this.options.theme.fg(borderColor, "│")} ${clipped}${padding} ${this.options.theme.fg(borderColor, "│")}`;
	}

	private close(): void {
		if (this.closed) return;
		this.closed = true;
		activeBtw = undefined;
		this.options.done();
	}

	invalidate(): void {}
	dispose(): void {
		this.closed = true;
		if (activeBtw?.panel === this) activeBtw = undefined;
	}
}
