import type { CustomMessageTriggerHandler } from 'aws-lambda';

const appLinkBase = 'barberapp://login';

export const handler: CustomMessageTriggerHandler = async (event) => {
  if (event.triggerSource !== 'CustomMessage_AdminCreateUser') {
    return event;
  }

  const email = event.request.userAttributes?.email ?? '';
  const username = event.request.usernameParameter ?? '{username}';
  const temporaryPassword = event.request.codeParameter ?? '{####}';
  const signInIdentifier = email || username;
  const loginLink = `${appLinkBase}?email=${encodeURIComponent(signInIdentifier)}&password=${encodeURIComponent(temporaryPassword)}`;

  event.response.emailSubject = 'Your White Beard account is ready';
  event.response.emailMessage = `
    <html>
      <body style="font-family: Arial, sans-serif; background: #f8f4ec; color: #111827; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 24px; border: 1px solid #e5d6c3;">
          <p style="font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #c2410c;">White Beard invitation</p>
          <h1 style="margin: 8px 0 12px; font-size: 28px;">Welcome to the team</h1>
          <p style="line-height: 1.6; color: #475569;">A White Beard admin created your barber account. Open the app using the button below and your login form will be filled automatically.</p>
          <p style="margin: 20px 0;">
            <a href="${loginLink}" style="display: inline-block; background: #111827; color: #f8fafc; text-decoration: none; padding: 14px 20px; border-radius: 14px; font-weight: 700;">Open White Beard</a>
          </p>
          <p style="margin: 0 0 8px; font-weight: 700;">Email</p>
          <p style="margin: 0 0 14px; color: #0f172a;">${signInIdentifier}</p>
          <p style="margin: 0 0 8px; font-weight: 700;">Internal username</p>
          <p style="margin: 0 0 14px; color: #0f172a;">${username}</p>
          <p style="margin: 0 0 8px; font-weight: 700;">Temporary password</p>
          <p style="margin: 0 0 14px; color: #0f172a;">${temporaryPassword}</p>
          <p style="margin: 0; color: #64748b; line-height: 1.6;">Only barber accounts are invited by email. Admin accounts are created manually in Cognito. You will be asked to choose a new password the first time you log in.</p>
        </div>
      </body>
    </html>
  `;

  return event;
};