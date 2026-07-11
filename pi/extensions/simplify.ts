/**
 * Simplify Extension
 *
 * Adds /simplify and /simplifying commands that ask the agent to perform a
 * behavior-preserving simplification/refactor pass focused on duplication,
 * reusable extraction, constants, and maintainability.
 */

import type { AutocompleteItem } from "@earendil-works/pi-tui";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const COMMAND_OPTIONS = [
	"--check",
	"--report",
	"--apply",
	"--diff",
	"--aggressive",
	"--help",
] as const;

function completions(prefix: string): AutocompleteItem[] | null {
	const lastToken = prefix.split(/\s+/).pop() ?? "";
	if (!lastToken.startsWith("-")) return null;

	const filtered = COMMAND_OPTIONS.filter((option) => option.startsWith(lastToken));
	return filtered.length > 0
		? filtered.map((option) => ({
				value: option,
				label: option,
				description: optionDescription(option),
			}))
		: null;
}

function optionDescription(option: string): string {
	switch (option) {
		case "--check":
			return "Report opportunities only; do not edit files";
		case "--report":
			return "Alias for --check";
		case "--apply":
			return "Apply safe, behavior-preserving simplifications";
		case "--diff":
			return "Focus on current git diff / recently touched files";
		case "--aggressive":
			return "Look harder for broader extraction opportunities, but stay behavior-preserving";
		case "--help":
			return "Show usage";
		default:
			return "";
	}
}

function usage(): string {
	return [
		"Usage:",
		"  /simplify                 Review current changes and propose a safe simplification plan",
		"  /simplify --check         Report opportunities only; no edits",
		"  /simplify --apply         Apply small safe simplifications, then verify",
		"  /simplify --diff          Focus on git diff / touched files",
		"  /simplify path/to/file.ts Review a specific file or path",
		"  /simplify --aggressive    Broader review, but still behavior-preserving",
	].join("\n");
}

function buildPrompt(rawArgs: string): string {
	const tokens = rawArgs.trim().split(/\s+/).filter(Boolean);
	const has = (flag: string) => tokens.includes(flag);
	const reportOnly = has("--check") || has("--report");
	const apply = has("--apply");
	const diffOnly = has("--diff") || tokens.length === 0;
	const aggressive = has("--aggressive");
	const targets = tokens.filter((token) => !COMMAND_OPTIONS.includes(token as (typeof COMMAND_OPTIONS)[number]));

	const mode = reportOnly
		? "REPORT ONLY: inspect and report opportunities. Do not edit files."
		: apply
			? "APPLY MODE: apply only small, safe, behavior-preserving simplifications. Ask before broad/risky refactors."
			: "PLAN-FIRST MODE: inspect, propose a concise simplification plan, and ask before editing unless the change is tiny and obviously safe.";

	const scope = targets.length > 0
		? `Target these path(s) or areas: ${targets.join(" ")}`
		: diffOnly
			? "Scope: start from the current git status/diff and recently touched files."
			: "Scope: current task/recently written code.";

	return `You are running the /simplify command.

Goal: simplify code I have written without changing behavior, functionality, public APIs, data shapes, side effects, styling intent, or tests.

${mode}
${scope}
${aggressive ? "Aggressive review is enabled: look for deeper extraction and reuse opportunities, but reject clever or premature abstractions." : "Prefer minimal, high-confidence improvements over broad rewrites."}

Simplification checklist:
1. Detect duplicated or near-duplicated logic, including repeated conditionals, transformations, validation, error handling, test setup, UI markup, and API/client code.
2. Reuse existing project utilities/components/hooks/services before creating new abstractions.
3. Extract reusable helpers/components/constants only when the abstraction has a clear name and future maintenance benefit.
4. Extract repeated constants: strings, route names, event names, config keys, status codes, timeouts, limits, regexes, CSS/class fragments, selectors, and test fixtures.
5. Improve maintainability: clearer names, smaller functions, flatter branching, less cognitive load, better module boundaries.
6. Preserve behavior exactly. Do not change public exports, request/response schemas, persistence format, CLI flags, UI copy semantics, auth/security behavior, error semantics, or performance characteristics unless explicitly approved.
7. Avoid over-abstraction. Do not DRY code whose intent differs. Prefer readable duplication over a vague helper.
8. Follow existing project conventions and dependency choices. Do not add dependencies unless absolutely necessary and approved.
9. If editing, keep diffs focused and easy to review. Do not mix unrelated style churn with simplification.
10. If editing, run the most relevant existing validation you can discover: typecheck, lint, tests, or targeted tests. If validation cannot run, explain why.

Recommended workflow:
- Inspect relevant files first. If no explicit target was provided, use git status/diff to identify changed files.
- Summarize the opportunities in priority order.
- In report-only mode, stop after the report.
- In plan-first mode, ask for confirmation before applying non-trivial changes.
- In apply mode, make minimal safe edits, validate them, then summarize what changed and why.

Output format:
- Scope inspected
- Opportunities found
- Actions taken or recommended
- Validation run / not run
- Any risks or follow-ups
`;
}

export default function simplifyExtension(pi: ExtensionAPI) {
	const register = (name: "simplify" | "simplifying") => {
		pi.registerCommand(name, {
			description: "Simplify recently written code without changing behavior",
			getArgumentCompletions: completions,
			handler: async (args, ctx) => {
				if (args.trim().includes("--help")) {
					ctx.ui.notify(usage(), "info");
					return;
				}

				const prompt = buildPrompt(args);

				if (ctx.isIdle()) {
					pi.sendUserMessage(prompt);
				} else {
					pi.sendUserMessage(prompt, { deliverAs: "followUp" });
					ctx.ui.notify(`/${name} queued as a follow-up`, "info");
				}
			},
		});
	};

	register("simplify");
	register("simplifying");
}
