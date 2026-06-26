'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  FadeIn,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  SlideUp,
  formatMinorUnits,
  useToast,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { Calendar, CheckCircle2 } from 'lucide-react';

export default function BookPage() {
  const { toast } = useToast();
  const params = useSearchParams();
  const initialServiceId = params.get('serviceId') ?? '';
  const businesses = trpc.booking.tenantBusinesses.useQuery();
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

  const minDate = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  React.useEffect(() => {
    if (!serviceId && services.data?.[0]) setServiceId(services.data[0].id);
    if (!staffId && staff.data?.[0]) setStaffId(staff.data[0].id);
  }, [services.data, staff.data, serviceId, staffId]);

  const selectedService = React.useMemo(
    () => (services.data ?? []).find((s) => s.id === serviceId),
    [services.data, serviceId],
  );
  const selectedStaff = React.useMemo(
    () => (staff.data ?? []).find((s) => s.id === staffId),
    [staff.data, staffId],
  );

  const createBooking = trpc.booking.createBooking.useMutation({
    onSuccess: (row) => {
      const raw = row as { id: string; startsAt: Date | string };
      setConfirmation({
        id: raw.id,
        startsAt: new Date(raw.startsAt).toLocaleString(),
      });
    },
    onError: (e) => toast({ title: 'Booking failed', description: e.message, tone: 'danger' }),
  });

  if (businesses.isLoading || (businessId && (services.isLoading || staff.isLoading))) return <LoadingState />;

  function submit() {
    if (!businessId || !serviceId || !staffId || !date) {
      toast({ title: 'Almost there', description: 'Pick a service, clinician, and date.', tone: 'warning' });
      return;
    }
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
      <FadeIn>
        <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
          <SlideUp>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <PageHeader
              title="You're booked"
              description={`Confirmation #${confirmation.id.slice(-6)} · ${confirmation.startsAt}`}
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button variant="outline" asChild>
                <Link href="/bookings">View my bookings</Link>
              </Button>
              <Button onClick={() => setConfirmation(null)}>Book another</Button>
            </div>
          </SlideUp>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <SlideUp delay={0.02}>
          <PageHeader
            title="Book a visit"
            description="Choose a service and clinician. Times are stored in your local timezone."
          />
        </SlideUp>
        <SlideUp delay={0.06} className="mt-8">
          <Card className="border-border/80 shadow-sm">
            <CardContent className="space-y-5 p-6 sm:p-8">
              {selectedService && (
                <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                  <p className="font-medium">{selectedService.name}</p>
                  <p className="mt-1 text-muted-foreground">
                    {selectedService.durationMinutes} minutes · from {formatMinorUnits(selectedService.priceCents, 'EUR')}
                  </p>
                </div>
              )}
              <FormField label="Service">
                <select
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  {(services.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {formatMinorUnits(s.priceCents, 'EUR')}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Clinician"
                description={
                  selectedStaff?.title
                    ? `${selectedStaff.displayName} — ${selectedStaff.title}`
                    : 'Choose who you would like to see.'
                }
              >
                <select
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                >
                  {(staff.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName}
                      {s.title ? ` · ${s.title}` : ''}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Date">
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      type="date"
                      min={minDate}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </FormField>
                <FormField label="Time">
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Your name">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Riley"
                    autoComplete="name"
                  />
                </FormField>
                <FormField label="Email">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </FormField>
              </div>
              <Button
                className="w-full sm:w-auto"
                onClick={submit}
                disabled={!serviceId || !staffId || !date || createBooking.isPending}
              >
                {createBooking.isPending ? 'Booking…' : 'Confirm booking'}
              </Button>
            </CardContent>
          </Card>
        </SlideUp>
      </div>
    </FadeIn>
  );
}
