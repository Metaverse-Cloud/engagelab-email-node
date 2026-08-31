import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EngageLabEmailClient, EngageLabEmailError } from "../src/index.js";
import type { EngageLabEmailPayload, FetchLike } from "../src/index.js";

interface FetchCall {
  url: string;
  options: RequestInit & {
    body: string;
    headers: Record<string, string>;
    method: string;
  };
}

test("send posts JSON payload with Basic auth", async () => {
  const calls: FetchCall[] = [];
  const fetchImpl: FetchLike = async (url, options) => {
    calls.push({
      url,
      options: options as FetchCall["options"]
    });
    return new Response(JSON.stringify({ email_ids: ["email-id"], request_id: "req-1" }), { status: 200 });
  };

  const client = new EngageLabEmailClient({
    apiUser: "api_user",
    apiKey: "api_key",
    fetchImpl,
    telemetry: { disabled: true }
  });
  const payload: EngageLabEmailPayload = {
    from: "EngageLab Team <support@mail.engagelab.com>",
    to: ["user@example.com"],
    body: {
      subject: "Hello",
      content: {
        html: "<p>Hello</p>"
      }
    }
  };

  const result = await client.send(payload);

  assert.deepEqual(result, { email_ids: ["email-id"], request_id: "req-1" });
  assert.equal(calls[0]?.url, "https://email.api.engagelab.cc/v1/mail/send");
  assert.equal(calls[0]?.options.method, "POST");
  assert.equal(calls[0]?.options.headers.Authorization, "Basic YXBpX3VzZXI6YXBpX2tleQ==");
  assert.equal(calls[0]?.options.headers["Content-Type"], "application/json; charset=utf-8");
  assert.equal(calls[0]?.options.headers["X-EngageLab-SDK-Name"], "engagelab-email-node");
  assert.ok(typeof calls[0]?.options.headers["X-EngageLab-SDK-Version"] === "string");
  assert.ok(calls[0]?.options.headers["X-EngageLab-Request-ID"]?.startsWith("req_"));
  assert.deepEqual(JSON.parse(calls[0]?.options.body ?? ""), payload);
});

test("throws EngageLabEmailError for non-2xx responses", async () => {
  const fetchImpl: FetchLike = async () => new Response(
    JSON.stringify({ code: 30801, message: "From can not be empty" }),
    {
      status: 400,
      statusText: "Bad Request"
    }
  );
  const client = new EngageLabEmailClient({ apiUser: "u", apiKey: "k", fetchImpl, telemetry: { disabled: true } });

  await assert.rejects(
    () => client.send({ body: {} }),
    (error: unknown) => {
      assert.ok(error instanceof EngageLabEmailError);
      assert.equal(error.status, 400);
      assert.equal(error.code, 30801);
      assert.equal(error.message, "From can not be empty");
      return true;
    }
  );
});

test("adds a stable anonymous device ID and marks only the first successful request", async () => {
  const dir = await mkdtemp(join(tmpdir(), "engagelab-email-node-telemetry-"));
  const storagePath = join(dir, "telemetry.json");
  const calls: FetchCall[] = [];
  const fetchImpl: FetchLike = async (url, options) => {
    calls.push({ url, options: options as FetchCall["options"] });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    const firstClient = new EngageLabEmailClient({
      apiUser: "u",
      apiKey: "k",
      fetchImpl,
      telemetry: { storagePath }
    });
    await firstClient.send({ body: {} });

    const firstDeviceId = calls[0]?.options.headers["X-EngageLab-SDK-Device-ID"];
    assert.match(firstDeviceId ?? "", /^[0-9a-f-]{36}$/);
    assert.equal(calls[0]?.options.headers["X-EngageLab-SDK-Init"], "1");

    const secondClient = new EngageLabEmailClient({
      apiUser: "u",
      apiKey: "k",
      fetchImpl,
      telemetry: { storagePath }
    });
    await secondClient.send({ body: {} });

    assert.equal(calls[1]?.options.headers["X-EngageLab-SDK-Device-ID"], firstDeviceId);
    assert.equal(calls[1]?.options.headers["X-EngageLab-SDK-Init"], undefined);
    const state = JSON.parse(await readFile(storagePath, "utf8"));
    assert.equal(state.deviceId, firstDeviceId);
    assert.equal(typeof state.initializedAt, "string");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
