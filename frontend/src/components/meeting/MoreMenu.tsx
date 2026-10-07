import { Ellipsis } from "lucide-react";

import { ReactionItems } from "@/components/meeting/ReactionItems";
import { RoomMenuItem, RoomMenuSeparator } from "@/components/meeting/RoomMenu";
import { ToolbarMenuButton } from "@/components/meeting/ToolbarMenuButton";
import type { Reaction } from "@/types/ws";

type MoreMenuProps = {
  isHost: boolean;
  unreadCount: number;
  sharing: boolean;
  handRaised: boolean;
  onToggleChat: () => void;
  onReact: (emoji: Reaction) => void;
  onToggleHand: () => void;
  onToggleShare: () => void;
  onMuteAll: () => void;
};

/**
 * More, when the toolbar is narrow (a phone, or a side panel open): it holds
 * the buttons that no longer fit, with the reactions at the top as in Zoom's
 * phone app. Unread chat shows on it, since Chat is inside.
 */
export function MoreMenu(props: MoreMenuProps) {
  const { isHost, unreadCount } = props;
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
      {isHost && (
        <>
          <RoomMenuSeparator />
          <RoomMenuItem label="Mute All" onSelect={props.onMuteAll} />
        </>
      )}
    </ToolbarMenuButton>
  );
}
