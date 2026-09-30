import { readFile } from 'node:fs/promises';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Env } from '../config/env.schema.js';

const TEMPLATE_DIR = new URL(
  '../../modules/notifications/templates/',
  import.meta.url,
);

@Injectable()
export class MailService {
  private readonly transport: Transporter;
  private readonly from: string;
  private readonly cache = new Map<string, Handlebars.TemplateDelegate>();

  constructor(config: ConfigService<Env, true>) {
    const user = config.get('SMTP_USER', { infer: true });
    this.from = config.get('MAIL_FROM', { infer: true });
    this.transport = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
      auth: user
        ? { user, pass: config.get('SMTP_PASS', { infer: true }) }
        : undefined,
    });
  }

  // Baris pertama template = subject, sisanya = body HTML.
  async render(template: string, context: Record<string, unknown>) {
    let tpl = this.cache.get(template);
    if (!tpl) {
      const source = await readFile(
        new URL(`${template}.hbs`, TEMPLATE_DIR),
        'utf8',
      );
      tpl = Handlebars.compile(source);
      this.cache.set(template, tpl);
    }
    const [subject, ...body] = tpl(context).split('\n');
    return { subject: subject.trim(), html: body.join('\n') };
  }

  async sendTemplate(
    to: string,
    template: string,
    context: Record<string, unknown>,
    /** Pengirim dari profil perpustakaan (FR-M2); default MAIL_FROM. */
    from = this.from,
  ) {
    const { subject, html } = await this.render(template, context);
    await this.transport.sendMail({ from, to, subject, html });
  }
}
