import * as z from "zod";

export const metaEnvSchema = z.object({
  META_PIXEL_ID: z.string().default(""),
  META_CAPI_ACCESS_TOKEN: z.string().default(""),
  META_GRAPH_VERSION: z.string().default("v23.0"),
  META_TEST_EVENT_CODE: z.string().default(""),
});
