"use client";

import * as Dialog from "@radix-ui/react-dialog";

import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void; // false: closed by the cancel button, Escape or the backdrop
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmVariant?: "danger" | "primary"; // red for something destructive, such as Remove
};

/** A modal "are you sure?" box. Radix traps focus inside and closes it on Escape. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  cancelLabel = "Cancel",
  confirmVariant = "danger",
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-bold text-zoom-navy">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-[15px] text-text-secondary">
            {description}
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="neutral">{cancelLabel}</Button>
            </Dialog.Close>
            <Button variant={confirmVariant} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
