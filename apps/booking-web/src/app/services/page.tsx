'use client';

import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  CardContent,
  FadeIn,
  LoadingState,
  PageHeader,
  SlideUp,
  Stagger,
  StaggerItem,
  formatMinorUnits,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { Clock } from 'lucide-react';

export default function ServicesPage() {
  const businesses = trpc.booking.tenantBusinesses.useQuery();
  const businessId = businesses.data?.[0]?.id;
  const services = trpc.booking.services.useQuery(
    { businessId: businessId ?? '' },
    { enabled: !!businessId },
  );

  if (businesses.isLoading || (businessId && services.isLoading)) return <LoadingState />;

  return (
    <FadeIn>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <SlideUp delay={0.02}>
          <PageHeader
            title="Services"
            description="Transparent pricing for virtual consults and in-person recovery blocks."
          />
        </SlideUp>
        <Stagger step={0.05} initialDelay={0.06} className="mt-8 grid gap-5 sm:grid-cols-2">
          {(services.data ?? []).map((s) => (
            <StaggerItem key={s.id}>
              <Card className="group h-full overflow-hidden border-border/80 transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-4 p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">{s.name}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-normal">
                          <Clock className="mr-1 h-3 w-3" />
                          {s.durationMinutes} min
                        </Badge>
                      </div>
                    </div>
                    <p className="shrink-0 text-2xl font-semibold tabular-nums text-primary">
                      {formatMinorUnits(s.priceCents, 'EUR')}
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Same-day availability when capacity allows. Reschedule free up to 4 hours before your slot.
                  </p>
                  <Button className="mt-auto w-full sm:w-fit" asChild>
                    <Link href={`/book?serviceId=${encodeURIComponent(s.id)}`}>Book this service</Link>
                  </Button>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </FadeIn>
  );
}
