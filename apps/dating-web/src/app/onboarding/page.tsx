'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Button, Card, CardContent, FormField, Input } from '@goldspire/ui';

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-12">
      <Link href="/" className="mb-8 text-sm text-muted-foreground">
        ← Back
      </Link>
      <h1 className="text-2xl font-semibold">Create your Heartline profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        In mock mode, sign-in is automatic with the seeded demo user. With Supabase Auth configured,
        this becomes a real sign-up flow.
      </p>

      <Card className="mt-6">
        <CardContent className="space-y-4 p-6">
          <FormField label="Email" htmlFor="email">
            <Input id="email" type="email" defaultValue="ava@heartline.demo" />
          </FormField>
          <FormField label="Password" htmlFor="password">
            <Input id="password" type="password" defaultValue="••••••••" disabled />
          </FormField>
          <Button asChild className="w-full">
            <Link href="/discover">Continue</Link>
          </Button>
          <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3" /> Photo-verified profiles. Block & report from any
            chat.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
