// Runnable check: node lib/api-client.check.ts
// Fakes the backend with a custom axios adapter to prove the 401 → refresh → retry flow.
import assert from "node:assert/strict";
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { ApiError, apiGet, http, onSessionExpired } from "./api-client.ts";

let refreshCalls = 0;
let refreshOk = true;
let sessionValid = false;
let expiredCalls = 0;
onSessionExpired(() => expiredCalls++);

const reply = (config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse => {
  const res = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse;
  if (status >= 400) throw new AxiosError("fail", String(status), config, null, res);
  return res;
};

http.defaults.adapter = async (config) => {
  await new Promise((r) => setTimeout(r, 5));
  if (config.url === "/auth/refresh") {
    refreshCalls++;
    if (!refreshOk) return reply(config, 401, { statusCode: 401, errorCode: "REFRESH_INVALID", message: "Sesi habis" });
    sessionValid = true;
    return reply(config, 200, { data: null });
  }
  if (config.url === "/boom") return reply(config, 422, { statusCode: 422, errorCode: "VALIDATION", message: "Tidak valid", details: { email: ["wajib"] } });
  if (!sessionValid) return reply(config, 401, { statusCode: 401, errorCode: "UNAUTHORIZED", message: "Login dulu" });
  return reply(config, 200, { data: { url: config.url } });
};

// Three parallel 401s share ONE refresh, then all retry and succeed.
const results = await Promise.all([apiGet<{ url: string }>("/a"), apiGet<{ url: string }>("/b"), apiGet<{ url: string }>("/c")]);
assert.deepEqual(results.map((r) => r.url), ["/a", "/b", "/c"]);
assert.equal(refreshCalls, 1);
assert.equal(expiredCalls, 0);

// Backend error bodies become ApiError with code + field details.
await assert.rejects(apiGet("/boom"), (e: unknown) => {
  assert.ok(e instanceof ApiError);
  assert.equal(e.status, 422);
  assert.equal(e.code, "VALIDATION");
  assert.deepEqual(e.details, { email: ["wajib"] });
  return true;
});

// Refresh failing → session-expired handler fires once, caller gets the original 401.
sessionValid = false;
refreshOk = false;
await assert.rejects(apiGet("/d"), (e: unknown) => e instanceof ApiError && e.status === 401 && e.code === "UNAUTHORIZED");
assert.equal(expiredCalls, 1);
assert.equal(refreshCalls, 2);

console.log("api-client: ok");
