"use client";

import { useEffect, useRef, useState } from "react";
import { Cat, Film, Loader2, Smile, SmilePlus, X } from "lucide-react";

import type { Channel as CoreChannel } from "@ermis-network/ermis-chat-sdk";

import { ChatGiphyPicker } from "@/components/chat/chat-giphy-picker";
import { cn } from "@/lib/utils";

export const DEFAULT_STICKER_IFRAME_URL = "https://sticker.ermis.network";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
  "😊", "😇", "🙂", "🙃", "😉", "😍", "🥰", "😘",
  "😋", "😎", "🤩", "🥳", "😏", "😒", "😔", "😢",
  "😭", "😤", "😡", "🤬", "🤯", "😱", "😴", "🤤",
  "👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "👌",
  "✌️", "🤞", "🤟", "🤘", "👋", "💯", "🔥", "✨",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "⚽", "🏆", "🥇", "🎉", "🎊", "🚀", "👀", "💬",
] as const;

type PickerTab = "emoji" | "sticker" | "giphy";

function insertEmojiAtCursor(emoji: string) {
  const editable = document.querySelector(
    ".fpl-ermis-chat .ermis-message-input__editable",
  );

  if (!(editable instanceof HTMLElement)) return;

  editable.focus();

  const selection = window.getSelection();
  const range =
    selection?.rangeCount &&
    editable.contains(selection.getRangeAt(0).commonAncestorContainer)
      ? selection.getRangeAt(0)
      : document.createRange();

  if (!selection?.rangeCount || !editable.contains(range.commonAncestorContainer)) {
    range.selectNodeContents(editable);
    range.collapse(false);
  }

  range.deleteContents();
  const emojiNode = document.createTextNode(emoji);
  range.insertNode(emojiNode);
  range.setStartAfter(emojiNode);
  range.collapse(true);

  selection?.removeAllRanges();
  selection?.addRange(range);
  editable.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      data: emoji,
      inputType: "insertText",
    }),
  );
}

function resolveStickerUrl(rawUrl: string, stickerIframeUrl: string) {
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

  const giphyPrefix = "mxc://giphy.mau.dev/";
  if (rawUrl.startsWith(giphyPrefix)) {
    const gifId = rawUrl.slice(giphyPrefix.length);
    return `https://i.giphy.com/media/${encodeURIComponent(gifId)}/giphy.webp`;
  }

  return new URL(
    rawUrl.replace(/^\/+/, ""),
    `${stickerIframeUrl.replace(/\/+$/, "")}/`,
  ).href;
}

export function ChatMediaToggleButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-chat-media-trigger
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label="Mở emoji, sticker và GIF"
      title="Emoji, sticker và GIF"
      aria-expanded={active}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-primary/10 text-primary",
      )}
    >
      <SmilePlus className="block h-[18px] w-[18px]" />
    </button>
  );
}

export function ChatMediaPicker({
  channel,
  open,
  onClose,
  stickerIframeUrl = DEFAULT_STICKER_IFRAME_URL,
}: {
  channel: CoreChannel;
  open: boolean;
  onClose: () => void;
  stickerIframeUrl?: string;
}) {
  const [activeTab, setActiveTab] = useState<PickerTab>("emoji");
  const [isSendingSticker, setIsSendingSticker] = useState(false);
  const [isSendingGiphy, setIsSendingGiphy] = useState(false);
  const [stickerError, setStickerError] = useState("");
  const [giphyError, setGiphyError] = useState("");
  const [hasOpenedGiphy, setHasOpenedGiphy] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (pickerRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-chat-media-trigger]")) {
        return;
      }
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    const allowedOrigin = new URL(stickerIframeUrl).origin;

    const handleStickerMessage = async (event: MessageEvent) => {
      if (!open || activeTab !== "sticker" || isSendingSticker) return;
      if (event.origin !== allowedOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      const rawUrl = event.data?.data?.content?.url;
      if (typeof rawUrl !== "string" || !rawUrl) return;

      setIsSendingSticker(true);
      setStickerError("");

      try {
        await channel.sendMessage({
          text: "",
          attachments: [],
          sticker_url: resolveStickerUrl(rawUrl, stickerIframeUrl),
        });
        onClose();
      } catch {
        setStickerError("Không thể gửi sticker. Vui lòng thử lại.");
      } finally {
        setIsSendingSticker(false);
      }
    };

    window.addEventListener("message", handleStickerMessage);
    return () => window.removeEventListener("message", handleStickerMessage);
  }, [activeTab, channel, isSendingSticker, onClose, open, stickerIframeUrl]);

  const handleGiphySelect = async (url: string) => {
    if (isSendingGiphy) return;

    setIsSendingGiphy(true);
    setGiphyError("");

    try {
      const messageId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(36);
      const stickerUrl = url.includes("#") ? url : `${url}#${messageId}.gif`;

      await channel.sendMessage({
        text: "",
        attachments: [],
        sticker_url: stickerUrl,
      });
      onClose();
    } catch {
      setGiphyError("Không thể gửi GIF. Vui lòng thử lại.");
    } finally {
      setIsSendingGiphy(false);
    }
  };

  return (
    <div
      ref={pickerRef}
      role="dialog"
      aria-label="Chọn emoji, sticker hoặc GIF"
      aria-hidden={!open}
      className={cn(
        "absolute bottom-full right-3 z-50 mb-2 flex h-[min(520px,calc(100dvh-8rem))] w-[min(340px,calc(100vw-1.5rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl transition duration-150 sm:right-4 sm:h-[380px]",
        open
          ? "visible scale-100 opacity-100"
          : "pointer-events-none invisible scale-95 opacity-0",
      )}
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2.5">
        <div
          role="tablist"
          aria-label="Loại nội dung"
          className="grid flex-1 grid-cols-3 rounded-xl bg-muted p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "emoji"}
            onClick={() => setActiveTab("emoji")}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition",
              activeTab === "emoji"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Smile className="h-4 w-4" />
            Emoji
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sticker"}
            onClick={() => {
              setStickerError("");
              setActiveTab("sticker");
            }}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition",
              activeTab === "sticker"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Cat className="h-4 w-4" />
            Sticker
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "giphy"}
            onClick={() => {
              setGiphyError("");
              setHasOpenedGiphy(true);
              setActiveTab("giphy");
            }}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition",
              activeTab === "giphy"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Film className="h-4 w-4" />
            GIF
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng nội dung"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          role="tabpanel"
          className={cn(
            "h-full overflow-y-auto p-3",
            activeTab !== "emoji" && "hidden",
          )}
        >
          <div className="grid grid-cols-8 gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertEmojiAtCursor(emoji)}
                aria-label={`Chèn emoji ${emoji}`}
                className="flex aspect-square items-center justify-center rounded-lg text-xl transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div
          role="tabpanel"
          className={cn("h-full", activeTab !== "sticker" && "hidden")}
        >
          <iframe
            ref={iframeRef}
            src={stickerIframeUrl}
            title="Sticker Picker"
            aria-label="Chọn sticker"
            className="h-full w-full border-0 bg-background"
          />
          {isSendingSticker && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {stickerError && (
            <p className="absolute inset-x-3 bottom-3 rounded-lg bg-destructive px-3 py-2 text-center text-xs text-destructive-foreground shadow-lg">
              {stickerError}
            </p>
          )}
        </div>

        <div
          role="tabpanel"
          className={cn("h-full", activeTab !== "giphy" && "hidden")}
        >
          {hasOpenedGiphy && (
            <ChatGiphyPicker
              active={open && activeTab === "giphy"}
              onSelect={handleGiphySelect}
            />
          )}
          {isSendingGiphy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {giphyError && (
            <p className="absolute inset-x-3 bottom-8 rounded-lg bg-destructive px-3 py-2 text-center text-xs text-destructive-foreground shadow-lg">
              {giphyError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
