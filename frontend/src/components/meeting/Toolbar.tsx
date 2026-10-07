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

import { EndMeetingMenu } from "@/components/meeting/EndMeetingMenu";
import { ToolbarButton } from "@/components/meeting/ToolbarButton";
import type { RoomPerson } from "@/hooks/useMeetingRoom";

const RED_ICON = "text-zoom-red";

type ToolbarProps = {
  me: RoomPerson;
  participantCount: number;
  participantsOpen: boolean;
  endMenuOpen: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleParticipants: () => void;
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
    <footer className="flex h-18 shrink-0 items-center justify-between bg-room-bar px-2">
      <div className="flex">
        <ToolbarButton
          icon={me.audio ? Mic : MicOff}
          label={me.audio ? "Mute" : "Unmute"}
          iconClassName={me.audio ? undefined : RED_ICON}
          onClick={props.onToggleAudio}
          caret
        />
        <ToolbarButton
          icon={me.video ? Video : VideoOff}
          label="Video"
          ariaLabel={me.video ? "Stop video" : "Start video"}
          iconClassName={me.video ? undefined : RED_ICON}
          onClick={props.onToggleVideo}
          caret
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
        <ToolbarButton icon={MessageSquare} label="Chat" caret hideOnSmall />
        <ToolbarButton icon={Heart} label="React" hideOnSmall />
        <ToolbarButton icon={ArrowUpFromLine} label="Share" caret hideOnSmall />
        {me.role === "host" && <ToolbarButton icon={Shield} label="Host tools" hideOnSmall />}
        <ToolbarButton icon={Ellipsis} label="More" />
      </div>
      <ToolbarButton icon={OctagonX} label="End" iconClassName={RED_ICON} onClick={onToggleEndMenu} />
    </footer>
  );
}
