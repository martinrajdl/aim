import "server-only";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { normalizeBrief, metadata, type BriefKey } from "../brief";
export async function getBrief(key: BriefKey) {
  const raw = await readFile(
    join(process.cwd(), "data", metadata[key].file),
    "utf8",
  );
  return normalizeBrief(
    key,
    JSON.parse(raw),
    createHash("sha256").update(raw).digest("hex").slice(0, 16),
  );
}
