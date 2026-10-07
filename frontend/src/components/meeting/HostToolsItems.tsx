import {
  RoomMenuCheckboxItem,
  RoomMenuItem,
  RoomMenuLabel,
  RoomMenuSeparator,
} from "@/components/meeting/RoomMenu";
import type { PermissionChange, Permissions } from "@/types/ws";

type HostToolsItemsProps = {
  permissions: Permissions;
  onMuteAll: () => void; // opens the Mute All dialog
  onManageParticipants: () => void;
  onSetPermissions: (change: PermissionChange) => void;
};

/**
 * The host's menu, like Zoom's Security menu: Mute All, Manage Participants,
 * and "Allow participants to" settings with a tick while they are on. It is
 * the Host tools menu on a wide toolbar and part of More on a narrow one.
 */
export function HostToolsItems(props: HostToolsItemsProps) {
  const { permissions, onSetPermissions } = props;
  return (
    <>
      <RoomMenuItem label="Mute All" onSelect={props.onMuteAll} />
      <RoomMenuItem label="Manage Participants" onSelect={props.onManageParticipants} />
      <RoomMenuSeparator />
      <RoomMenuLabel>Allow participants to:</RoomMenuLabel>
      <RoomMenuCheckboxItem
        label="Unmute themselves"
        checked={permissions.allow_self_unmute}
        onCheckedChange={(checked) => onSetPermissions({ allow_self_unmute: checked })}
      />
      <RoomMenuCheckboxItem
        label="Start video"
        checked={permissions.allow_self_video}
        onCheckedChange={(checked) => onSetPermissions({ allow_self_video: checked })}
      />
    </>
  );
}
