"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

type MeetingStatusScreenProps = {
  message: string;
  onRejoin?: () => void; // only offered when rejoining could work, such as after a lost connection
};

/** Shown instead of the room when you were removed, the meeting ended, or it can't be opened. */
export function MeetingStatusScreen({ message, onRejoin }: MeetingStatusScreenProps) {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-room-bg px-4 text-center text-white">
      <p role="alert" className="max-w-md text-xl font-semibold">
        {message}
      </p>
      <div className="flex gap-3">
        {onRejoin !== undefined && (
          <Button variant="neutral" onClick={onRejoin}>
            Rejoin
          </Button>
        )}
        <Button onClick={() => router.push("/")}>Back to home</Button>
      </div>
    </main>
  );
}
