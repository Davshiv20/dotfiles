import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOWS = [1, 7, 30, 90] as const;
const PI_SESSION_DIR = join(homedir(), ".pi", "agent", "sessions");
const CODEX_SESSION_DIR = join(homedir(), ".codex", "sessions");
const HERMES_STATE_DB = join(homedir(), ".hermes", "state.db");
const MODELS_DEV_URL = "https://models.dev";
const execFileAsync = promisify(execFile);

type WindowDays = (typeof WINDOWS)[number];

type Usage = {
	input: number;
	cachedInput: number;
	output: number;
	reasoningOutput: number;
	total: number;
	cost: number;
	turns: number;
	sessions: Set<string>;
	models: Map<string, Usage>;
};

type FlatUsage = Omit<Usage, "sessions" | "models"> & {
	sessions: number;
	models: Array<{ model: string; usage: FlatUsage }>;
};

type Price = {
	input?: number;
	cachedInput?: number;
	output?: number;
	reasoningOutput?: number;
};

type PriceBook = Record<string, Price>;

type PriceLookup = {
	prices: PriceBook;
	source: string;
	warning?: string;
};

type Accumulators = Record<WindowDays, Usage>;

type PiMessage = {
	role?: unknown;
	provider?: unknown;
	model?: unknown;
	usage?: unknown;
	timestamp?: unknown;
};

type CodexEvent = {
	timestamp?: unknown;
	type?: unknown;
	payload?: unknown;
};

type HermesUsageRow = {
	session_id?: unknown;
	model?: unknown;
	billing_provider?: unknown;
	billing_mode?: unknown;
	api_call_count?: unknown;
	input_tokens?: unknown;
	output_tokens?: unknown;
	cache_read_tokens?: unknown;
	cache_write_tokens?: unknown;
	reasoning_tokens?: unknown;
	estimated_cost_usd?: unknown;
	timestamp?: unknown;
};

const emptyUsage = (): Usage => ({
	input: 0,
	cachedInput: 0,
	output: 0,
	reasoningOutput: 0,
	total: 0,
	cost: 0,
	turns: 0,
	sessions: new Set<string>(),
	models: new Map<string, Usage>(),
});

const emptyAccumulators = (): Accumulators => ({
	1: emptyUsage(),
	7: emptyUsage(),
	30: emptyUsage(),
	90: emptyUsage(),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const asNumber = (value: unknown): number =>
	typeof value === "number" && Number.isFinite(value) ? value : 0;

const asOptionalNumber = (value: unknown): number | undefined =>
	typeof value === "number" && Number.isFinite(value) ? value : undefined;

const normalizeModelKey = (model: string): string =>
	model.trim().toLowerCase().replace(/^openai-codex\//, "openai/");

const addUsage = (target: Usage, delta: Omit<Usage, "sessions" | "models">, sessionId: string) => {
	target.input += delta.input;
	target.cachedInput += delta.cachedInput;
	target.output += delta.output;
	target.reasoningOutput += delta.reasoningOutput;
	target.total += delta.total;
	target.cost += delta.cost;
	target.turns += delta.turns;
	target.sessions.add(sessionId);
};

const addModelUsage = (target: Usage, model: string, delta: Omit<Usage, "sessions" | "models">, sessionId: string) => {
	let usage = target.models.get(model);
	if (!usage) {
		usage = emptyUsage();
		target.models.set(model, usage);
	}
	addUsage(usage, delta, sessionId);
};

const addToWindows = (
	acc: Accumulators,
	timestampMs: number,
	nowMs: number,
	model: string,
	delta: Omit<Usage, "sessions" | "models">,
	sessionId: string,
) => {
	for (const days of WINDOWS) {
		if (timestampMs < nowMs - days * DAY_MS) continue;
		addUsage(acc[days], delta, sessionId);
		addModelUsage(acc[days], model, delta, sessionId);
	}
};

const walkFiles = async (root: string, suffix: string): Promise<string[]> => {
	const files: string[] = [];
	const visit = async (dir: string) => {
		let entries: Awaited<ReturnType<typeof readdir>>;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		await Promise.all(entries.map(async (entry) => {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) {
				await visit(path);
			} else if (entry.isFile() && entry.name.endsWith(suffix)) {
				files.push(path);
			}
		}));
	};
	await visit(root);
	return files;
};

const parseTimestamp = (value: unknown): number | undefined => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string") return undefined;
	const ms = Date.parse(value);
	return Number.isFinite(ms) ? ms : undefined;
};

const parseJsonLine = (line: string): unknown | undefined => {
	try {
		return JSON.parse(line) as unknown;
	} catch {
		return undefined;
	}
};

const readJsonLines = async (file: string, onLine: (value: unknown) => void | Promise<void>) => {
	const stream = createReadStream(file, { encoding: "utf8" });
	const rl = createInterface({ input: stream, crlfDelay: Infinity });
	for await (const line of rl) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		const value = parseJsonLine(trimmed);
		if (value !== undefined) await onLine(value);
	}
};

const parseMoney = (value: string): number | undefined => {
	const parsed = Number(value.replace(/[$,]/g, "").trim());
	return Number.isFinite(parsed) ? parsed : undefined;
};

const stripTags = (html: string): string =>
	html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const parseModelsDevHtml = (html: string): PriceBook => {
	const prices: PriceBook = {};
	const rowPattern = /<tr\b[^>]*data-search="[^"]*"[^>]*>[\s\S]*?<\/tr>/g;
	for (const rowMatch of html.matchAll(rowPattern)) {
		const row = rowMatch[0];
		const idMatch = row.match(/href="\/models\/([^"]+)"/);
		if (!idMatch) continue;
		const model = idMatch[1];
		const cells = [...row.matchAll(/<td\b[^>]*data-sort="([^"]*)"[^>]*>([\s\S]*?)<\/td>/g)];
		if (cells.length < 3) continue;
		const priceText = stripTags(cells[cells.length - 3][2] ?? "");
		const [inputText, outputText] = priceText.split("/");
		const input = inputText ? parseMoney(inputText) : undefined;
		const output = outputText ? parseMoney(outputText) : undefined;
		if (input === undefined && output === undefined) continue;
		prices[normalizeModelKey(model)] = { input, output };
	}
	return prices;
};

const parsePriceBookJson = (parsed: unknown): PriceBook => {
	if (!isRecord(parsed)) return {};
	const prices: PriceBook = {};
	for (const [model, value] of Object.entries(parsed)) {
		if (!isRecord(value)) continue;
		prices[normalizeModelKey(model)] = {
			input: asOptionalNumber(value.input),
			cachedInput: asOptionalNumber(value.cachedInput),
			output: asOptionalNumber(value.output),
			reasoningOutput: asOptionalNumber(value.reasoningOutput),
		};
	}
	return prices;
};

const loadPriceLookup = async (): Promise<PriceLookup> => {
	try {
		const response = await fetch(MODELS_DEV_URL, { headers: { accept: "text/html, application/json" } });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const body = await response.text();
		const contentType = response.headers.get("content-type") ?? "";
		const prices = contentType.includes("application/json")
			? parsePriceBookJson(JSON.parse(body) as unknown)
			: parseModelsDevHtml(body);
		const count = Object.keys(prices).length;
		if (count === 0) throw new Error("no model prices found");
		return { prices, source: `${MODELS_DEV_URL} (${count} models)` };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { prices: {}, source: MODELS_DEV_URL, warning: `models.dev lookup failed: ${message}` };
	}
};

const findPrice = (prices: PriceBook, model: string): Price | undefined => {
	const normalized = normalizeModelKey(model);
	return prices[normalized] ?? prices[normalized.replace(/^openai\//, "")];
};

const costFromPrice = (usage: Pick<Usage, "input" | "cachedInput" | "output" | "reasoningOutput">, price?: Price): number => {
	if (!price) return 0;
	const inputCost = usage.input * (price.input ?? 0);
	const cachedCost = usage.cachedInput * (price.cachedInput ?? price.input ?? 0);
	const outputCost = usage.output * (price.output ?? 0);
	const reasoningCost = usage.reasoningOutput * (price.reasoningOutput ?? price.output ?? 0);
	return (inputCost + cachedCost + outputCost + reasoningCost) / 1_000_000;
};

const collectPiUsage = async (nowMs: number): Promise<Accumulators> => {
	const acc = emptyAccumulators();
	const files = await walkFiles(PI_SESSION_DIR, ".jsonl");
	await Promise.all(files.map(async (file) => {
		const fileStat = await stat(file).catch(() => undefined);
		if (fileStat && fileStat.mtimeMs < nowMs - 90 * DAY_MS) return;
		const sessionId = relative(PI_SESSION_DIR, file);
		await readJsonLines(file, (value) => {
			if (!isRecord(value) || value.type !== "message" || !isRecord(value.message)) return;
			const message = value.message as PiMessage;
			if (message.role !== "assistant" || !isRecord(message.usage)) return;
			const timestampMs = parseTimestamp(message.timestamp) ?? parseTimestamp(value.timestamp);
			if (timestampMs === undefined) return;
			const usage = message.usage;
			const cost = isRecord(usage.cost) ? asNumber(usage.cost.total) : 0;
			const model = `${String(message.provider ?? "unknown")}/${String(message.model ?? "unknown")}`;
			addToWindows(acc, timestampMs, nowMs, model, {
				input: asNumber(usage.input),
				cachedInput: asNumber(usage.cacheRead),
				output: asNumber(usage.output),
				reasoningOutput: 0,
				total: asNumber(usage.totalTokens),
				cost,
				turns: 1,
			}, sessionId);
		});
	}));
	return acc;
};

const extractCodexLastUsage = (payload: unknown): Omit<Usage, "sessions" | "models"> | undefined => {
	if (!isRecord(payload) || !isRecord(payload.info) || !isRecord(payload.info.last_token_usage)) return undefined;
	const usage = payload.info.last_token_usage;
	const input = asNumber(usage.input_tokens);
	const cachedInput = asNumber(usage.cached_input_tokens);
	const output = asNumber(usage.output_tokens);
	const reasoningOutput = asNumber(usage.reasoning_output_tokens);
	return {
		input,
		cachedInput,
		output,
		reasoningOutput,
		total: asNumber(usage.total_tokens) || input + output,
		cost: 0,
		turns: 1,
	};
};

const collectCodexUsage = async (nowMs: number, prices: PriceBook): Promise<Accumulators> => {
	const acc = emptyAccumulators();
	const files = await walkFiles(CODEX_SESSION_DIR, ".jsonl");
	await Promise.all(files.map(async (file) => {
		const fileStat = await stat(file).catch(() => undefined);
		if (fileStat && fileStat.mtimeMs < nowMs - 90 * DAY_MS) return;
		const sessionId = relative(CODEX_SESSION_DIR, file);
		let currentModel = "openai/unknown";
		await readJsonLines(file, (value) => {
			if (!isRecord(value)) return;
			const event = value as CodexEvent;
			if (event.type === "turn_context" && isRecord(event.payload) && typeof event.payload.model === "string") {
				currentModel = `openai/${event.payload.model}`;
			}
			if (event.type !== "event_msg" || !isRecord(event.payload) || event.payload.type !== "token_count") return;
			const timestampMs = parseTimestamp(event.timestamp);
			if (timestampMs === undefined) return;
			const delta = extractCodexLastUsage(event.payload);
			if (!delta) return;
			delta.cost = costFromPrice(delta, findPrice(prices, currentModel));
			addToWindows(acc, timestampMs, nowMs, currentModel, delta, sessionId);
		});
	}));
	return acc;
};

const collectHermesUsage = async (nowMs: number, prices: PriceBook): Promise<Accumulators> => {
	const acc = emptyAccumulators();
	const cutoffSeconds = Math.floor((nowMs - 90 * DAY_MS) / 1000);
	const sql = `
WITH usage_rows AS (
	SELECT
		u.session_id AS session_id,
		COALESCE(NULLIF(u.model, ''), NULLIF(s.model, ''), 'unknown') AS model,
		COALESCE(NULLIF(u.billing_provider, ''), NULLIF(s.billing_provider, ''), 'unknown') AS billing_provider,
		COALESCE(NULLIF(u.billing_mode, ''), NULLIF(s.billing_mode, ''), '') AS billing_mode,
		COALESCE(u.api_call_count, 0) AS api_call_count,
		COALESCE(u.input_tokens, 0) AS input_tokens,
		COALESCE(u.output_tokens, 0) AS output_tokens,
		COALESCE(u.cache_read_tokens, 0) AS cache_read_tokens,
		COALESCE(u.cache_write_tokens, 0) AS cache_write_tokens,
		COALESCE(u.reasoning_tokens, 0) AS reasoning_tokens,
		COALESCE(u.estimated_cost_usd, 0) AS estimated_cost_usd,
		COALESCE(u.last_seen, u.first_seen, s.ended_at, s.started_at) AS timestamp
	FROM session_model_usage u
	LEFT JOIN sessions s ON s.id = u.session_id
	UNION ALL
	SELECT
		s.id AS session_id,
		COALESCE(NULLIF(s.model, ''), 'unknown') AS model,
		COALESCE(NULLIF(s.billing_provider, ''), 'unknown') AS billing_provider,
		COALESCE(NULLIF(s.billing_mode, ''), '') AS billing_mode,
		COALESCE(s.api_call_count, 0) AS api_call_count,
		COALESCE(s.input_tokens, 0) AS input_tokens,
		COALESCE(s.output_tokens, 0) AS output_tokens,
		COALESCE(s.cache_read_tokens, 0) AS cache_read_tokens,
		COALESCE(s.cache_write_tokens, 0) AS cache_write_tokens,
		COALESCE(s.reasoning_tokens, 0) AS reasoning_tokens,
		COALESCE(s.estimated_cost_usd, 0) AS estimated_cost_usd,
		COALESCE(s.ended_at, s.started_at) AS timestamp
	FROM sessions s
	WHERE NOT EXISTS (SELECT 1 FROM session_model_usage u WHERE u.session_id = s.id)
)
SELECT * FROM usage_rows
WHERE timestamp >= ${cutoffSeconds}
  AND (api_call_count > 0 OR input_tokens > 0 OR output_tokens > 0 OR cache_read_tokens > 0 OR cache_write_tokens > 0 OR reasoning_tokens > 0)
`;
	let rows: HermesUsageRow[] = [];
	try {
		const { stdout } = await execFileAsync("sqlite3", ["-json", HERMES_STATE_DB, sql], { maxBuffer: 10 * 1024 * 1024 });
		const parsed = JSON.parse(stdout || "[]") as unknown;
		if (Array.isArray(parsed)) rows = parsed.filter(isRecord) as HermesUsageRow[];
	} catch {
		return acc;
	}
	for (const row of rows) {
		const timestampSeconds = asNumber(row.timestamp);
		if (!timestampSeconds) continue;
		const provider = String(row.billing_provider ?? "unknown");
		const rawModel = String(row.model ?? "unknown");
		const model = rawModel.includes("/") ? rawModel : `${provider}/${rawModel}`;
		const input = asNumber(row.input_tokens);
		const cachedInput = asNumber(row.cache_read_tokens);
		const output = asNumber(row.output_tokens);
		const reasoningOutput = asNumber(row.reasoning_tokens);
		const delta = {
			input,
			cachedInput,
			output,
			reasoningOutput,
			total: input + cachedInput + output + asNumber(row.cache_write_tokens),
			cost: asNumber(row.estimated_cost_usd),
			turns: asNumber(row.api_call_count) || 1,
		};
		if (!delta.cost) delta.cost = costFromPrice(delta, findPrice(prices, model));
		addToWindows(acc, timestampSeconds * 1000, nowMs, model, delta, String(row.session_id ?? "hermes"));
	}
	return acc;
};

const combineUsage = (left: Usage, right: Usage): Usage => {
	const combined = emptyUsage();
	addUsage(combined, left, "");
	addUsage(combined, right, "");
	combined.sessions = new Set([...left.sessions, ...right.sessions].filter(Boolean));
	for (const [model, usage] of [...left.models, ...right.models]) {
		let existing = combined.models.get(model);
		if (!existing) {
			existing = emptyUsage();
			combined.models.set(model, existing);
		}
		addUsage(existing, usage, "");
		existing.sessions = new Set([...existing.sessions, ...usage.sessions].filter(Boolean));
	}
	return combined;
};

const flatten = (usage: Usage): FlatUsage => ({
	input: usage.input,
	cachedInput: usage.cachedInput,
	output: usage.output,
	reasoningOutput: usage.reasoningOutput,
	total: usage.total,
	cost: usage.cost,
	turns: usage.turns,
	sessions: usage.sessions.size,
	models: [...usage.models.entries()]
		.sort(([, a], [, b]) => b.total - a.total)
		.slice(0, 8)
		.map(([model, modelUsage]) => ({ model, usage: flatten(modelUsage) })),
});

const fmtInt = (value: number): string => Math.round(value).toLocaleString("en-US");
const fmtMoney = (value: number): string => value > 0 ? `$${value.toFixed(4)}` : "n/a";

const renderUsageLine = (window: string, source: string, usage: Usage): string =>
	`| ${window} | ${source} | ${usage.sessions.size} | ${fmtInt(usage.turns)} | ${fmtInt(usage.input)} | ${fmtInt(usage.cachedInput)} | ${fmtInt(usage.output)} | ${fmtInt(usage.reasoningOutput)} | ${fmtInt(usage.total)} | ${fmtMoney(usage.cost)} |`;

const renderTopModels = (usage: Usage): string => {
	const rows = [...usage.models.entries()]
		.sort(([, a], [, b]) => b.total - a.total)
		.slice(0, 5)
		.map(([model, modelUsage]) => `  - ${model}: ${fmtInt(modelUsage.total)} tokens, ${fmtMoney(modelUsage.cost)}`);
	return rows.length > 0 ? rows.join("\n") : "  - none";
};

const buildReport = (piUsage: Accumulators, codexUsage: Accumulators, hermesUsage: Accumulators, generatedAt: Date, priceLookup: PriceLookup): string => {
	const lines = [
		"# Usage Report",
		`Generated: ${generatedAt.toISOString()}`,
		"",
		`Costs are exact for pi sessions when pi stored provider cost data. Hermes token usage is read from ~/.hermes/state.db; Hermes costs use stored estimates when present, otherwise ${priceLookup.source}. Codex costs are estimated from ${priceLookup.source}.`,
		...(priceLookup.warning ? [`Pricing warning: ${priceLookup.warning}`] : []),
		"",
		"| Window | Source | Sessions | Turns | Input | Cached input | Output | Reasoning output | Total | Cost |",
		"|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|",
	];

	for (const days of WINDOWS) {
		const total = combineUsage(combineUsage(piUsage[days], codexUsage[days]), hermesUsage[days]);
		lines.push(renderUsageLine(`${days}d`, "total", total));
		lines.push(renderUsageLine(`${days}d`, "pi", piUsage[days]));
		lines.push(renderUsageLine(`${days}d`, "codex", codexUsage[days]));
		lines.push(renderUsageLine(`${days}d`, "hermes", hermesUsage[days]));
	}

	lines.push("", "## Top Models", "");
	for (const days of WINDOWS) {
		lines.push(`### ${days} days`, renderTopModels(combineUsage(combineUsage(piUsage[days], codexUsage[days]), hermesUsage[days])), "");
	}

	lines.push(
		"## Pricing Lookup Instructions",
		"",
		"`/usage` fetches the live model table from `https://models.dev` and reads the `Price` column for each model id, e.g. `openai/gpt-5.5`. Prices are interpreted as USD per 1M input/output tokens.",
		"",
		"Cached input and reasoning output are not always broken out by models.dev. When no separate cached-input price is published, `/usage` prices cached input at the normal input rate; when no separate reasoning-output price is published, it prices reasoning output at the normal output rate.",
		"",
		"If a Codex or Hermes model id is absent from models.dev and no stored nonzero provider cost exists, that cost remains `n/a`.",
	);

	return lines.join("\n");
};

export default function (pi: ExtensionAPI) {
	pi.registerCommand("usage", {
		description: "Show pi, Codex, and Hermes token usage and cost reports for 1/7/30/90 days",
		handler: async (_args, ctx) => {
			if (ctx.hasUI) ctx.ui.notify("Building usage report...", "info");
			const now = new Date();
			const priceLookup = await loadPriceLookup();
			const [piUsage, codexUsage, hermesUsage] = await Promise.all([
				collectPiUsage(now.getTime()),
				collectCodexUsage(now.getTime(), priceLookup.prices),
				collectHermesUsage(now.getTime(), priceLookup.prices),
			]);
			const report = buildReport(piUsage, codexUsage, hermesUsage, now, priceLookup);
			pi.sendMessage({
				customType: "usage-report",
				content: report,
				display: true,
				details: {
					priceSource: priceLookup.source,
					priceWarning: priceLookup.warning,
					pi: Object.fromEntries(WINDOWS.map((days) => [days, flatten(piUsage[days])])),
					codex: Object.fromEntries(WINDOWS.map((days) => [days, flatten(codexUsage[days])])),
					hermes: Object.fromEntries(WINDOWS.map((days) => [days, flatten(hermesUsage[days])])),
				},
			});
		},
	});
}
