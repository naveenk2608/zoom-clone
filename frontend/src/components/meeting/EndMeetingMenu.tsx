"use client";

import { useEffect } from "react";

type EndMeetingMenuProps = {
  isHost: boolean; // only the host can end the meeting for everyone
  onEndForAll: () => void;
  onLeave: () => void;
  onClose: () => void;
};

/** The panel above the End button: End Meeting for All (host only) and Leave Meeting. */
export function EndMeetingMenu({ isHost, onEndForAll, onLeave, onClose }: EndMeetingMenuProps) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      role="menu"
      className="absolute right-2 bottom-full mb-1 flex w-72 flex-col gap-2 rounded-xl bg-room-panel p-3 shadow-xl"
    >
      {isHost && (
        <button
          type="button"
          role="menuitem"
          onClick={onEndForAll}
          className="h-10 rounded-lg bg-zoom-red text-[15px] text-white hover:brightness-95"
        >
          End Meeting for All
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        onClick={onLeave}
        className="h-10 rounded-lg bg-room-panel-raised text-[15px] text-white hover:brightness-110"
      >
        Leave Meeting
      </button>
    </div>
  );
}
