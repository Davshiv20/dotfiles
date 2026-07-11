import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

function padCenter(text: string, width: number): string {
	const visible = visibleWidth(text);
	if (visible >= width) return truncateToWidth(text, width, "");
	const left = Math.floor((width - visible) / 2);
	return " ".repeat(Math.max(0, left)) + text;
}

function makeRule(theme: Theme, width: number, label: string): string {
	const minWidth = Math.max(20, width);
	const plainLabel = ` ✦ ${label} ✦ `;
	const side = Math.max(1, Math.floor((minWidth - visibleWidth(plainLabel) - 2) / 2));
	const raw = `╭${"─".repeat(side)}${plainLabel}${"─".repeat(side)}╮`;
	return padCenter(theme.fg("borderMuted", raw), width);
}

function makeBottomRule(theme: Theme, width: number): string {
	const raw = `╰${"─".repeat(Math.max(8, Math.min(54, width - 2)))}╯`;
	return padCenter(theme.fg("borderMuted", raw), width);
}

function renderWideHeader(theme: Theme, width: number): string[] {
	const cyan = (s: string) => theme.fg("accent", s);
	const ice = (s: string) => theme.fg("mdHeading", s);
	const dim = (s: string) => theme.fg("dim", s);
	const muted = (s: string) => theme.fg("muted", s);

	const banner = [
		"██████╗  ██╗",
		"██╔══██╗ ██║",
		"██████╔╝ ██║",
		"██╔═══╝  ██║",
		"██║      ██║",
		"╚═╝      ╚═╝",
	];

	const spark = dim("  ·  ");
	const title = `${muted("cold neon terminal agent")} ${dim(`v${VERSION}`)}`;
	const glyphs = `${dim("◌")} ${muted("frosted prompts")} ${spark}${cyan("electric tools")} ${spark}${ice("quiet focus")} ${dim("◌")}`;

	return [
		"",
		makeRule(theme, width, "PI"),
		...banner.map((line, index) => padCenter(index < 3 ? cyan(line) : ice(line), width)),
		padCenter(title, width),
		padCenter(glyphs, width),
		makeBottomRule(theme, width),
		"",
	];
}

function renderCompactHeader(theme: Theme, width: number): string[] {
	const logo = `${theme.fg("accent", "▛▀▜")} ${theme.fg("mdHeading", "PI")} ${theme.fg("accent", "▙▄▟")}`;
	const subtitle = `${theme.fg("muted", "cold neon")} ${theme.fg("dim", `v${VERSION}`)}`;
	return ["", padCenter(logo, width), padCenter(subtitle, width), ""];
}

function installHeader(ctx: ExtensionContext) {
	if (ctx.mode !== "tui") return;

	ctx.ui.setHeader((_tui, theme) => ({
		render(width: number): string[] {
			return width >= 44 ? renderWideHeader(theme, width) : renderCompactHeader(theme, width);
		},
		invalidate() {},
	}));
}

export default function coldNeonHeader(pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		installHeader(ctx);
	});

	pi.registerCommand("cold-header", {
		description: "Show the cold neon PI startup header",
		handler: async (_args, ctx) => {
			installHeader(ctx);
			ctx.ui.notify("Cold neon header enabled", "info");
		},
	});

	pi.registerCommand("default-header", {
		description: "Restore pi's default startup header",
		handler: async (_args, ctx) => {
			ctx.ui.setHeader(undefined);
			ctx.ui.notify("Default header restored", "info");
		},
	});
}
