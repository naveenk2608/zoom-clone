"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { errorMessage, getMeeting } from "@/lib/api";
import { parseMeetingInput } from "@/lib/meetingCode";
import { cannotJoinReason, INVALID_MEETING_ID } from "@/lib/meetingStatus";

/** One box that takes a meeting ID or an invite link, checks it, then opens the pre-join page. */
export function JoinForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = parseMeetingInput(input);
    if (code === null) {
      setError(INVALID_MEETING_ID);
      return;
    }

    setChecking(true);
    setError(null);
    try {
      const meeting = await getMeeting(code); // 404 if no meeting has this ID
      const reason = cannotJoinReason(meeting);
      if (reason !== null) {
        setError(reason);
        setChecking(false);
        return;
      }
      router.push(`/j/${code}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setChecking(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-90 flex-col">
      <label htmlFor="meeting-id" className="text-sm text-text-primary">
        Meeting ID or Personal Link Name
      </label>
      <div className="mt-2">
        <Input
          id="meeting-id"
          // A single-field page: focus it, as Zoom does.
          autoFocus
          autoComplete="off"
          placeholder="Enter Meeting ID or Personal Link Name"
          value={input}
          aria-invalid={error !== null}
          aria-describedby={error !== null ? "join-error" : undefined}
          onChange={(event) => {
            setInput(event.target.value);
            setError(null);
          }}
        />
      </div>
      {error !== null && (
        <p id="join-error" role="alert" className="mt-2 text-sm text-zoom-red">
          {error}
        </p>
      )}
      {/* Gray and disabled until something is typed, like Zoom's. */}
      <Button type="submit" className="mt-6 w-full" disabled={input.trim() === "" || checking}>
        Join
      </Button>
    </form>
  );
}
