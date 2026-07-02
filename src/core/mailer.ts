import nodemailer, { type Transporter } from "nodemailer";
import { APP_NAME } from "./config/email";

let cachedTransport: Transporter | null = null;

async function buildTransport(): Promise<Transporter> {
  const host = process.env.MAIL_HOST;
  const port = parseInt(process.env.MAIL_PORT || "587", 10);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASSWORD;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  console.warn("[mailer] MAIL_HOST not set — using Ethereal Email fallback.");
  const testAccount = await nodemailer.createTestAccount();

  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

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
  if (!cachedTransport) cachedTransport = await buildTransport();

  const mailFromAddress = process.env.MAIL_FROM ?? "noreply@healthypaws.com";
  const from = `"${APP_NAME}" <${mailFromAddress}>`;

  const info = await cachedTransport.sendMail({
    from,
    to: [params.to],
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  if (!process.env.MAIL_HOST) {
    console.log(`💌 Email sent for testing to: ${params.to}`);
    console.log(`👀 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }
}
