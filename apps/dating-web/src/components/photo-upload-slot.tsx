'use client';

import * as React from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { Button, cn, useToast } from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { useFlag } from '@/lib/use-flag';

export function PhotoUploadSlot({
  productId,
  position,
  url,
  onUrl,
  className,
}: {
  productId: string;
  position: number;
  url: string;
  onUrl: (url: string, storagePath?: string) => void;
  className?: string;
}) {
  const uploadOn = useFlag('feature.dating_photo_upload', false);
  const moderationOn = useFlag('feature.dating_photo_moderation', false);
  const { toast } = useToast();
  const upload = trpc.dating.createPhotoUploadUrl.useMutation();
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function onPick(file: File) {
    if (!uploadOn) {
      onUrl(URL.createObjectURL(file));
      return;
    }
    try {
      const res = await upload.mutateAsync({
        productId,
        position,
        contentType: file.type || 'image/jpeg',
      });
      if (res.uploadUrl) {
        await fetch(res.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'image/jpeg' },
        });
      }
      onUrl(res.publicUrl, res.storagePath);
      if (moderationOn) {
        toast({
          title: 'Photo submitted',
          description: 'Your photo is pending moderation before it goes live.',
          tone: 'success',
        });
      }
    } catch (e) {
      toast({
        title: 'Upload failed',
        description: e instanceof Error ? e.message : 'Try again',
        tone: 'danger',
      });
    }
  }

  return (
    <div className={cn('relative aspect-[3/4] overflow-hidden rounded-xl border border-border/60', className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center bg-muted/30 text-muted-foreground">
          <ImagePlus className="h-8 w-8 opacity-50" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPick(f);
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="absolute bottom-2 right-2 text-xs"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : uploadOn ? 'Upload' : 'Add photo'}
      </Button>
    </div>
  );
}
