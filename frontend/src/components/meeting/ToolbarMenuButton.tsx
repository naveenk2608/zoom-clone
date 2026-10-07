import clsx from "clsx";
import type { ReactNode } from "react";

import { RoomMenu, RoomMenuContent, RoomMenuTrigger } from "@/components/meeting/RoomMenu";
import {
  SHOW_CLASSES,
  ToolbarButtonFace,
  toolbarButtonClasses,
  type ToolbarButtonFaceProps,
  type ToolbarShow,
} from "@/components/meeting/ToolbarButton";

type ToolbarMenuButtonProps = ToolbarButtonFaceProps & {
  show?: ToolbarShow;
  children: ReactNode; // the menu items
};

/** A toolbar button that opens a menu above the toolbar, such as Host tools and More. */
export function ToolbarMenuButton({ show = "always", children, ...face }: ToolbarMenuButtonProps) {
  return (
    <div className={clsx("items-center", SHOW_CLASSES[show])}>
      <RoomMenu>
        <RoomMenuTrigger asChild>
          {/* Radix marks the trigger data-state="open" while its menu is showing. */}
          <button
            type="button"
            className={clsx(toolbarButtonClasses(), "data-[state=open]:bg-room-btn-active")}
          >
            <ToolbarButtonFace {...face} />
          </button>
        </RoomMenuTrigger>
        <RoomMenuContent side="top">{children}</RoomMenuContent>
      </RoomMenu>
    </div>
  );
}
