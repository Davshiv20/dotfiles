import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { complete, type Message } from "@earendil-works/pi-ai/compat";
import {
	CONFIG_DIR_NAME,
	convertToLlm,
	serializeConversation,
	type ExtensionAPI,
	type SessionEntry,
} from "@earendil-works/pi-coding-agent";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SYSTEM_PROMPT = `You are a precise engineering handoff writer.

Given the current pi session transcript, create a self-contained Markdown handoff document for another engineer or future agent.

Requirements:
- Use clear Markdown headings.
- Summarize the user's goals and the current state.
- Include decisions made, files discussed or changed, commands/tools used when relevant, risks, open questions, and concrete next steps.
- Preserve important technical details such as paths, APIs, commands, errors, and constraints.
- Do not invent facts.
- Do not include conversational filler or a preamble.`;

function entryToMessage(entry: SessionEntry): AgentMessage | undefined {
	if (entry.type === "message") {
		return entry.message;
	}

	if (entry.type === "compaction") {
		return {
			role: "compactionSummary",
			summary: entry.summary,
			tokensBefore: entry.tokensBefore,
			timestamp: new Date(entry.timestamp).getTime(),
		};
	}

	return undefined;
}

function getHandoffMessages(branch: SessionEntry[]): AgentMessage[] {
	let compactionIndex = -1;
	for (let i = branch.length - 1; i >= 0; i--) {
		if (branch[i].type === "compaction") {
			compactionIndex = i;
			break;
		}
	}

	if (compactionIndex < 0) {
		return branch.map(entryToMessage).filter((message) => message !== undefined);
	}

	const compaction = branch[compactionIndex];
	const firstKeptIndex =
		compaction.type === "compaction" ? branch.findIndex((entry) => entry.id === compaction.firstKeptEntryId) : -1;

	const compactedBranch = [
		compaction,
		...(firstKeptIndex >= 0 ? branch.slice(firstKeptIndex, compactionIndex) : []),
		...branch.slice(compactionIndex + 1),
	];

	return compactedBranch.map(entryToMessage).filter((message) => message !== undefined);
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
}

function timestampForFile(date = new Date()): string {
	return date.toISOString().replace(/[:.]/g, "-");
}

function buildMarkdownDocument(summary: string, metadata: { cwd: string; sessionFile?: string; model: string; createdAt: string }) {
	const sourceSession = metadata.sessionFile ?? "ephemeral session";
	return [
		"# Session Handoff",
		"",
		`- Created: ${metadata.createdAt}`,
		`- Working directory: \`${metadata.cwd}\``,
		`- Source session: \`${sourceSession}\``,
		`- Summary model: \`${metadata.model}\``,
		"",
		"---",
		"",
		summary.trim(),
		"",
	].join("\n");
}

export default function handoffMarkdownExtension(pi: ExtensionAPI) {
	pi.registerCommand("handoff", {
		description: "Summarize the current session and publish it as a Markdown handoff file",
		handler: async (args, ctx) => {
			if (!ctx.model) {
				if (ctx.hasUI) ctx.ui.notify("No model selected", "error");
				return;
			}

			const messages = getHandoffMessages(ctx.sessionManager.getBranch());
			if (messages.length === 0) {
				if (ctx.hasUI) ctx.ui.notify("No session content to summarize", "warning");
				return;
			}

			const auth = await ctx.modelRegistry.getApiKeyAndHeaders(ctx.model);
			if (!auth.ok || !auth.apiKey) {
				if (ctx.hasUI) ctx.ui.notify(auth.ok ? `No API key for ${ctx.model.provider}` : auth.error, "error");
				return;
			}

			if (ctx.hasUI) ctx.ui.notify("Generating handoff summary...", "info");

			const conversationText = serializeConversation(convertToLlm(messages));
			const titleHint = args.trim();
			const userMessage: Message = {
				role: "user",
				content: [
					{
						type: "text",
						text: [
							`Title hint: ${titleHint || "Session Handoff"}`,
							"",
							"## Current pi session transcript",
							conversationText,
						].join("\n"),
					},
				],
				timestamp: Date.now(),
			};

			const response = await complete(
				ctx.model,
				{ systemPrompt: SYSTEM_PROMPT, messages: [userMessage] },
				{ apiKey: auth.apiKey, headers: auth.headers, signal: ctx.signal },
			);

			if (response.stopReason === "aborted") {
				if (ctx.hasUI) ctx.ui.notify("Handoff generation cancelled", "info");
				return;
			}

			const summary = response.content
				.filter((part): part is { type: "text"; text: string } => part.type === "text")
				.map((part) => part.text)
				.join("\n")
				.trim();

			if (!summary) {
				if (ctx.hasUI) ctx.ui.notify("Model returned an empty handoff", "error");
				return;
			}

			const now = new Date();
			const modelId = `${ctx.model.provider}/${ctx.model.id}`;
			const markdown = buildMarkdownDocument(summary, {
				cwd: ctx.cwd,
				sessionFile: ctx.sessionManager.getSessionFile(),
				model: modelId,
				createdAt: now.toISOString(),
			});

			const handoffDir = join(ctx.cwd, CONFIG_DIR_NAME, "handoffs");
			await mkdir(handoffDir, { recursive: true });

			const slug = slugify(titleHint || "session-handoff");
			const outputPath = join(handoffDir, `${timestampForFile(now)}-${slug}.md`);
			await writeFile(outputPath, markdown, "utf8");

			if (ctx.hasUI) {
				ctx.ui.notify(`Handoff published: ${outputPath}`, "info");
			}
		},
	});
}
