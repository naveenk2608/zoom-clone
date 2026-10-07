import { Ellipsis } from "lucide-react";
import type { ReactNode } from "react";

import { ReactionItems } from "@/components/meeting/ReactionItems";
import { RoomMenuItem, RoomMenuSeparator } from "@/components/meeting/RoomMenu";
import { ToolbarMenuButton } from "@/components/meeting/ToolbarMenuButton";
import type { Reaction } from "@/types/ws";

type MoreMenuProps = {
  hostTools: ReactNode | null; // the Host tools items, for the host only
  unreadCount: number;
  sharing: boolean;
  handRaised: boolean;
  onToggleChat: () => void;
  onReact: (emoji: Reaction) => void;
  onToggleHand: () => void;
  onToggleShare: () => void;
};

/**
 * More, when the toolbar is narrow (a phone, or a side panel open): it holds
 * the buttons that no longer fit, with the reactions at the top as in Zoom's
 * phone app, and the host's tools at the bottom. Unread chat shows on it,
 * since Chat is inside.
 */
export function MoreMenu(props: MoreMenuProps) {
  const { hostTools, unreadCount } = props;
  const unread = unreadCount > 0 ? unreadCount : undefined;

  return (
    <ToolbarMenuButton icon={Ellipsis} label="More" badge={unread} alertBadge show="narrow">
      <ReactionItems
        handRaised={props.handRaised}
        onReact={props.onReact}
        onToggleHand={props.onToggleHand}
      />
      <RoomMenuSeparator />
      <RoomMenuItem label={unread ? `Chat (${unread})` : "Chat"} onSelect={props.onToggleChat} />
      <RoomMenuItem label={props.sharing ? "Stop Share" : "Share"} onSelect={props.onToggleShare} />
      {hostTools !== null && (
        <>
          <RoomMenuSeparator />
          {hostTools}
        </>
      )}
    </ToolbarMenuButton>
  );
}
