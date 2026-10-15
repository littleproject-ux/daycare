'use client';

// Promise-based confirmation dialog.
//   const [confirm, confirmEl] = useConfirm();
//   if (await confirm({ title: 'Hapus?', description: '...' })) { ... }
//   return <>{...}{confirmEl}</>;
import React, { useCallback, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  const element = (
    <Dialog open={!!opts} onOpenChange={(open) => { if (!open) close(false); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{opts?.title}</DialogTitle>
          {opts?.description && <DialogDescription>{opts.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => close(false)}>{opts?.cancelText ?? 'Batal'}</Button>
          <Button variant={opts?.destructive === false ? 'default' : 'destructive'} onClick={() => close(true)}>
            {opts?.confirmText ?? 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return [confirm, element];
}
