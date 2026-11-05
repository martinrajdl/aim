import space from "../data/brief-space-launch.json";
import enterprise from "../data/brief-enterprise-ai.json";
import czsk from "../data/brief-cz-sk-ai.json";
import { normalizeBrief } from "../lib/brief";
export const raw = { space, enterprise, czsk };
export const briefs = [
  normalizeBrief("space", space, "test-space"),
  normalizeBrief("enterprise", enterprise, "test-enterprise"),
  normalizeBrief("czsk", czsk, "test-czsk"),
];
