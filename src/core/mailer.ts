import nodemailer, { type Transporter } from "nodemailer";
import { APP_NAME } from "./config/email";

// Single shared mail transport. Auto-selects between two modes at runtime:
//
//   1. RESEND_API_KEY set  -> real Resend SMTP transport.
//      The free sandbox sender `onboarding@resend.dev` works on day 1 with
//      no DNS work. Verify your own domain in the Resend dashboard later
//      (publish their four DNS records) and set MAIL_FROM=you@yourdomain.com
//      to send from your own address.
//
//   2. RESEND_API_KEY unset -> streamTransport "log to stdout" fallback.
//      The full rendered MIME is printed to the backend logs so a developer
//      can click the verification / reset link without signing up for any
//      external provider. NEVER use this mode in production.
//
// The transport is constructed lazily on first send so that importing this
// module is a side-effect-free operation (important for tests).

let cachedTransport: Transporter | null = null;

function buildTransport(): Transporter {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: { user: "resend", pass: apiKey },
    });
  }

  console.warn(
    "[mailer] RESEND_API_KEY not set — using stdout fallback. " +
      "Emails will appear in this process's logs instead of being delivered. " +
      "Set RESEND_API_KEY in .env to enable real delivery."
  );

  // streamTransport returns the rendered RFC-822 message as `info.message`.
  // jsonTransport would lose the embedded URLs we need to copy from logs.
  return nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true,
  });
}

// Exported for tests that want to force a rebuild after mutating process.env.
export function __resetMailerForTests(): void {
  cachedTransport = null;
}

export interface SendMailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(params: SendMailParams): Promise<void> {
  if (!cachedTransport) cachedTransport = buildTransport();

  const mailFromAddress = process.env.MAIL_FROM ?? "onboarding@resend.dev";
  const from = `"${APP_NAME}" <${mailFromAddress}>`;

  const info = await cachedTransport.sendMail({
    from,
    to: [params.to],
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  // Dev mode (streamTransport): dump the rendered message so the developer
  // can grab the verification URL from the log. In production (real SMTP)
  // `info.message` is undefined and this block is a no-op.
  const message = (info as { message?: Buffer | string }).message;
  if (message) {
    const raw =
      message instanceof Buffer ? message.toString("utf8") : String(message);
    console.log(
      `[mailer:dev] to=${params.to} subject=${JSON.stringify(params.subject)}`
    );
    console.log(raw);
  }
}
