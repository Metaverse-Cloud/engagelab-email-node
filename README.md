# engagelab-email

[![npm](https://img.shields.io/npm/v/engagelab-email)](https://www.npmjs.com/package/engagelab-email)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)

> Official EngageLab Email Node.js SDK.

Node.js SDK for EngageLab Email sending APIs — transactional email from applications and AI agent backends.

Supported sending APIs:

- Normal email: `POST /v1/mail/send`
- Template email: `POST /v1/mail/sendtemplate`
- Calendar email: `POST /v1/mail/sendcalendar`
- MIME email: `POST /v1/mail/send_mime`

Default base URLs:

- Singapore: `https://email.api.engagelab.cc`
- Turkey: `https://emailapi-tr.engagelab.com`

## Install

```bash
npm install engagelab-email
```

## Local Development

```bash
npm install
npm test
```

## Normal Email

```js
import { EngageLabEmailClient } from "engagelab-email";

const client = new EngageLabEmailClient({
  apiUser: process.env.ENGAGELAB_API_USER,
  apiKey: process.env.ENGAGELAB_API_KEY
});

const result = await client.send({
  from: "EngageLab Team <support@mail.engagelab.com>",
  to: ["user@example.com"],
  body: {
    subject: "Welcome",
    content: {
      html: "<p>Hello from EngageLab</p>",
      text: "Hello from EngageLab"
    }
  }
});

console.log(result);
```

## Template Email

```js
await client.sendTemplate({
  from: "support@mail.engagelab.com",
  to: ["user@example.com"],
  body: {
    template_invoke_name: "month_bill",
    subject: "Monthly Bill",
    vars: {
      "%name%": ["Jack"],
      "%money%": ["30"]
    }
  }
});
```

## Calendar Email

```js
await client.sendCalendar({
  from: "EngageLab Team <support@mail.engagelab.com>",
  to: ["user@example.com"],
  body: {
    subject: "Meeting",
    content: {
      html: "<p>Please join the meeting.</p>"
    },
    calendar: {
      time_zone_id: "Asia/Shanghai",
      start_time: "2026-06-10 10:00:00",
      end_time: "2026-06-10 11:00:00",
      title: "Project Meeting",
      organizer: {
        name: "EngageLab",
        email: "support@mail.engagelab.com"
      },
      location: "Online"
    }
  }
});
```

## MIME Email

```js
await client.sendMime({
  from: "EngageLab Team <support@mail.engagelab.com>",
  to: ["user@example.com"],
  body: {
    subject: "Raw MIME",
    content: {
      raw_message: "From: test@example.com\r\nTo: user@example.com\r\nSubject: Raw MIME\r\n\r\nHello"
    }
  }
});
```

## Turkey Data Center

```js
import { EngageLabEmailClient, TURKEY_BASE_URL } from "engagelab-email";

const client = new EngageLabEmailClient({
  apiUser: process.env.ENGAGELAB_API_USER,
  apiKey: process.env.ENGAGELAB_API_KEY,
  baseUrl: TURKEY_BASE_URL
});
```

## Error Handling

```js
import { EngageLabEmailError } from "engagelab-email";

try {
  await client.send({ body: {} });
} catch (error) {
  if (error instanceof EngageLabEmailError) {
    console.error(error.status, error.code, error.response);
  }
}
```

The SDK accepts request payloads in the same shape as EngageLab's REST API.

## Anonymous Usage Metrics

The SDK adds an anonymous installation ID to API request headers so EngageLab can measure distinct SDK installations. The ID is stored locally under `~/.config/engagelab-email/telemetry.json`; no API keys, email content, or recipients are collected. The first successful API request also carries `X-EngageLab-SDK-Init: 1`.

To disable these headers:

```bash
ENGAGELAB_EMAIL_TELEMETRY_DISABLED=1 node app.js
```


## Related tools

- CLI [`@engagelabemail/cli`](https://github.com/Metaverse-Cloud/engagelab-email-cli) — mailbox workflows from the command line
- MCP server [`@engagelabemail/mcp`](https://github.com/Metaverse-Cloud/engagelab-email-mcp) — for Claude Desktop, Claude Code, Cursor and other MCP clients
