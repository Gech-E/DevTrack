import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 10_000;

/**
 * Sends transactional email. Two transports, chosen with `MAIL_TRANSPORT`:
 * - `log`: writes to the application log (development; production logs metadata only).
 * - `resend`: posts to the Resend HTTP API, so no extra dependency is needed.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(message: MailMessage): Promise<void> {
    if (this.config.get<string>('MAIL_TRANSPORT', 'log') === 'resend') {
      await this.sendWithResend(message);
      return;
    }

    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.warn(
        `Email "${message.subject}" was NOT delivered: MAIL_TRANSPORT=log. Configure a mail transport.`,
      );
      return;
    }

    this.logger.log(`Email to ${message.to}: ${message.subject}\n${message.text}`);
  }

  private async sendWithResend(message: MailMessage): Promise<void> {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.getOrThrow<string>('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.getOrThrow<string>('MAIL_FROM'),
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Mail provider responded with HTTP ${response.status}`);
    }
  }
}
