"use client";

import { type TouchEvent, useEffect, useRef, useState } from "react";
import { Cat, Film, Loader2, Smile, SmilePlus, X } from "lucide-react";

import type { Channel as CoreChannel } from "@ermis-network/ermis-chat-sdk";

import { ChatGiphyPicker } from "@/components/chat/chat-giphy-picker";
import { Skeleton } from "@/components/ui/skeleton";
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

const QUICK_REACTIONS = ["😂", "❤️", "👍", "🔥", "👏", "🎉"] as const;
const RECENT_EMOJIS_STORAGE_KEY = "fpl-vntrip:recent-emojis";

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
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [isStickerLoading, setIsStickerLoading] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sheetTouchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const savedEmojis = JSON.parse(
        window.localStorage.getItem(RECENT_EMOJIS_STORAGE_KEY) || "[]",
      );

      if (Array.isArray(savedEmojis)) {
        setRecentEmojis(
          savedEmojis.filter((emoji): emoji is string => typeof emoji === "string"),
        );
      }
    } catch {
      // The picker remains usable when private browsing blocks local storage.
    }
  }, []);

  useEffect(() => {
    setIsStickerLoading(true);
  }, [stickerIframeUrl]);

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

  const handleEmojiSelect = (emoji: string) => {
    insertEmojiAtCursor(emoji);
    setRecentEmojis((current) => {
      const next = [emoji, ...current.filter((item) => item !== emoji)].slice(0, 12);

      try {
        window.localStorage.setItem(RECENT_EMOJIS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // The current selection still works when storage is unavailable.
      }

      return next;
    });
  };

  const handleSheetTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    sheetTouchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleSheetTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startY = sheetTouchStartYRef.current;
    const endY = event.changedTouches[0]?.clientY;
    sheetTouchStartYRef.current = null;

    if (startY !== null && endY && endY - startY > 56) {
      onClose();
    }
  };

  const activeTabIndex = activeTab === "emoji" ? 0 : activeTab === "sticker" ? 1 : 2;

  return (
    <>
      <button
        type="button"
        aria-label="Đóng bảng emoji, sticker và GIF"
        onClick={onClose}
        className={cn(
          "absolute bottom-full left-1/2 z-40 h-[100dvh] w-screen -translate-x-1/2 bg-foreground/15 backdrop-blur-[1px] transition-opacity sm:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        ref={pickerRef}
        role="dialog"
        aria-label="Chọn emoji, sticker hoặc GIF"
        aria-hidden={!open}
        className={cn(
          "absolute inset-x-0 bottom-full z-50 flex h-[min(58dvh,30rem)] w-full origin-bottom flex-col overflow-hidden rounded-t-[1.5rem] border border-b-0 bg-popover/95 text-popover-foreground shadow-[0_-20px_55px_-30px_rgba(15,23,42,0.55)] backdrop-blur-xl transition duration-200 sm:inset-x-auto sm:right-4 sm:mb-2 sm:h-[420px] sm:max-h-[calc(100dvh_-_16rem)] sm:w-[min(440px,calc(100vw-2rem))] sm:origin-bottom-right sm:rounded-2xl sm:border sm:bg-popover sm:shadow-[0_24px_70px_-35px_rgba(15,23,42,0.45)]",
          open
            ? "visible translate-y-0 opacity-100 sm:scale-100"
            : "pointer-events-none invisible translate-y-5 opacity-0 sm:translate-y-0 sm:scale-95",
        )}
      >
        <div
          aria-hidden="true"
          onTouchStart={handleSheetTouchStart}
          onTouchEnd={handleSheetTouchEnd}
          className="flex shrink-0 justify-center py-2 sm:hidden"
        >
          <span className="h-1 w-10 rounded-full bg-muted-foreground/35" />
        </div>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2.5">
          <div
            role="tablist"
            aria-label="Loại nội dung"
            className="relative grid flex-1 grid-cols-3 rounded-xl bg-muted p-1"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%_-_0.5rem)_/_3)] rounded-lg bg-background shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{ transform: `translateX(${activeTabIndex * 100}%)` }}
            />
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "emoji"}
              onClick={() => setActiveTab("emoji")}
              className={cn(
                "relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-[color,transform] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                activeTab === "emoji"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Smile
                className={cn(
                  "h-4 w-4 transition-transform duration-300 motion-reduce:transition-none",
                  activeTab === "emoji" && "scale-110",
                )}
              />
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
                "relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-[color,transform] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                activeTab === "sticker"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Cat
                className={cn(
                  "h-4 w-4 transition-transform duration-300 motion-reduce:transition-none",
                  activeTab === "sticker" && "scale-110",
                )}
              />
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
                "relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-[color,transform] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                activeTab === "giphy"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Film
                className={cn(
                  "h-4 w-4 transition-transform duration-300 motion-reduce:transition-none",
                  activeTab === "giphy" && "scale-110",
                )}
              />
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
            <div className="mb-3 rounded-2xl bg-muted/65 p-2">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {recentEmojis.length ? "Dùng gần đây" : "Phản ứng nhanh"}
              </p>
              <div className="mt-1.5 grid grid-cols-6 gap-1">
                {(recentEmojis.length ? recentEmojis.slice(0, 6) : QUICK_REACTIONS).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleEmojiSelect(emoji)}
                    aria-label={`Chèn emoji ${emoji}`}
                    className="flex h-10 items-center justify-center rounded-xl text-xl transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 sm:grid-cols-10">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleEmojiSelect(emoji)}
                aria-label={`Chèn emoji ${emoji}`}
                className="flex aspect-square min-h-10 items-center justify-center rounded-xl text-xl transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              onLoad={() => setIsStickerLoading(false)}
              className="h-full w-full border-0 bg-background"
            />
            {isStickerLoading && (
              <div className="absolute inset-0 grid grid-cols-3 content-start gap-2 bg-background/90 p-3 backdrop-blur-sm">
                {([0, 1, 2, 3, 4, 5] as const).map((index) => (
                  <Skeleton key={index} className="aspect-square rounded-2xl" />
                ))}
              </div>
            )}
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
    </>
  );
}
