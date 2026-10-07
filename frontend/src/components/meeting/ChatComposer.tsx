import { Ellipsis, File, PenLine, SendHorizontal, Smile, UserRound, type LucideIcon } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { NotAvailable, Tooltip } from "@/components/ui/Tooltip";

// The same limit as the server and the chat_messages table.
const MAX_LENGTH = 2000;

const WHO_CAN_SEE =
  "Everyone in the meeting. People who join later don't see earlier messages.";

/** The bottom of the chat panel: who sees the message, the text box, and Send. */
export function ChatComposer({ onSend }: { onSend: (body: string) => void }) {
  const [text, setText] = useState("");
  const canSend = text.trim() !== "";

  function send() {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  }

  // Enter sends; Shift+Enter starts a new line. While an input method is
  // still composing a character (Chinese, Japanese, ...), Enter belongs to it.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div className="shrink-0">
      <Tooltip content={WHO_CAN_SEE}>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 bg-room-panel-raised py-1.5 text-[13px] text-white/70"
        >
          <UserRound size={14} aria-hidden="true" />
          Who can see your messages?
        </button>
      </Tooltip>
      <div className="px-3 pt-2.5 pb-2">
        <p className="flex items-center gap-2 text-[13px] text-white/70">
          to:
          {/* Everyone is the only choice here: private messages are out of scope. */}
          <span className="rounded-full bg-zoom-blue-bright px-4 py-1 text-white">Everyone</span>
        </p>
        <textarea
          aria-label="Chat message"
          placeholder="Type message here ..."
          rows={3}
          maxLength={MAX_LENGTH}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          className="mt-2 block w-full resize-none rounded bg-transparent text-[15px] text-white placeholder:text-white/80"
        />
        <div className="mt-2 flex items-center gap-1">
          <PlaceholderIcon icon={PenLine} label="Format" />
          <PlaceholderIcon icon={File} label="File" />
          <PlaceholderIcon icon={Smile} label="Emoji" />
          <PlaceholderIcon icon={Ellipsis} label="More chat options" />
          <button
            type="button"
            aria-label="Send message"
            onClick={send}
            disabled={!canSend}
            className="ml-auto rounded-md bg-room-panel-raised p-1.5 text-white hover:brightness-125 disabled:text-white/40 disabled:hover:brightness-100"
          >
            <SendHorizontal size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceholderIcon({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <NotAvailable>
      <button type="button" aria-label={label} className="rounded p-1.5 text-white/70 hover:bg-white/10">
        <Icon size={18} aria-hidden="true" />
      </button>
    </NotAvailable>
  );
}
