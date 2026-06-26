'use client';

import Link from 'next/link';
import { Button, CommandPanel } from '@goldspire/ui';
import {
  BarChart3,
  FlaskConical,
  Handshake,
  Inbox,
  Rocket,
  Settings,
} from 'lucide-react';

const LINKS = [
  { href: '/', label: 'Desk', icon: Inbox, desc: 'Client queue + studio MRR strip' },
  { href: '/reports', label: 'Reports', icon: BarChart3, desc: 'Tenant MRR, usage, audit' },
  { href: '/deals', label: 'Deals', icon: Handshake, desc: 'Client fees & delivery' },
  { href: '/apps', label: 'Apps', icon: Rocket, desc: 'Deployments & health' },
  { href: '/leads', label: 'Leads', icon: Inbox, desc: 'Inbound pipeline' },
  { href: '/commercial', label: 'Commercial', icon: Settings, desc: 'Pricing layers' },
] as const;

export function LabFounderCockpit() {
  return (
    <CommandPanel
      title="Founder cockpit"
      description="Lab is your portfolio index — jump to the system of record for each money layer."
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map(({ href, label, icon: Icon, desc }) => (
          <Button key={href} asChild variant="outline" className="h-auto px-3 py-2.5">
            <Link href={href} className="flex w-full flex-col items-start gap-1">
              <span className="flex w-full items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-medium">{label}</span>
              </span>
              <span className="w-full text-left text-[11px] font-normal text-muted-foreground">
                {desc}
              </span>
            </Link>
          </Button>
        ))}
        <div className="flex items-center gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground sm:col-span-2 lg:col-span-1">
          <FlaskConical className="h-4 w-4 text-primary" />
          <span>
            You are on <strong className="text-foreground">Lab</strong> — personal ventures live here.
          </span>
        </div>
      </div>
    </CommandPanel>
  );
}
