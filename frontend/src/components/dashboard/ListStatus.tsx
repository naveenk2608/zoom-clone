import { Button } from "@/components/ui/Button";

/** Shown inside a dashboard card while its list loads. */
export function ListLoading() {
  return <p className="py-8 text-center text-sm text-text-secondary">Loading…</p>;
}

type ListErrorProps = {
  message: string;
  onRetry: () => void;
};

/** Shown inside a dashboard card when its list failed to load. */
export function ListError({ message, onRetry }: ListErrorProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-sm text-zoom-red">{message}</p>
      <Button variant="neutral" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
