import { describe, expect, it } from 'vitest';
import { buildGmailUrl, GOOGLE_APPS, normalizeGoogleAccounts } from './googleApps';

describe('googleApps', () => {
  it('builds safe Gmail account URLs', () => {
    expect(buildGmailUrl(0)).toBe('https://mail.google.com/mail/u/0/');
    expect(buildGmailUrl(2.8)).toBe('https://mail.google.com/mail/u/2/');
    expect(buildGmailUrl(-3)).toBe('https://mail.google.com/mail/u/0/');
  });

  it('defines launch URLs for the supported Google apps', () => {
    expect(GOOGLE_APPS.gmail.url).toContain('mail.google.com');
    expect(GOOGLE_APPS.calendar.url).toContain('calendar.google.com');
    expect(GOOGLE_APPS.drive.url).toContain('drive.google.com');
    expect(GOOGLE_APPS.docs.url).toContain('docs.google.com');
    expect(GOOGLE_APPS.youtube.url).toContain('youtube.com');
  });

  it('normalizes persisted Gmail account shortcuts', () => {
    expect(normalizeGoogleAccounts([
      { id: '', label: '  Work  ', email: ' work@example.com ', gmailUrl: '' },
      { email: 'personal@example.com' },
    ])).toEqual([
      {
        id: 'gmail-account-0',
        label: 'Work',
        email: 'work@example.com',
        gmailUrl: 'https://mail.google.com/mail/u/0/',
      },
      {
        id: 'gmail-account-1',
        label: 'personal@example.com',
        email: 'personal@example.com',
        gmailUrl: 'https://mail.google.com/mail/u/1/',
      },
    ]);
  });
});
