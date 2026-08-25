"use client";

import { useCallback, useState } from "react";
import {
  Copy,
  Ellipsis,
  Forward,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Trash2,
  UserRoundX,
} from "lucide-react";

import {
  Dropdown,
  isSystemMessage,
  MessageQuickReactions,
  type MessageActionsBoxProps,
  useChannelCapabilities,
  useChatClient,
  useMessageActions,
  usePreviewState,
} from "@ermis-network/ermis-chat-react";

import { cn } from "@/lib/utils";

type ActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
};

function ActionButton({
  icon,
  label,
  onClick,
  danger,
  disabled,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => void onClick()}
      disabled={disabled}
      className={cn(
        "flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          danger ? "bg-destructive/10" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

export function ChatMessageActions({
  message,
  isOwnMessage,
}: MessageActionsBoxProps) {
  const {
    activeChannel,
    client,
    setEditingMessage,
    setForwardingMessage,
    setQuotedMessage,
  } = useChatClient();
  const { isGroupChannel: isTeam, isOwner } = useChannelCapabilities();
  const { isPreviewMode } = usePreviewState(activeChannel, client?.userID);
  const actions = useMessageActions(message, isOwnMessage);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [menuAlign, setMenuAlign] = useState<"left" | "right">(
    isOwnMessage ? "right" : "left",
  );
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const closeMenu = useCallback(() => setAnchorRect(null), []);

  const openMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (anchorRect) {
      closeMenu();
      return;
    }

    const nextAnchorRect = event.currentTarget.getBoundingClientRect();
    const chatRect = event.currentTarget
      .closest(".fpl-ermis-chat")
      ?.getBoundingClientRect();
    const leftBoundary = chatRect?.left ?? 0;
    const rightBoundary = chatRect?.right ?? window.innerWidth;
    const dropdownWidth = 232;
    const gutter = 8;

    if (nextAnchorRect.left + dropdownWidth > rightBoundary - gutter) {
      setMenuAlign("right");
    } else if (nextAnchorRect.right - dropdownWidth < leftBoundary + gutter) {
      setMenuAlign("left");
    } else {
      setMenuAlign(isOwnMessage ? "right" : "left");
    }

    setAnchorRect(nextAnchorRect);
  };

  const runAction = async (
    actionName: string,
    action: () => void | Promise<void>,
  ) => {
    if (pendingAction) return;

    setPendingAction(actionName);
    try {
      await action();
      closeMenu();
    } catch (error) {
      console.error(`Failed to ${actionName} message`, error);
    } finally {
      setPendingAction(null);
    }
  };

  const handleCopy = () =>
    runAction("copy", async () => {
      if (message.text) await navigator.clipboard.writeText(message.text);
    });

  const hasRegularActions =
    (actions.canReply && actions.hasCapReply) ||
    (actions.canForward && actions.hasCapQuote) ||
    (actions.canPin && actions.hasCapPin) ||
    (actions.canEdit && actions.hasCapEdit) ||
    actions.canCopy;

  // Compatibility fix for ermis-chat-react 2.1.0: the published hook only
  // allows a team owner to delete for everyone, while the current SDK source
  // also allows members to delete their own messages when they have permission.
  const canDeleteForEveryone =
    !isPreviewMode &&
    !isSystemMessage(message) &&
    message.display_type !== "deleted" &&
    actions.hasCapDelete &&
    ((isTeam && (isOwner || isOwnMessage)) || (!isTeam && isOwnMessage));
  const hasDeleteActions =
    (actions.canDeleteForMe && actions.hasCapDeleteForMe) ||
    canDeleteForEveryone;

  return (
    <>
      <div
        className={cn(
          "fpl-message-actions",
          anchorRect && "fpl-message-actions--active",
        )}
        data-own-message={isOwnMessage || undefined}
      >
        {actions.canReply && actions.hasCapReply && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setQuotedMessage(message);
            }}
            className="fpl-message-actions__button fpl-message-actions__reply"
            aria-label="Trả lời tin nhắn"
            title="Trả lời"
          >
            <Reply className="h-4 w-4" />
          </button>
        )}

        {actions.hasCapReact && (
          <MessageQuickReactions
            message={message}
            isOwnMessage={isOwnMessage}
          />
        )}

        <button
          type="button"
          onClick={openMenu}
          className={cn(
            "fpl-message-actions__button",
            anchorRect && "fpl-message-actions__button--active",
          )}
          aria-label="Mở thao tác tin nhắn"
          aria-expanded={Boolean(anchorRect)}
          title="Thao tác khác"
        >
          <Ellipsis className="h-[18px] w-[18px]" />
        </button>
      </div>

      <Dropdown
        isOpen={Boolean(anchorRect)}
        anchorRect={anchorRect}
        onClose={closeMenu}
        align={menuAlign}
        className="fpl-message-actions-dropdown"
      >
        <div
          role="menu"
          aria-label="Thao tác với tin nhắn"
          className="w-[min(14.5rem,calc(100vw-2rem))] max-h-[min(22rem,65dvh)] overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-xl"
        >
          {actions.canReply && actions.hasCapReply && (
            <ActionButton
              icon={<Reply className="h-4 w-4" />}
              label="Trả lời"
              onClick={() => runAction("reply", () => setQuotedMessage(message))}
              disabled={Boolean(pendingAction)}
            />
          )}

          {actions.canForward && actions.hasCapQuote && (
            <ActionButton
              icon={<Forward className="h-4 w-4" />}
              label="Chuyển tiếp"
              onClick={() =>
                runAction("forward", () => setForwardingMessage(message))
              }
              disabled={Boolean(pendingAction)}
            />
          )}

          {actions.canPin && actions.hasCapPin && (
            <ActionButton
              icon={
                actions.isPinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )
              }
              label={actions.isPinned ? "Bỏ ghim" : "Ghim tin nhắn"}
              onClick={() =>
                runAction("toggle pin", async () => {
                  if (!activeChannel || !message.id) return;
                  if (actions.isPinned) {
                    await activeChannel.unpinMessage(message.id);
                  } else {
                    await activeChannel.pinMessage(message.id);
                  }
                })
              }
              disabled={Boolean(pendingAction)}
            />
          )}

          {actions.canEdit && actions.hasCapEdit && (
            <ActionButton
              icon={<Pencil className="h-4 w-4" />}
              label="Chỉnh sửa"
              onClick={() =>
                runAction("edit", () => setEditingMessage(message))
              }
              disabled={Boolean(pendingAction)}
            />
          )}

          {actions.canCopy && (
            <ActionButton
              icon={<Copy className="h-4 w-4" />}
              label="Sao chép nội dung"
              onClick={handleCopy}
              disabled={Boolean(pendingAction)}
            />
          )}

          {hasRegularActions && hasDeleteActions && (
            <div className="mx-2 my-1 h-px bg-border" />
          )}

          {actions.canDeleteForMe && actions.hasCapDeleteForMe && (
            <ActionButton
              icon={<UserRoundX className="h-4 w-4" />}
              label="Xóa ở phía tôi"
              danger
              onClick={() =>
                runAction("delete for me", async () => {
                  if (!activeChannel || !message.id) return;
                  await activeChannel.deleteMessageForMe(message.id);
                })
              }
              disabled={Boolean(pendingAction)}
            />
          )}

          {canDeleteForEveryone && (
            <ActionButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Xóa với mọi người"
              danger
              onClick={() =>
                runAction("delete for everyone", async () => {
                  if (!activeChannel || !message.id) return;
                  await activeChannel.deleteMessage(message.id);
                })
              }
              disabled={Boolean(pendingAction)}
            />
          )}
        </div>
      </Dropdown>
    </>
  );
}
