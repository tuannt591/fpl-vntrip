import type { SystemMessageTranslations } from "@ermis-network/ermis-chat-sdk";

export type ChatLanguage = "vi" | "en";

const VI_SYSTEM_MESSAGES: SystemMessageTranslations = {
  changeName: "{{user}} đã đổi tên kênh thành {{channel}}.",
  changeAvatar: "{{user}} đã thay đổi ảnh đại diện của kênh.",
  changeDescription: "{{user}} đã thay đổi mô tả của kênh.",
  removed: "{{user}} đã bị xóa khỏi kênh.",
  banned: "{{user}} đã bị cấm.",
  unbanned: "{{user}} đã được bỏ cấm.",
  promoted: "{{user}} đã được thăng cấp thành điều hành viên.",
  demoted: "{{user}} không còn là điều hành viên.",
  permissionsUpdated: "Quyền của {{user}} đã được cập nhật.",
  joined: "{{user}} đã tham gia kênh.",
  declined: "{{user}} đã từ chối lời mời tham gia kênh.",
  left: "{{user}} đã rời khỏi kênh.",
  clearedHistory: "{{user}} đã xóa lịch sử trò chuyện.",
  changeType: "{{user}} đã chuyển kênh thành {{type}}.",
  cooldownOn: "{{user}} đã bật thời gian chờ {{duration}}.",
  cooldownOff: "{{user}} đã tắt thời gian chờ.",
  bannedWordsUpdated: "{{user}} đã cập nhật danh sách từ bị cấm.",
  added: "{{user}} đã được thêm vào kênh.",
  adminTransfer:
    "{{admin}} {{user}} đã rời kênh và chuyển quyền quản trị cho {{targetUser}}.",
  pinned: "{{user}} đã ghim một tin nhắn.",
  unpinned: "{{user}} đã bỏ ghim một tin nhắn.",
  public: "công khai",
  private: "riêng tư",
  userFallback: "Người dùng",
  adminFallback: "Quản trị viên",
  durationUnitMin: "phút",
  durationUnitSec: "giây",
};

const EN_SYSTEM_MESSAGES: SystemMessageTranslations = {
  changeName: "{{user}} changed the channel name to {{channel}}.",
  changeAvatar: "{{user}} changed the channel avatar.",
  changeDescription: "{{user}} changed the channel description.",
  removed: "{{user}} was removed from the channel.",
  banned: "{{user}} was banned.",
  unbanned: "{{user}} was unbanned.",
  promoted: "{{user}} was promoted to moderator.",
  demoted: "{{user}} was demoted from moderator.",
  permissionsUpdated: "{{user}}'s permissions were updated.",
  joined: "{{user}} joined the channel.",
  declined: "{{user}} declined the channel invitation.",
  left: "{{user}} left the channel.",
  clearedHistory: "{{user}} cleared the chat history.",
  changeType: "{{user}} changed the channel to {{type}}.",
  cooldownOn: "{{user}} enabled cooldown for {{duration}}.",
  cooldownOff: "{{user}} disabled cooldown.",
  bannedWordsUpdated: "{{user}} updated the banned words.",
  added: "{{user}} was added to the channel.",
  adminTransfer:
    "{{admin}} {{user}} left and assigned {{targetUser}} as the new admin.",
  pinned: "{{user}} pinned a message.",
  unpinned: "{{user}} unpinned a message.",
  public: "public",
  private: "private",
  userFallback: "User",
  adminFallback: "Admin",
  durationUnitMin: "minute",
  durationUnitSec: "seconds",
};

export const CHAT_SYSTEM_TRANSLATIONS: Record<
  ChatLanguage,
  SystemMessageTranslations
> = {
  vi: VI_SYSTEM_MESSAGES,
  en: EN_SYSTEM_MESSAGES,
};

export function resolveChatLanguage(language?: string | null): ChatLanguage {
  return language?.toLowerCase().startsWith("en") ? "en" : "vi";
}
