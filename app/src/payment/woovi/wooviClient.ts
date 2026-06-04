import axios from "axios";
import { env } from "wasp/server";

const isSandbox = env.WOOVI_SANDBOX === "true";
const baseURL = isSandbox
  ? "https://api.woovi-sandbox.com/api/v1"
  : "https://api.woovi.com/api/v1";

export const wooviClient = axios.create({
  baseURL,
  headers: {
    Authorization: env.WOOVI_APP_ID,
    "Content-Type": "application/json",
  },
});
