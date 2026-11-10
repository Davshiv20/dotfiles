import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("clear", {
    description: "Start a fresh empty session with no prior model context",
    handler: async (_args, ctx) => {
      await ctx.waitForIdle();

      const result = await ctx.newSession({
        withSession: async (freshCtx) => {
          freshCtx.ui.setEditorText("");
          freshCtx.ui.notify("Context cleared. Fresh session started.", "info");
        },
      });

      if (result.cancelled) {
        ctx.ui.notify("Clear cancelled.", "info");
      }
    },
  });
}
