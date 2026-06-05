import { APP_NAME } from "./core/config/email";

export interface ResetEmailTemplateParams {
  resetUrl: string;
  expiresInMinutes: number;
}

export const getResetEmailSubject = (): string =>
  `Reset your ${APP_NAME} password`;

export const getResetEmailText = ({
  resetUrl,
  expiresInMinutes,
}: ResetEmailTemplateParams): string =>
  `We received a request to reset your ${APP_NAME} password.

Click the link below to choose a new password. It will expire in ${expiresInMinutes} minutes.

${resetUrl}

If you didn't request this, you can safely ignore this email.`;

export const getResetEmailHtml = ({
  resetUrl,
  expiresInMinutes,
}: ResetEmailTemplateParams): string => `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { background-color: #4CAF50; padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0; }
        .content { padding: 30px 20px; text-align: center; }
        .cta-button { display: inline-block; background-color: #4CAF50; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 20px 0; }
        .fallback-url { word-break: break-all; background-color: #f4f4f4; border: 1px dashed #4CAF50; padding: 12px; font-size: 13px; color: #333; margin-top: 10px; }
        .footer { font-size: 12px; color: #888; text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${APP_NAME}</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset your password.</p>
          <p>Click the button below to choose a new password. This link expires in ${expiresInMinutes} minutes.</p>

          <a href="${resetUrl}" class="cta-button">Reset Password</a>

          <p style="margin-top:30px;font-size:14px;color:#555;">If the button doesn't work, copy and paste this URL into your browser:</p>
          <div class="fallback-url">${resetUrl}</div>
        </div>
        <div class="footer">
          <p>Sent from <strong>${APP_NAME}</strong></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
  </html>
`;

