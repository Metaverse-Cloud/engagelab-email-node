# engagelab-email

Node.js SDK for EngageLab Email sending APIs.

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
