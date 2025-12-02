import nodemailer from 'nodemailer';

// Check if SMTP is configured
const isSmtpConfigured = () => {
  // Get raw values and trim whitespace
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();

  const hasHost = !!host && host.length > 0;
  const hasUser = !!user && user.length > 0;
  const hasPassword = !!password && password.length > 0;

  if (!hasHost || !hasUser || !hasPassword) {
    console.log('📧 SMTP Configuration: ❌ Missing required variables');
    console.log(`  SMTP_HOST: ${hasHost ? '✅ Set' : '❌ Missing'}`);
    console.log(`  SMTP_USER: ${hasUser ? '✅ Set' : '❌ Missing'}`);
    console.log(`  SMTP_PASSWORD: ${hasPassword ? '✅ Set' : '❌ Missing'}`);
    console.log('  → Emails will be logged to console (development mode)\n');
    return false;
  }

  console.log('📧 SMTP Configuration: ✅ All required variables are set');
  console.log(`  Host: ${host}`);
  console.log(`  Port: ${process.env.SMTP_PORT || '587'}`);
  console.log(`  User: ${user}\n`);
  return true;
};

// Create transporter (using environment variables or console logging for development)
const createTransporter = () => {
  // Get and trim values
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();

  if (!host || !user || !password) {
    // Return null to indicate we should log to console instead
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: host,
    port: parseInt(process.env.SMTP_PORT?.trim() || '587'),
    secure: process.env.SMTP_SECURE?.trim() === 'true',
    auth: {
      user: user,
      pass: password,
    },
  });

  return transporter;
};

// Lazy-load transporter - only create it when first needed
// This ensures environment variables are loaded before checking SMTP configuration
let transporter: ReturnType<typeof createTransporter> | null = null;

const getTransporter = () => {
  if (transporter === null) {
    transporter = createTransporter();
    // Log SMTP status on first access
    if (transporter) {
      console.log('📧 Email Service: SMTP configured and ready');
    } else {
      console.log(
        '📧 Email Service: Running in development mode (emails logged to console)'
      );
    }
  }
  return transporter;
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export interface SendAdminPromotionEmailParams {
  email: string;
  hasAccount: boolean;
  invitationToken?: string;
}

export const sendAdminPromotionEmail = async ({
  email,
  hasAccount,
  invitationToken,
}: SendAdminPromotionEmailParams): Promise<void> => {
  const fromEmail = process.env.SMTP_FROM || 'noreply@turtleproject.com';

  if (hasAccount) {
    // User already has an account - just notify them
    const mailOptions = {
      from: fromEmail,
      to: email,
      subject: 'You have been promoted to Admin',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Admin Promotion</h2>
          <p>Hello,</p>
          <p>You have been promoted to <strong>Admin</strong> in the Turtle Project.</p>
          <p>You now have access to admin features and can manage the system.</p>
          <p>You can log in with your existing account to access the admin panel.</p>
          <p>Best regards,<br>The Turtle Project Team</p>
        </div>
      `,
      text: `
Hello,

You have been promoted to Admin in the Turtle Project.

You now have access to admin features and can manage the system.

You can log in with your existing account to access the admin panel.

Best regards,
The Turtle Project Team
      `,
    };

    const emailTransporter = getTransporter();
    if (!emailTransporter) {
      // Development mode: log email to console
      console.log('\n📧 ===== ADMIN PROMOTION EMAIL (DEVELOPMENT MODE) =====');
      console.log(`To: ${email}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('\n--- Email Content ---');
      console.log(mailOptions.text);
      console.log('\n==================================================\n');
      return;
    }

    try {
      console.log(`📤 Attempting to send email to ${email}...`);
      const info = await emailTransporter.sendMail(mailOptions);
      console.log(`✅ Admin promotion email sent successfully!`);
      console.log(`   Message ID: ${info.messageId}`);
    } catch (error: any) {
      console.error('❌ Error sending admin promotion email:');
      console.error(`   Error: ${error.message}`);
      if (error.code) {
        console.error(`   Code: ${error.code}`);
      }
      if (error.response) {
        console.error(`   Response: ${error.response}`);
      }
      // Don't throw - email sending failure shouldn't break the promotion
    }
  } else {
    // User doesn't have an account - send invitation with registration link
    if (!invitationToken) {
      throw new Error('Invitation token is required for new users');
    }

    const registrationUrl = `${FRONTEND_URL}/register?token=${invitationToken}`;

    const mailOptions = {
      from: fromEmail,
      to: email,
      subject: 'You have been invited to join as Admin',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Admin Invitation</h2>
          <p>Hello,</p>
          <p>You have been invited to join the Turtle Project as an <strong>Admin</strong>.</p>
          <p>To complete your registration and activate your admin account, please click the link below:</p>
          <p style="margin: 30px 0;">
            <a href="${registrationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Complete Registration
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${registrationUrl}</p>
          <p>This invitation link will expire in 7 days.</p>
          <p>Best regards,<br>The Turtle Project Team</p>
        </div>
      `,
      text: `
Hello,

You have been invited to join the Turtle Project as an Admin.

To complete your registration and activate your admin account, please visit:

${registrationUrl}

This invitation link will expire in 7 days.

Best regards,
The Turtle Project Team
      `,
    };

    const emailTransporter = getTransporter();
    if (!emailTransporter) {
      // Development mode: log email to console
      console.log('\n📧 ===== ADMIN INVITATION EMAIL (DEVELOPMENT MODE) =====');
      console.log(`To: ${email}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('\n--- Email Content ---');
      console.log(mailOptions.text);
      console.log(`\n--- Registration Link ---`);
      console.log(registrationUrl);
      console.log('\n==================================================\n');
      return;
    }

    try {
      console.log(`📤 Attempting to send invitation email to ${email}...`);
      const info = await emailTransporter.sendMail(mailOptions);
      console.log(`✅ Admin invitation email sent successfully!`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Registration Link: ${registrationUrl}`);
    } catch (error: any) {
      console.error('❌ Error sending admin invitation email:');
      console.error(`   Error: ${error.message}`);
      if (error.code) {
        console.error(`   Code: ${error.code}`);
      }
      if (error.response) {
        console.error(`   Response: ${error.response}`);
      }
      // Don't throw - email sending failure shouldn't break the invitation
    }
  }
};
