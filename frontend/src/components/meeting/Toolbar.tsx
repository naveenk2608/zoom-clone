import {
  ArrowUpFromLine,
  Ellipsis,
  Heart,
  MessageSquare,
  Mic,
  MicOff,
  OctagonX,
  Shield,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

import { AudioMenuItems, VideoMenuItems } from "@/components/meeting/DeviceMenus";
import { EndMeetingMenu } from "@/components/meeting/EndMeetingMenu";
import { MoreMenu } from "@/components/meeting/MoreMenu";
import { RoomMenuItem } from "@/components/meeting/RoomMenu";
import { ToolbarButton } from "@/components/meeting/ToolbarButton";
import { ToolbarMenuButton } from "@/components/meeting/ToolbarMenuButton";
import type { RoomDevices } from "@/hooks/useMediaDevices";
import type { RoomPerson } from "@/hooks/useMeetingRoom";

const RED_ICON = "text-zoom-red";

type ToolbarProps = {
  me: RoomPerson;
  devices: RoomDevices; // for the ^ menus next to Mute and Video
  participantCount: number;
  participantsOpen: boolean;
  chatOpen: boolean;
  unreadCount: number; // chat messages that arrived while the chat was closed
  sharing: boolean; // we are sharing our screen
  endMenuOpen: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleParticipants: () => void;
  onOpenParticipants: () => void;
  onToggleChat: () => void;
  onToggleShare: () => void;
  onMuteAll: () => void;
  onToggleEndMenu: () => void;
  onLeave: () => void;
  onEndForAll: () => void;
};

/** The bar of controls under the tiles. While the End menu is open it shrinks to a Cancel button. */
export function Toolbar(props: ToolbarProps) {
  const { me, endMenuOpen, onToggleEndMenu } = props;

  if (endMenuOpen) {
    return (
      <footer className="relative flex h-18 shrink-0 items-center justify-end bg-room-bar px-3">
        <EndMeetingMenu
          isHost={me.role === "host"}
          onEndForAll={props.onEndForAll}
          onLeave={props.onLeave}
          onClose={onToggleEndMenu}
        />
        <button
          type="button"
          onClick={onToggleEndMenu}
          className="rounded-lg px-4 py-2 text-[15px] text-white hover:bg-white/10"
        >
          Cancel
        </button>
      </footer>
    );
  }

  return (
    // @container: the buttons below choose what to show from the toolbar's own width.
    <footer className="@container flex h-18 shrink-0 items-center justify-between bg-room-bar px-2">
      <div className="flex">
        <ToolbarButton
          icon={me.audio ? Mic : MicOff}
          label={me.audio ? "Mute" : "Unmute"}
          iconClassName={me.audio ? undefined : RED_ICON}
          onClick={props.onToggleAudio}
          menu={{ label: "Audio settings", items: <AudioMenuItems devices={props.devices} /> }}
        />
        <ToolbarButton
          icon={me.video ? Video : VideoOff}
          label="Video"
          ariaLabel={me.video ? "Stop video" : "Start video"}
          iconClassName={me.video ? undefined : RED_ICON}
          onClick={props.onToggleVideo}
          menu={{ label: "Video settings", items: <VideoMenuItems devices={props.devices} /> }}
        />
      </div>
      <div className="flex">
        <ToolbarButton
          icon={Users}
          label="Participants"
          badge={props.participantCount}
          active={props.participantsOpen}
          onClick={props.onToggleParticipants}
          caret
        />
        <ToolbarButton
          icon={MessageSquare}
          label="Chat"
          badge={props.unreadCount > 0 ? props.unreadCount : undefined}
          alertBadge
          active={props.chatOpen}
          onClick={props.onToggleChat}
          caret
          show="wide"
        />
        <ToolbarButton icon={Heart} label="React" show="wide" />
        <ToolbarButton
          icon={ArrowUpFromLine}
          label={props.sharing ? "Stop Share" : "Share"}
          iconClassName={props.sharing ? RED_ICON : undefined}
          active={props.sharing}
          onClick={props.onToggleShare}
          caret
          show="wide"
        />
        {me.role === "host" && (
          <ToolbarMenuButton icon={Shield} label="Host tools" show="wide">
            <RoomMenuItem label="Mute All" onSelect={props.onMuteAll} />
            <RoomMenuItem label="Manage Participants" onSelect={props.onOpenParticipants} />
          </ToolbarMenuButton>
        )}
        {/* Wide, More is a placeholder; narrow, it holds the buttons hidden above. */}
        <ToolbarButton icon={Ellipsis} label="More" show="wide" />
        <MoreMenu
          isHost={me.role === "host"}
          unreadCount={props.unreadCount}
          sharing={props.sharing}
          onToggleChat={props.onToggleChat}
          onToggleShare={props.onToggleShare}
          onMuteAll={props.onMuteAll}
        />
      </div>
      {/* Only the host can end the meeting, so for everyone else it is Leave. */}
      <ToolbarButton
        icon={OctagonX}
        label={me.role === "host" ? "End" : "Leave"}
        iconClassName={RED_ICON}
        onClick={onToggleEndMenu}
      />
    </footer>
  );
}
