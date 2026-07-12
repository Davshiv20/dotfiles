import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function normalizePath(raw: string, cwd: string): string {
	const trimmed = raw.trim();
	const unquoted = trimmed.replace(/^(['"])(.*)\1$/, "$2");
	return isAbsolute(unquoted) ? unquoted : resolve(cwd, unquoted);
}

export default function thingExtension(pi: ExtensionAPI) {
	pi.registerCommand("thing", {
		description: "Publish a local HTML file with `thing push`",
		getArgumentCompletions: () => null,
		handler: async (args, ctx) => {
			let inputPath = args.trim();
			if (!inputPath && ctx.hasUI) {
				const value = await ctx.ui.input("HTML file to publish", "docs/example.html");
				inputPath = value?.trim() ?? "";
			}

			if (!inputPath) {
				ctx.ui.notify("Usage: /thing path/to/file.html", "error");
				return;
			}

			const htmlPath = normalizePath(inputPath, ctx.cwd);
			if (!htmlPath.toLowerCase().endsWith(".html")) {
				ctx.ui.notify(`Not an HTML file: ${htmlPath}`, "error");
				return;
			}

			try {
				const fileStat = await stat(htmlPath);
				if (!fileStat.isFile()) {
					ctx.ui.notify(`Not a file: ${htmlPath}`, "error");
					return;
				}
			} catch {
				ctx.ui.notify(`File not found: ${htmlPath}`, "error");
				return;
			}

			ctx.ui.setStatus("thing", "publishing…");
			try {
				const { stdout, stderr } = await execFileAsync("thing", ["push", htmlPath], {
					cwd: ctx.cwd,
					timeout: 120_000,
				});
				const output = `${stdout}${stderr}`.trim();
				const link = output.split(/\r?\n/).find((line) => line.startsWith("http")) ?? output;
				ctx.ui.notify(link ? `Published: ${link}` : "Published with thing push", "info");
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`thing push failed: ${message}`, "error");
			} finally {
				ctx.ui.setStatus("thing", "");
			}
		},
	});
}
