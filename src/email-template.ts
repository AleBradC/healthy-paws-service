import { APP_NAME, PASSWORD_RESET_EXPIRES_MINUTES } from "./core/config/email";

interface ResetEmailTemplateParams {
  code: string;
}

export const getResetEmailSubject = ({
  code,
}: ResetEmailTemplateParams): string =>
  `Your Verification Code: ${code} - ${APP_NAME}`;

export const getResetEmailText = ({ code }: ResetEmailTemplateParams): string =>
  `Your ${APP_NAME} reset code is: ${code}. It will expire in ${PASSWORD_RESET_EXPIRES_MINUTES} minutes.`;

export const getResetEmailHtml = ({
  code,
}: ResetEmailTemplateParams): string => `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { background-color: #4CAF50; padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0; }
        .content { padding: 30px 20px; text-align: center; }
        .code-box { background-color: #f4f4f4; border: 1px dashed #4CAF50; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; display: inline-block; }
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
          <p>Your verification code is:</p>
          
          <div class="code-box">${code}</div>
          
          <p>This code will expire in ${PASSWORD_RESET_EXPIRES_MINUTES} minutes.</p>
        </div>
        <div class="footer">
          <p>Sent from <strong>${APP_NAME}</strong></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
  </html>
`;
