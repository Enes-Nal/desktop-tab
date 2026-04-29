import { toast } from 'sonner';

export type GoogleService = 'gmail' | 'calendar' | 'drive' | 'docs' | 'youtube';

export interface GoogleAccount {
  id: string;
  label: string;
  email?: string;
  gmailUrl: string;
}

export interface GoogleAppDefinition {
  service: GoogleService;
  name: string;
  url: string;
  embedUrl?: string;
  accent: string;
  notice: string;
}

export const GOOGLE_APPS: Record<GoogleService, GoogleAppDefinition> = {
  gmail: {
    service: 'gmail',
    name: 'Gmail',
    url: 'https://mail.google.com/mail/u/0/',
    accent: '#ea4335',
    notice: 'Gmail opens in a browser tab because Google blocks embedded viewing.',
  },
  calendar: {
    service: 'calendar',
    name: 'Calendar',
    url: 'https://calendar.google.com/calendar/u/0/r',
    accent: '#4285f4',
    notice: 'Calendar opens in a browser tab because Google blocks embedded viewing.',
  },
  drive: {
    service: 'drive',
    name: 'Drive',
    url: 'https://drive.google.com/drive/u/0/my-drive',
    accent: '#188038',
    notice: 'Drive opens in a browser tab because Google blocks embedded viewing.',
  },
  docs: {
    service: 'docs',
    name: 'Docs',
    url: 'https://docs.google.com/document/u/0/',
    accent: '#1a73e8',
    notice: 'Docs opens in a browser tab because Google blocks embedded viewing.',
  },
  youtube: {
    service: 'youtube',
    name: 'YouTube',
    url: 'https://www.youtube.com/',
    accent: '#ff0033',
    notice: 'YouTube opens in a browser tab because embedded viewing can be blocked.',
  },
};

export const GOOGLE_APP_ORDER: GoogleService[] = ['gmail', 'calendar', 'drive', 'docs', 'youtube'];

export function buildGmailUrl(accountIndex: number) {
  const safeIndex = Number.isFinite(accountIndex) ? Math.max(0, Math.floor(accountIndex)) : 0;
  return `https://mail.google.com/mail/u/${safeIndex}/`;
}

export function normalizeGoogleAccounts(accounts: Partial<GoogleAccount>[] | null | undefined): GoogleAccount[] {
  if (!Array.isArray(accounts)) return [];

  return accounts
    .map((account, index) => ({
      id: account.id || `gmail-account-${index}`,
      label: (account.label || account.email || `Gmail ${index + 1}`).trim(),
      email: account.email?.trim() || undefined,
      gmailUrl: account.gmailUrl || buildGmailUrl(index),
    }))
    .filter(account => account.label.length > 0);
}

export function openExternalGoogleUrl(url: string, message = 'Opened in new tab') {
  window.open(url, '_blank', 'noopener,noreferrer');
  toast.success(message);
}
