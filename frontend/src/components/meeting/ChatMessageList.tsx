import { useEffect, useRef } from "react";

import { Avatar } from "@/components/layout/Avatar";
import { formatTime } from "@/lib/datetime";
import type { ChatMessage } from "@/types/ws";

/** The messages received since we joined, oldest first, kept scrolled to the newest. */
export function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  const listRef = useRef<HTMLOListElement>(null);

  // A new message arrived: scroll to the bottom so it is in view.
  useEffect(() => {
    const list = listRef.current;
    if (list !== null) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  return (
    <ol ref={listRef} aria-label="Chat messages" className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
      {messages.map((message) => (
        <li key={message.id} className="flex gap-2.5 py-2">
          <Avatar
            name={message.from.display_name}
            color="var(--color-avatar-orange)"
            className="size-8 rounded-md text-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-2 text-[13px]">
              <span className="truncate font-semibold">{message.from.display_name}</span>
              <time dateTime={message.sent_at} className="shrink-0 text-xs text-white/60">
                {formatTime(new Date(message.sent_at))}
              </time>
            </p>
            {/* pre-wrap keeps the line breaks typed with Shift+Enter. */}
            <p className="mt-1 w-fit max-w-full rounded-lg bg-room-panel-raised px-3 py-2 text-sm whitespace-pre-wrap wrap-break-word">
              {message.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
