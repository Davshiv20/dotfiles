/**
 * Thinking Level Extension
 *
 * Adds commands to change pi's current reasoning/thinking level from chat.
 *
 * Usage:
 *   /thinking high
 *   /thinking off
 *   /thinking --default high
 *   /reasoning medium
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem } from "@earendil-works/pi-tui";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;
type ThinkingLevel = (typeof LEVELS)[number];

const SETTINGS_PATH = join(homedir(), ".pi", "agent", "settings.json");

function isThinkingLevel(value: string): value is ThinkingLevel {
	return (LEVELS as readonly string[]).includes(value);
}

function completions(prefix: string): AutocompleteItem[] | null {
	const tokens = prefix.trimStart().split(/\s+/);
	const current = tokens[tokens.length - 1] ?? "";
	const candidates = ["--default", ...LEVELS];
	const filtered = candidates.filter((candidate) => candidate.startsWith(current));
	return filtered.length > 0
		? filtered.map((value) => ({
				value,
				label: value,
				description: value === "--default" ? "Also save as global default" : `Set thinking level to ${value}`,
			}))
		: null;
}

function usage(command: string): string {
	return [
		`Usage: /${command} <off|minimal|low|medium|high|xhigh>`,
		`       /${command} --default <off|minimal|low|medium|high|xhigh>`,
		"",
		"Examples:",
		`  /${command} high`,
		`  /${command} --default high`,
	].join("\n");
}

async function saveDefaultThinkingLevel(level: ThinkingLevel) {
	let settings: Record<string, unknown> = {};

	try {
		settings = JSON.parse(await readFile(SETTINGS_PATH, "utf8")) as Record<string, unknown>;
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code !== "ENOENT") throw error;
	}

	settings.defaultThinkingLevel = level;
	await mkdir(dirname(SETTINGS_PATH), { recursive: true });
	await writeFile(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export default function thinkingLevelExtension(pi: ExtensionAPI) {
	const register = (command: "thinking" | "reasoning" | "think") => {
		pi.registerCommand(command, {
			description: "Change current reasoning/thinking level",
			getArgumentCompletions: completions,
			handler: async (args, ctx) => {
				const rawTokens = args.trim().split(/\s+/).filter(Boolean);
				const saveDefault = rawTokens.includes("--default");
				const tokens = rawTokens.filter((token) => token !== "--default");

				if (tokens.includes("--help") || tokens.includes("-h")) {
					ctx.ui.notify(usage(command), "info");
					return;
				}

				let level = tokens[0];

				if (!level && ctx.hasUI) {
					const selected = await ctx.ui.select("Select thinking level", [...LEVELS]);
					level = selected;
				}

				if (!level || !isThinkingLevel(level)) {
					ctx.ui.notify(usage(command), "warning");
					return;
				}

				pi.setThinkingLevel(level);

				if (saveDefault) {
					await saveDefaultThinkingLevel(level);
					ctx.ui.notify(`Thinking level set to ${level} and saved as default`, "info");
				} else {
					ctx.ui.notify(`Thinking level set to ${level}`, "info");
				}
			},
		});
	};

	register("thinking");
	register("reasoning");
	register("think");
}
