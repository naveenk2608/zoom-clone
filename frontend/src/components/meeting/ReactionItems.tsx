import { RoomMenuEmojiItem, RoomMenuItem, RoomMenuSeparator } from "@/components/meeting/RoomMenu";
import { REACTIONS, type Reaction } from "@/types/ws";

// What a screen reader says for each reaction.
const REACTION_NAMES: Record<Reaction, string> = {
  "👏": "Clap",
  "👍": "Thumbs up",
  "❤️": "Heart",
  "😂": "Tears of joy",
  "😮": "Open mouth",
  "🎉": "Tada",
};

type ReactionItemsProps = {
  handRaised: boolean;
  onReact: (emoji: Reaction) => void;
  onToggleHand: () => void;
};

/**
 * Zoom's reactions palette: a row of emoji, then Raise Hand (or Lower Hand).
 * It fills the React menu on a wide toolbar and sits inside More on a narrow one.
 */
export function ReactionItems({ handRaised, onReact, onToggleHand }: ReactionItemsProps) {
  return (
    <>
      <div className="flex gap-1 px-2 py-1">
        {REACTIONS.map((emoji) => (
          <RoomMenuEmojiItem
            key={emoji}
            emoji={emoji}
            label={REACTION_NAMES[emoji]}
            onSelect={() => onReact(emoji)}
          />
        ))}
      </div>
      <RoomMenuSeparator />
      <RoomMenuItem label={handRaised ? "✋ Lower Hand" : "✋ Raise Hand"} onSelect={onToggleHand} />
    </>
  );
}
