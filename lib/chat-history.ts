import { z } from "zod";
import { keySchema } from "./brief";

const messageSchema = z
  .object({
    scope: keySchema.optional(),
    request: z.string().max(1500),
    response: z.string(),
    kind: z.enum(["success", "info", "error"]),
  })
  .strict();
const historySchema = z
  .object({
    version: z.literal(1),
    messages: z.array(messageSchema),
  })
  .strict();

export type ChatMessage = z.infer<typeof messageSchema>;
export const chatHistoryStorageKey = "aim:personalization-chat:1";

export function loadChatHistory(
  storage: Pick<Storage, "getItem">,
): ChatMessage[] {
  const saved = storage.getItem(chatHistoryStorageKey);
  return saved ? historySchema.parse(JSON.parse(saved)).messages : [];
}

export function saveChatHistory(
  messages: ChatMessage[],
  storage: Pick<Storage, "setItem">,
) {
  storage.setItem(
    chatHistoryStorageKey,
    JSON.stringify(historySchema.parse({ version: 1, messages })),
  );
}
