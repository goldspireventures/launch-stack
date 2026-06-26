'use client';

import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button, Card, CardContent, Label } from '@goldspire/ui';
import { datingSchemas } from '@goldspire/validation';
import type { z } from 'zod';

type Filters = z.infer<typeof datingSchemas.discoveryFilters>;

export function DiscoveryFiltersPanel({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: Filters;
  onChange: (next: Filters) => void;
  onSave: () => void;
  saving?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mb-4">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal className="mr-2 h-4 w-4" />
        Discovery filters
      </Button>
      {open && (
        <Card className="mt-3">
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Min age</Label>
              <input
                type="range"
                min={18}
                max={value.maxAge - 1}
                value={value.minAge}
                className="mt-1 w-full"
                onChange={(e) => onChange({ ...value, minAge: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">{value.minAge}</p>
            </div>
            <div>
              <Label className="text-xs">Max age</Label>
              <input
                type="range"
                min={value.minAge + 1}
                max={80}
                value={value.maxAge}
                className="mt-1 w-full"
                onChange={(e) => onChange({ ...value, maxAge: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">{value.maxAge}</p>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Max distance (km)</Label>
              <input
                type="range"
                min={5}
                max={200}
                value={value.distanceKm}
                className="mt-1 w-full"
                onChange={(e) => onChange({ ...value, distanceKm: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">{value.distanceKm} km</p>
            </div>
            <div className="sm:col-span-2">
              <Button type="button" onClick={onSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save filters'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
