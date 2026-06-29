import nodemailer from 'nodemailer';
import { config } from '../config.js';

export class EmailService {
  constructor() {
    this.from = config.EMAIL_FROM;
    this.transporter = null;
    if (config.SMTP_HOST && config.SMTP_PORT) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: config.SMTP_USER && config.SMTP_PASSWORD
          ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
          : undefined,
      });
    }
  }

  async send(message) {
    if (!this.transporter) {
      console.log('[email mock]', { from: this.from, ...message });
      return;
    }
    await this.transporter.sendMail({ from: this.from, ...message });
  }

  sendWelcome(user) {
    return this.send({
      to: user.email,
      subject: 'Welcome to AirIQ',
      text: `Hi ${user.name}, your AirIQ account is ready.`,
    });
  }

  sendPasswordReset(user, resetUrl) {
    return this.send({
      to: user.email,
      subject: 'Reset your AirIQ password',
      text: `Hi ${user.name}, reset your password here: ${resetUrl}`,
    });
  }

  sendAlert(user, alert) {
    return this.send({
      to: user.email,
      subject: `AirIQ alert: ${alert.title}`,
      text: `${alert.ward}: ${alert.description}`,
    });
  }
}

export const emailService = new EmailService();
