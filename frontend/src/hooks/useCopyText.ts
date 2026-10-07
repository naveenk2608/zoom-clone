import { useToast } from "@/components/ui/Toast";

/** Returns a function that copies text and tells the user whether it worked. */
export function useCopyText() {
  const showToast = useToast();

  return async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      // The clipboard needs a secure context (https or localhost) and the page in focus.
      showToast("Couldn't copy to the clipboard");
    }
  };
}
