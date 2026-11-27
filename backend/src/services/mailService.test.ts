import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeStoredMailConfig,
  parseMailFrom,
  resolveEffectiveMailConfig
} from './mailService';

test('parseMailFrom extracts display name and email address', () => {
  assert.deepEqual(parseMailFrom('"Talenta+" <recruitment@proxsis.com>'), {
    name: 'Talenta+',
    email: 'recruitment@proxsis.com'
  });
  assert.deepEqual(parseMailFrom('no-reply@proxsis.com'), {
    name: '',
    email: 'no-reply@proxsis.com'
  });
  assert.deepEqual(parseMailFrom(''), { name: '', email: '' });
});

test('resolveEffectiveMailConfig picks SMTP from env in auto mode and defaults fromEmail to smtpUser', () => {
  const effective = resolveEffectiveMailConfig(
    { provider: 'auto' },
    {
      SMTP_HOST: 'smtp.zoho.com',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'recruitment@proxsis.com',
      SMTP_PASS: 'zoho-app-pass',
      APP_BASE_URL: 'https://talenta-recruitment.connect.proxsis.com/'
    } as NodeJS.ProcessEnv
  );

  assert.equal(effective.activeProvider, 'smtp');
  assert.equal(effective.smtpHost, 'smtp.zoho.com');
  assert.equal(effective.smtpPort, 465);
  assert.equal(effective.smtpSecure, true);
  assert.equal(effective.fromEmail, 'recruitment@proxsis.com');
  assert.equal(effective.formattedFrom, '"Talenta+" <recruitment@proxsis.com>');
  assert.equal(effective.effectiveAppBaseUrl, 'https://talenta-recruitment.connect.proxsis.com');
});

test('resolveEffectiveMailConfig prefers DB stored settings over env and respects explicit outbox', () => {
  const stored = normalizeStoredMailConfig({
    provider: 'smtp',
    fromName: 'Proxsis Recruitment',
    fromEmail: 'hr@proxsis.com',
    appBaseUrl: 'https://portal.proxsis.com/',
    smtpHost: 'smtppro.zoho.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: 'hr@proxsis.com',
    smtpPass: 'secret-pass'
  });

  const effective = resolveEffectiveMailConfig(stored, {
    SMTP_HOST: 'smtp.other.com',
    RESEND_API_KEY: 're_123',
    APP_BASE_URL: 'http://localhost:5173'
  } as NodeJS.ProcessEnv);

  assert.equal(effective.activeProvider, 'smtp');
  assert.equal(effective.smtpHost, 'smtppro.zoho.com');
  assert.equal(effective.smtpPort, 587);
  assert.equal(effective.smtpSecure, false);
  assert.equal(effective.formattedFrom, '"Proxsis Recruitment" <hr@proxsis.com>');
  assert.equal(effective.effectiveAppBaseUrl, 'https://portal.proxsis.com');

  const disabled = resolveEffectiveMailConfig({ provider: 'outbox' }, {
    SMTP_HOST: 'smtp.zoho.com',
    SMTP_USER: 'u@zoho.com',
    SMTP_PASS: 'p'
  } as NodeJS.ProcessEnv);
  assert.equal(disabled.activeProvider, 'outbox');
});

test('resolveEffectiveMailConfig falls back to resend, webhook, then outbox when SMTP is absent', () => {
  const resendCfg = resolveEffectiveMailConfig({ provider: 'auto' }, {
    RESEND_API_KEY: 're_key'
  } as NodeJS.ProcessEnv);
  assert.equal(resendCfg.activeProvider, 'resend');

  const webhookCfg = resolveEffectiveMailConfig({ provider: 'auto' }, {
    MAIL_WEBHOOK_URL: 'https://hooks.example.com/mail'
  } as NodeJS.ProcessEnv);
  assert.equal(webhookCfg.activeProvider, 'webhook');

  const outboxCfg = resolveEffectiveMailConfig({ provider: 'auto' }, {} as NodeJS.ProcessEnv);
  assert.equal(outboxCfg.activeProvider, 'outbox');
});
