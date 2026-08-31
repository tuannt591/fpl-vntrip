"use client";

import { useCallback, useEffect, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { useTheme } from "next-themes";

import type { Channel as CoreChannel } from "@ermis-network/ermis-chat-sdk";
import {
  type AttachButtonProps,
  Channel,
  ChatProvider,
  MessageInput,
  type SendButtonProps,
  VirtualMessageList,
  useChatClient,
} from "@ermis-network/ermis-chat-react";

import { Button } from "@/components/ui/button";
import {
  ChatMediaPicker,
  ChatMediaToggleButton,
} from "@/components/chat/chat-media-picker";
import { ChatMessageActions } from "@/components/chat/chat-message-actions";
import {
  CHAT_SYSTEM_TRANSLATIONS,
  resolveChatLanguage,
  type ChatLanguage,
} from "@/components/chat/chat-system-translations";

function ChatAttachButton({ disabled, onClick }: AttachButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Đính kèm tệp"
      title="Đính kèm tệp"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Paperclip className="block h-[18px] w-[18px]" />
    </button>
  );
}

function ChatSendButton({ disabled, onClick }: SendButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Gửi tin nhắn"
      title="Gửi tin nhắn"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60"
    >
      <Send className="block h-[18px] w-[18px]" />
    </button>
  );
}

function HiddenVoiceRecordButton() {
  return null;
}

function ChatChannel({
  channel,
}: {
  channel: CoreChannel;
}) {
  const { resolvedTheme } = useTheme();
  const { setActiveChannel, setTheme: setChatTheme } = useChatClient();
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [chatLanguage, setChatLanguage] = useState<ChatLanguage>("vi");
  const channelMemberCount = channel.data?.member_count;
  const memberCount =
    typeof channelMemberCount === "number"
      ? channelMemberCount
      : Object.keys(channel.state.members).length;
  const channelName = channel.data?.name || "Kênh FPL Vntrip";

  useEffect(() => {
    setActiveChannel(channel);

    return () => setActiveChannel(null);
  }, [channel, setActiveChannel]);

  useEffect(() => {
    setChatTheme(resolvedTheme === "dark" ? "dark" : "light");
  }, [resolvedTheme, setChatTheme]);

  useEffect(() => {
    const root = document.documentElement;
    const updateLanguage = () => {
      setChatLanguage(
        resolveChatLanguage(root.lang || window.navigator.language),
      );
    };

    updateLanguage();
    const observer = new MutationObserver(updateLanguage);
    observer.observe(root, { attributes: true, attributeFilter: ["lang"] });

    return () => observer.disconnect();
  }, []);

  const closeMediaPicker = useCallback(() => setMediaPickerOpen(false), []);
  const MediaPickerButton = useCallback(
    () => (
      <ChatMediaToggleButton
        active={mediaPickerOpen}
        onClick={() => setMediaPickerOpen((current) => !current)}
      />
    ),
    [mediaPickerOpen],
  );

  return (
    <Channel>
      <header className="flex min-h-[64px] shrink-0 items-center gap-2 border-b bg-background px-2.5 sm:min-h-[76px] sm:gap-3 sm:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary sm:h-10 sm:w-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vntrip-ava.png"
            alt="Ảnh đại diện Vntrip"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold sm:text-base">
            {channelName}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {memberCount} thành viên
          </p>
        </div>
      </header>

      <VirtualMessageList
        dateLocale={chatLanguage === "vi" ? "vi-VN" : "en-US"}
        systemMessageTranslations={CHAT_SYSTEM_TRANSLATIONS[chatLanguage]}
        MessageActionsBoxComponent={ChatMessageActions}
        emptyTitle="Chưa có tin nhắn"
        emptySubtitle="Hãy gửi tin nhắn đầu tiên trong kênh này."
        jumpToLatestLabel="↓ Xem tin nhắn mới nhất"
        pinnedMessagesLabel={(count) => `${count} tin nhắn đã ghim`}
        seeAllLabel="Xem tất cả"
        collapseLabel="Thu gọn"
        unpinLabel="Bỏ ghim"
        deletedMessageLabel="Tin nhắn đã bị xóa"
        attachmentLabel="Tệp đính kèm"
        unavailableMessageLabel="Tin nhắn không khả dụng"
        typingIndicatorLabel={(users) => {
          const names = users.map((user) => user.name || "Thành viên").join(", ");
          return `${names} đang nhập...`;
        }}
        showReadReceipts
        showTypingIndicator
      />

      <div className="relative z-30 shrink-0">
        <ChatMediaPicker
          channel={channel}
          open={mediaPickerOpen}
          onClose={closeMediaPicker}
        />
        <MessageInput
          AttachButton={ChatAttachButton}
          SendButton={ChatSendButton}
          StickerButtonComponent={MediaPickerButton}
          VoiceRecordButtonComponent={HiddenVoiceRecordButton}
          placeholder="Nhập tin nhắn..."
          bannedLabel="Bạn đã bị cấm trong kênh này"
          blockedLabel="Bạn đã chặn người dùng này"
          sendDisabledLabel="Bạn không có quyền gửi tin nhắn"
          closedTopicLabel="Chủ đề này đã đóng"
          replyingToLabel="Đang trả lời"
          editingMessageLabel="Đang chỉnh sửa tin nhắn"
          dragAndDropLabel="Thả tệp vào đây để gửi"
          previewOverlayTitle="Tham gia kênh để gửi tin nhắn"
          joinChannelLabel="Tham gia kênh"
        />
      </div>
    </Channel>
  );
}

export function ChatBox({
  channel,
}: {
  channel: CoreChannel;
}) {
  const client = channel.getClient();

  return (
    <section className="fpl-ermis-chat relative mx-auto min-h-0 w-full flex-1 overflow-hidden bg-card sm:max-w-5xl sm:rounded-3xl sm:border sm:shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] sm:dark:shadow-[0_24px_70px_-35px_rgba(0,0,0,0.8)]">
      <ChatProvider client={client} initialTheme="light">
        <ChatChannel channel={channel} />
      </ChatProvider>
    </section>
  );
}
