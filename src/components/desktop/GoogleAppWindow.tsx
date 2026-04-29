import { useMemo, useState } from 'react';
import type React from 'react';
import { Mail, CalendarDays, Cloud, FileText, Youtube, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Win } from './Win';
import { WindowState } from '@/store/wmStore';
import { useFsStore } from '@/store/fsStore';
import {
  buildGmailUrl,
  GOOGLE_APPS,
  GoogleAccount,
  GoogleService,
  openExternalGoogleUrl,
} from '@/lib/googleApps';
import { openGmailAccount, openGoogleApp } from '@/lib/appLauncher';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  win: WindowState;
}

const SERVICE_ICONS: Record<GoogleService, React.ReactNode> = {
  gmail: <Mail className="w-4 h-4" />,
  calendar: <CalendarDays className="w-4 h-4" />,
  drive: <Cloud className="w-4 h-4" />,
  docs: <FileText className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
};

export function GoogleAppWindow({ win }: Props) {
  const service = (win.props.service as GoogleService | undefined) ?? 'gmail';
  const app = GOOGLE_APPS[service] ?? GOOGLE_APPS.gmail;
  const url = (win.props.url as string | undefined) || app.url;

  return (
    <Win
      win={win}
      icon={<span style={{ color: app.accent }}>{SERVICE_ICONS[app.service]}</span>}
      minWidth={520}
      minHeight={360}
      toolbar={(
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            openExternalGoogleUrl(url);
          }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open externally
        </Button>
      )}
    >
      <div className="min-h-0 flex-1 grid grid-cols-[260px_1fr] bg-background max-md:grid-cols-1">
        <GoogleAppSidebar service={app.service} currentUrl={url} />
        <div className="flex min-h-0 items-center justify-center border-l border-border bg-muted/30 p-6 max-md:hidden">
          <div className="max-w-sm rounded-sm border border-border bg-background p-5 text-center shadow-sm">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm text-white"
              style={{ backgroundColor: app.accent }}
            >
              {SERVICE_ICONS[app.service]}
            </div>
            <div className="mt-4 text-sm font-medium">{app.name} opens externally</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Google blocks these apps inside embedded frames, which causes the 403 access page. Use the external tab for the live app.
            </p>
            <Button
              type="button"
              className="mt-4 h-9 gap-2"
              onClick={() => openExternalGoogleUrl(url)}
            >
              <ExternalLink className="w-4 h-4" />
              Open externally
            </Button>
          </div>
        </div>
      </div>
    </Win>
  );
}

function GoogleAppSidebar({ service, currentUrl }: { service: GoogleService; currentUrl: string }) {
  const app = GOOGLE_APPS[service];
  const accounts = useFsStore(s => s.settings.googleAccounts);
  const setSettings = useFsStore(s => s.setSettings);
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [accountIndex, setAccountIndex] = useState(accounts.length);

  const gmailUrlPreview = useMemo(() => buildGmailUrl(accountIndex), [accountIndex]);

  const removeAccount = (id: string) => {
    setSettings({ googleAccounts: accounts.filter(account => account.id !== id) });
  };

  const submitAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const account: GoogleAccount = {
      id: crypto.randomUUID(),
      label: label.trim() || email.trim() || `Gmail ${accounts.length + 1}`,
      email: email.trim() || undefined,
      gmailUrl: buildGmailUrl(accountIndex),
    };
    setSettings({ googleAccounts: [...accounts, account] });
    setLabel('');
    setEmail('');
    setAccountIndex(accounts.length + 1);
    toast.success('Account shortcut added');
    openGmailAccount(account.id);
  };

  return (
    <aside className="min-h-0 overflow-y-auto p-3">
      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-sm text-white shadow-sm"
          style={{ backgroundColor: app.accent }}
        >
          {SERVICE_ICONS[service]}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{app.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{currentUrl}</div>
        </div>
      </div>

      <Button
        type="button"
        className="mt-4 h-9 w-full justify-start gap-2"
        onClick={() => openExternalGoogleUrl(currentUrl)}
      >
        <ExternalLink className="w-4 h-4" />
        Open externally
      </Button>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">{app.notice}</p>

      {service === 'gmail' && (
        <div className="mt-5 space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accounts</div>
            <div className="mt-2 space-y-1.5">
              {accounts.length === 0 ? (
                <div className="rounded-sm border border-dashed border-border px-3 py-4 text-xs leading-5 text-muted-foreground">
                  Add local shortcuts for the Gmail accounts already signed in to this browser.
                </div>
              ) : (
                accounts.map(account => (
                  <div key={account.id} className="flex items-center gap-1 rounded-sm border border-border bg-card p-1.5">
                    <button
                      type="button"
                      className={cn(
                        'min-w-0 flex-1 rounded-sm px-2 py-1.5 text-left hover:bg-foreground/10',
                        account.gmailUrl === currentUrl && 'bg-primary/10 text-primary',
                      )}
                      onClick={() => openGmailAccount(account.id)}
                    >
                      <span className="block truncate text-sm">{account.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {account.email || account.gmailUrl}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-destructive hover:text-destructive-foreground"
                      title="Remove shortcut"
                      aria-label={`Remove ${account.label}`}
                      onClick={() => removeAccount(account.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <form className="space-y-2 rounded-sm border border-border bg-card p-3" onSubmit={submitAccount}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Plus className="w-3.5 h-3.5" />
              Add Shortcut
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gmail-label" className="text-xs">Label</Label>
              <Input
                id="gmail-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Work Gmail"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gmail-email" className="text-xs">Email</Label>
              <Input
                id="gmail-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gmail-index" className="text-xs">Browser account index</Label>
              <Input
                id="gmail-index"
                type="number"
                min={0}
                value={accountIndex}
                onChange={(e) => setAccountIndex(Math.max(0, Number(e.target.value) || 0))}
                className="h-8 text-xs"
              />
              <div className="truncate text-[11px] text-muted-foreground">{gmailUrlPreview}</div>
            </div>
            <Button type="submit" size="sm" className="h-8 w-full gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Add and open
            </Button>
          </form>
        </div>
      )}
    </aside>
  );
}
