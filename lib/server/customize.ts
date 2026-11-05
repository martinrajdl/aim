import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { generateText, Output } from "ai";
import { createAzure } from "@ai-sdk/azure";
import {
  type CustomizationRequest,
  outcomeSchema,
  sourceCatalog,
  validateOutcome,
} from "../customization";
import { defaultView } from "../view-config";
import type { Brief } from "../brief";
export async function customize(
  input: CustomizationRequest,
  briefs: Brief[],
  signal: AbortSignal,
) {
  const azure = createAzure({
    resourceName:
      process.env.AZURE_OPENAI_RESOURCE_NAME || "aim-australia-east",
    apiKey: process.env.AZURE_OPENAI_API_KEY,
  });
  const system = await readFile(
    join(process.cwd(), "prompts/configure-brief.md"),
    "utf8",
  );
  const { output } = await generateText({
    model: azure.chat(
      process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5-mini-hiring",
    ),
    system,
    prompt: JSON.stringify({
      DEFAULT_CONFIG: defaultView,
      CURRENT_CONFIG: input.config,
      SOURCE_CATALOG: briefs.map(sourceCatalog),
      USER_REQUEST: input.request,
      PENDING_CLARIFICATION: input.clarification || null,
    }),
    output: Output.object({ schema: outcomeSchema }),
    abortSignal: signal,
    maxRetries: 0,
    maxOutputTokens: 6000,
    providerOptions: { azure: { reasoningEffort: "low" } },
  });
  return validateOutcome(output, briefs);
}
