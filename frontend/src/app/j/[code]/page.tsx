"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";

import { PreJoinCard } from "@/components/prejoin/PreJoinCard";
import { Button } from "@/components/ui/Button";
import { useResource } from "@/hooks/useResource";
import { getMeeting } from "@/lib/api";
import { isMeetingCode } from "@/lib/meetingCode";
import { cannotJoinReason, INVALID_MEETING_ID } from "@/lib/meetingStatus";

/** The invite link's page: check the meeting, preview the camera, enter a name, join. */
export default function PreJoinPage() {
  const { code } = useParams<{ code: string }>();

  return (
    <main className="min-h-screen px-4 pt-9 pb-16 md:px-11">
      {/* Home, not history.back(): an invite link opened in a new tab has no page to go back to. */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded text-[15px] text-zoom-blue hover:underline"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Back
      </Link>
      <div className="mx-auto mt-10 max-w-284 md:mt-19">
        {/* Checked before any request: "/api/meetings/upcoming" is a real path, so "/j/upcoming" must not reach it. */}
        {isMeetingCode(code) ? (
          <MeetingLoader code={code} />
        ) : (
          <Unavailable title="Unable to join" message={INVALID_MEETING_ID} />
        )}
      </div>
    </main>
  );
}

function MeetingLoader({ code }: { code: string }) {
  const loadMeeting = useCallback(() => getMeeting(code), [code]);
  const { resource } = useResource(loadMeeting);

  if (resource.status === "loading") {
    return <p className="text-center text-text-secondary">Loading…</p>;
  }
  if (resource.status === "error") {
    return <Unavailable title="Unable to join" message={resource.message} />;
  }
  // A meeting nobody can join never asks for the camera.
  const reason = cannotJoinReason(resource.data);
  if (reason !== null) {
    return <Unavailable title={resource.data.title} message={reason} />;
  }
  return <PreJoinCard meeting={resource.data} />;
}

function Unavailable({ title, message }: { title: string; message: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      <p role="alert" className="text-zoom-red">
        {message}
      </p>
      <Button className="mt-3" onClick={() => router.push("/")}>
        Back to home
      </Button>
    </div>
  );
}
