import { ChatComposer } from "@/components/meeting/ChatComposer";
import { ChatMessageList } from "@/components/meeting/ChatMessageList";
import { RoomPanel } from "@/components/meeting/RoomPanel";
import type { ChatMessage } from "@/types/ws";

type ChatPanelProps = {
  messages: ChatMessage[];
  onSend: (body: string) => void;
  onClose: () => void;
};

/** "Meeting Chat": the messages, then the box to write to everyone. */
export function ChatPanel({ messages, onSend, onClose }: ChatPanelProps) {
  return (
    <RoomPanel title="Meeting Chat" onClose={onClose}>
      <ChatMessageList messages={messages} />
      <ChatComposer onSend={onSend} />
    </RoomPanel>
  );
}
