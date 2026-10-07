import { Ellipsis } from "lucide-react";

import { RoomMenuItem, RoomMenuSeparator } from "@/components/meeting/RoomMenu";
import { ToolbarMenuButton } from "@/components/meeting/ToolbarMenuButton";
import { useToast } from "@/components/ui/Toast";
import { NOT_AVAILABLE } from "@/components/ui/Tooltip";

type MoreMenuProps = {
  isHost: boolean;
  unreadCount: number;
  sharing: boolean;
  onToggleChat: () => void;
  onToggleShare: () => void;
  onMuteAll: () => void;
};

/**
 * More, when the toolbar is narrow (a phone, or a side panel open): it holds
 * the buttons that no longer fit. Unread chat shows on it, since Chat is inside.
 */
export function MoreMenu(props: MoreMenuProps) {
  const { isHost, unreadCount } = props;
  const showToast = useToast();
  const unread = unreadCount > 0 ? unreadCount : undefined;

  return (
    <ToolbarMenuButton icon={Ellipsis} label="More" badge={unread} alertBadge show="narrow">
      <RoomMenuItem label={unread ? `Chat (${unread})` : "Chat"} onSelect={props.onToggleChat} />
      {/* A menu item closes the menu on click, so a placeholder explains itself in a toast. */}
      <RoomMenuItem label="React" onSelect={() => showToast(NOT_AVAILABLE)} />
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
