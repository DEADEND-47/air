import nodemailer from 'nodemailer';
import { loadConfig } from '../config.js';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface IEmailService {
  sendOtp(email: string, otp: string, purpose: 'verify_email' | 'login_otp' | 'two_factor'): Promise<void>;
  sendPasswordReset(email: string, resetUrl: string, name: string): Promise<void>;
  sendWelcome(email: string, name: string): Promise<void>;
  sendAdvisory(email: string, advisory: { ward: string; message: string; severity: string; audience: string[] }): Promise<void>;
  sendAlert(email: string, alert: { ward: string; title: string; description: string; severity: string }): Promise<void>;
}

export class NodemailerEmailService implements IEmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor() {
    const config = loadConfig();
    this.from = config.EMAIL_FROM;

    if (config.SMTP_HOST && config.SMTP_PORT) {
      console.info(`📬 Configuring SMTP transporter for ${config.SMTP_HOST}:${config.SMTP_PORT}`);
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: config.SMTP_USER && config.SMTP_PASSWORD ? {
          user: config.SMTP_USER,
          pass: config.SMTP_PASSWORD,
        } : undefined,
      });
    } else {
      console.warn('⚠️ SMTP settings not configured. Email service will run in Console/Mock mode.');
    }
  }

  private async send(msg: EmailMessage): Promise<void> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.from,
          to: msg.to,
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
        });
        console.info(`✉️ Email successfully sent to ${msg.to}: "${msg.subject}"`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${msg.to}:`, error);
        this.logToConsole(msg);
      }
    } else {
      this.logToConsole(msg);
    }
  }

  private logToConsole(msg: EmailMessage): void {
    const border = '═'.repeat(60);
    console.log(`\n📧 [EMAIL STUB] ${border}`);
    console.log(`  FROM:    ${this.from}`);
    console.log(`  TO:      ${msg.to}`);
    console.log(`  SUBJECT: ${msg.subject}`);
    if (msg.html) {
      console.log(`  HTML BODY:\n${msg.html}`);
    } else {
      console.log(`  TEXT BODY:\n${msg.text}`);
    }
    console.log(`${border}\n`);
  }

  private baseHtml(title: string, bodyContent: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #0d1117;
            color: #c9d1d9;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #161b22;
            border: 1px solid #30363d;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          }
          .header {
            background: linear-gradient(135deg, #1f6feb 0%, #1152a3 100%);
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 1px;
          }
          .content {
            padding: 40px 30px;
            line-height: 1.6;
            font-size: 16px;
          }
          .footer {
            background-color: #0f141c;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #8b949e;
            border-top: 1px solid #30363d;
          }
          .button {
            display: inline-block;
            background-color: #238636;
            color: #ffffff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
          }
          .button:hover {
            background-color: #2ea043;
          }
          .otp-code {
            font-size: 32px;
            font-weight: 800;
            letter-spacing: 6px;
            color: #58a6ff;
            background-color: #0d1117;
            padding: 15px 30px;
            border-radius: 8px;
            display: inline-block;
            margin: 20px 0;
            border: 1px dashed #30363d;
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 700;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .badge-critical { background-color: #da3633; color: #ffffff; }
          .badge-warning { background-color: #d29922; color: #000000; }
          .badge-info { background-color: #58a6ff; color: #ffffff; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AirIQ Command Center</h1>
          </div>
          <div class="content">
            ${bodyContent}
          </div>
          <div class="footer">
            <p>This is an automated dispatch from the AirIQ Smart City Platform.</p>
            <p>&copy; 2026 AirIQ Intelligent Systems. All Rights Reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendOtp(email: string, otp: string, purpose: 'verify_email' | 'login_otp' | 'two_factor'): Promise<void> {
    const subjects: Record<string, string> = {
      verify_email: 'Verify your AirIQ account',
      login_otp:   'Your AirIQ login code',
      two_factor:  'Your AirIQ two-factor verification code',
    };
    const actions: Record<string, string> = {
      verify_email: 'verify your email address and activate your account',
      login_otp:   'access your operator console session',
      two_factor:  'complete secure two-factor authentication',
    };
    const subject = subjects[purpose] ?? 'AirIQ One-Time Verification Code';
    const action = actions[purpose] ?? 'continue signing in';

    const text = `Hello,\n\nYour code to ${action} is: ${otp}\n\nThis code expires in 10 minutes.\n\n— The AirIQ Team`;
    const html = this.baseHtml(subject, `
      <p>Hello,</p>
      <p>You requested a one-time verification code to <strong>${action}</strong>.</p>
      <div style="text-align: center;">
        <span class="otp-code">${otp}</span>
      </div>
      <p>This code is valid for <strong>10 minutes</strong>. Do not disclose this code to anyone. System administrators will never ask for your verification code.</p>
      <p>If you did not request this code, you can safely ignore this mail.</p>
    `);

    await this.send({ to: email, subject, text, html });
  }

  async sendPasswordReset(email: string, resetUrl: string, name: string): Promise<void> {
    const subject = 'Reset your AirIQ access password';
    const text = `Hi ${name},\n\nClick the link below to reset your AirIQ password:\n\n${resetUrl}\n\nThis link is valid for 1 hour.\n\n— The AirIQ Team`;
    const html = this.baseHtml(subject, `
      <p>Hi ${name},</p>
      <p>A request was received to reset the password for your AirIQ account. Click the button below to establish a new password:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button" style="color: #ffffff;">Reset Password</a>
      </div>
      <p>Or copy and paste this URL into your browser:</p>
      <p style="font-size: 13px; word-break: break-all; color: #8b949e;">${resetUrl}</p>
      <p>This link is valid for <strong>1 hour</strong>. If you did not request a password reset, your credentials remain secure and no action is required.</p>
    `);

    await this.send({ to: email, subject, text, html });
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const subject = 'Welcome to the AirIQ Operations Network';
    const text = `Hi ${name},\n\nYour AirIQ account has been successfully configured.\n\nLogin to the console at: http://localhost:5173\n\n— The AirIQ Team`;
    const html = this.baseHtml(subject, `
      <h2>Welcome onboard, ${name}!</h2>
      <p>Your operator profile has been successfully provisioned within the AirIQ Smart City Air Quality Command Platform.</p>
      <p>You now have access to real-time atmospheric sensor grids, predictive forecasting engines, and public health enforcement tools.</p>
      <div style="text-align: center;">
        <a href="http://localhost:5173" class="button" style="color: #ffffff;">Access Command Console</a>
      </div>
      <p>Please log in to complete your profile setup.</p>
    `);

    await this.send({ to: email, subject, text, html });
  }

  async sendAdvisory(email: string, advisory: { ward: string; message: string; severity: string; audience: string[] }): Promise<void> {
    const subject = `⚠️ HEALTH ADVISORY: Localized air quality warning in ${advisory.ward}`;
    const text = `Air Quality Advisory for ${advisory.ward}\nSeverity: ${advisory.severity.toUpperCase()}\nTarget Cohorts: ${advisory.audience.join(', ')}\n\nMessage: ${advisory.message}`;
    const html = this.baseHtml(subject, `
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <span class="badge badge-${advisory.severity}">${advisory.severity} ADVISORY</span>
        <strong style="margin-left: 10px; font-size: 18px;">${advisory.ward}</strong>
      </div>
      <p style="font-size: 18px; color: #ff7b72; font-weight: 600;">Public Safety Notice</p>
      <p style="background-color: #21262d; border-left: 4px solid #f2c744; padding: 15px; border-radius: 4px;">
        ${advisory.message}
      </p>
      <p><strong>Affected Risk Cohorts:</strong> ${advisory.audience.join(', ')}</p>
      <p>Health officials recommend keeping doors and windows closed, avoiding outdoor cardio exercises, and using appropriate respirators if outdoors.</p>
    `);

    await this.send({ to: email, subject, text, html });
  }

  async sendAlert(email: string, alert: { ward: string; title: string; description: string; severity: string }): Promise<void> {
    const subject = `🚨 AIR QUALITY ALERT: ${alert.title} in ${alert.ward}`;
    const text = `Air Quality Alert\nSeverity: ${alert.severity.toUpperCase()}\nWard: ${alert.ward}\nTitle: ${alert.title}\nDescription: ${alert.description}`;
    const html = this.baseHtml(subject, `
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <span class="badge badge-${alert.severity}">${alert.severity} ALERT</span>
        <strong style="margin-left: 10px; font-size: 18px;">${alert.ward}</strong>
      </div>
      <h3>${alert.title}</h3>
      <p style="background-color: #21262d; border: 1px solid #30363d; padding: 15px; border-radius: 6px; font-family: monospace;">
        ${alert.description}
      </p>
      <p>This alert has been automatically generated by the AirIQ Sensor Fusion Engine. Operational response units have been queued.</p>
    `);

    await this.send({ to: email, subject, text, html });
  }
}

export const emailService: IEmailService = new NodemailerEmailService();
