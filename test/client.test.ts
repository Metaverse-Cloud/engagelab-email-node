import assert from "node:assert/strict";
import test from "node:test";
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
    fetchImpl
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
  const client = new EngageLabEmailClient({ apiUser: "u", apiKey: "k", fetchImpl });

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
