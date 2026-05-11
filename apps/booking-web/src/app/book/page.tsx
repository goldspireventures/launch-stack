'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  FormField,
  Input,
  LoadingState,
  PageHeader,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

export default function BookPage() {
  const params = useSearchParams();
  const initialServiceId = params.get('serviceId') ?? '';
  const products = trpc.products.list.useQuery();
  const productId = products.data?.[0]?.id;
  const businesses = trpc.booking.businesses.useQuery(
    { productId: productId ?? '' },
    { enabled: !!productId },
  );
  const businessId = businesses.data?.[0]?.id;
  const services = trpc.booking.services.useQuery(
    { businessId: businessId ?? '' },
    { enabled: !!businessId },
  );
  const staff = trpc.booking.staff.useQuery(
    { businessId: businessId ?? '' },
    { enabled: !!businessId },
  );

  const [serviceId, setServiceId] = React.useState(initialServiceId);
  const [staffId, setStaffId] = React.useState('');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('10:00');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [confirmation, setConfirmation] = React.useState<{ id: string; startsAt: string } | null>(null);

  React.useEffect(() => {
    if (!serviceId && services.data?.[0]) setServiceId(services.data[0].id);
    if (!staffId && staff.data?.[0]) setStaffId(staff.data[0].id);
  }, [services.data, staff.data, serviceId, staffId]);

  const createBooking = trpc.booking.createBooking.useMutation({
    onSuccess: (row) =>
      setConfirmation({
        id: (row as { id: string }).id,
        startsAt: new Date((row as { startsAt: string }).startsAt).toLocaleString(),
      }),
  });

  if (products.isLoading || businesses.isLoading) return <LoadingState />;

  function submit() {
    if (!businessId || !serviceId || !staffId || !date) return;
    createBooking.mutate({
      businessId,
      serviceId,
      staffId,
      customerEmail: email || 'walk-in@nova.demo',
      customerName: name || 'Walk-in',
      startsAt: new Date(`${date}T${time}:00`).toISOString(),
    });
  }

  if (confirmation) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <PageHeader title="You're booked." description={`Confirmation #${confirmation.id.slice(-6)} for ${confirmation.startsAt}.`} />
        <Button onClick={() => setConfirmation(null)}>Book another</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <PageHeader title="Book a session" description="Pick a service, time, and we'll handle the rest." />
      <Card>
        <CardContent className="space-y-4 p-6">
          <FormField label="Service">
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              {(services.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · ${(s.priceCents / 100).toFixed(0)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Practitioner">
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              {(staff.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName} {s.title ? `· ${s.title}` : ''}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField label="Time">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Your name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Riley" />
            </FormField>
            <FormField label="Email">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </FormField>
          </div>
          <Button onClick={submit} disabled={!serviceId || !staffId || !date || createBooking.isPending}>
            {createBooking.isPending ? 'Booking…' : 'Confirm booking'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
