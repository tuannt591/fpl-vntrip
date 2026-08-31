"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Loader2,
  LogIn,
  LogOut,
  Users,
} from "lucide-react";

import type {
  Channel,
  ErmisChat,
} from "@ermis-network/ermis-chat-sdk";

import { ChatBox } from "@/components/chat/chat-box";
import { ChatLoading } from "@/components/chat/chat-loading";
import type { AuthSession } from "@/components/chat/types";
import { Button } from "@/components/ui/button";
import { ermisConfig } from "@/config/ermis";
import { applyLegacyBatchUsersQueryFix } from "@/lib/ermis-chat";

type ChannelStatus = "loading" | "join" | "joining" | "chat" | "error";

type CachedChannel = {
  channel: Channel;
  token: string;
  userId: string;
};

let cachedChannel: CachedChannel | null = null;

function getCachedChannel(userId: string | undefined, token: string) {
  return userId && cachedChannel?.userId === userId && cachedChannel.token === token
    ? cachedChannel.channel
    : null;
}

function getUserIdFromToken(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return undefined;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "=",
    );
    const claims = JSON.parse(window.atob(paddedPayload)) as Record<string, unknown>;
    const userId = claims.user_id || claims.sub || claims.id;

    return typeof userId === "string" ? userId : undefined;
  } catch {
    return undefined;
  }
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const apiError = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };

    return (
      apiError.response?.data?.message ||
      apiError.message ||
      "Không thể kết nối đến kênh chat."
    );
  }

  return "Không thể kết nối đến kênh chat.";
}

export function ChannelGate({
  session,
  onLogout,
}: {
  session: AuthSession;
  onLogout: () => Promise<void>;
}) {
  const userId = session.userId || getUserIdFromToken(session.token);
  const initialChannel = getCachedChannel(userId, session.token);
  const [status, setStatus] = useState<ChannelStatus>(() =>
    initialChannel && userId && initialChannel.state.members[userId]
      ? "chat"
      : initialChannel
        ? "join"
        : "loading",
  );
  const [channel, setChannel] = useState<Channel | null>(initialChannel);
  const [errorMessage, setErrorMessage] = useState("");
  const clientRef = useRef<ErmisChat | null>(null);
  const connectionRequestRef = useRef(0);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  useEffect(() => {
    const requestId = connectionRequestRef.current + 1;
    connectionRequestRef.current = requestId;
    let cancelled = false;
    const isCurrentRequest = () =>
      !cancelled && connectionRequestRef.current === requestId;

    const initializeChannel = async () => {
      try {
        const existingChannel = getCachedChannel(userId, session.token);
        if (existingChannel && userId) {
          clientRef.current = existingChannel.getClient();
          setChannel(existingChannel);
          setStatus(
            existingChannel.state.members[userId] ? "chat" : "join",
          );
          setErrorMessage("");
          return;
        }

        setChannel(null);
        setStatus("loading");
        setErrorMessage("");

        if (!userId) {
          throw new Error(
            "Phiên đăng nhập không có user ID. Vui lòng đăng xuất và đăng nhập lại.",
          );
        }

        const disconnectCancelledConnection = async (client: ErmisChat) => {
          if (
            connectionRequestRef.current !== requestId ||
            client.userID !== userId
          ) {
            return;
          }

          try {
            await client.disconnectUser();
          } catch {
            // A cancelled connection may already have been closed by the SDK.
          }
        };

        const { ErmisChat } = await import("@ermis-network/ermis-chat-sdk");
        if (!isCurrentRequest()) return;

        const client = ErmisChat.getInstance(
          ermisConfig.apiKey,
          ermisConfig.projectId,
          ermisConfig.apiUrl,
          { endUserApiMode: "legacy" },
        );
        applyLegacyBatchUsersQueryFix(client);
        clientRef.current = client;

        if (client.userID && client.userID !== userId) {
          await client.disconnectUser();
          if (!isCurrentRequest()) return;
        }

        await client.connectUser(
          {
            id: userId,
            name: session.email,
            email: session.email,
          },
          session.token,
          { refreshToken: session.refreshToken },
        );
        if (!isCurrentRequest()) {
          await disconnectCancelledConnection(client);
          return;
        }

        const queriedChannel = client.channel(
          ermisConfig.channelType,
          ermisConfig.channelId,
        );
        await queriedChannel.watch();

        if (!isCurrentRequest()) {
          await disconnectCancelledConnection(client);
          return;
        }

        cachedChannel = { channel: queriedChannel, token: session.token, userId };
        setChannel(queriedChannel);
        setStatus(queriedChannel.state.members[userId] ? "chat" : "join");
      } catch (error) {
        if (!isCurrentRequest()) return;

        setErrorMessage(getErrorMessage(error));
        setStatus("error");
      }
    };

    void initializeChannel();

    return () => {
      cancelled = true;
    };
  }, [connectionAttempt, session.email, session.refreshToken, session.token, userId]);

  const handleJoin = async () => {
    if (!channel || !userId || status === "joining") return;

    setStatus("joining");
    setErrorMessage("");

    try {
      await channel.acceptInvite("join");
      await channel.watch();
      setChannel(channel);
      setStatus("chat");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setStatus("join");
    }
  };

  const handleLogout = async () => {
    try {
      await clientRef.current?.disconnectUser();
    } catch {
      // The app session is cleared even when the chat connection is already gone.
    } finally {
      cachedChannel = null;
      await onLogout();
    }
  };

  if (status === "chat" && channel && userId) {
    return (
      <ChatBox channel={channel} />
    );
  }

  if (status === "loading") {
    return <ChatLoading />;
  }

  if (status === "error") {
    return (
      <section className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center justify-center bg-card px-5 text-center sm:rounded-3xl sm:border sm:shadow-[0_20px_60px_-38px_rgba(15,23,42,0.35)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-semibold">Không thể mở kênh chat</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {errorMessage}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConnectionAttempt((current) => current + 1)}
            className="gap-2 rounded-xl"
          >
            Thử lại
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleLogout()}
            className="gap-2 rounded-xl"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </section>
    );
  }

  const channelName = channel?.data?.name || "Kênh FPL Vntrip";
  const channelDescription =
    typeof channel?.data?.description === "string" &&
      channel.data.description.trim()
      ? channel.data.description.trim()
      : null;
  const channelMemberCount = channel?.data?.member_count;
  const memberCount =
    typeof channelMemberCount === "number"
      ? channelMemberCount
      : channel
        ? Object.keys(channel.state.members).length
        : 0;

  return (
    <section className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 items-center justify-center overflow-hidden bg-card px-5 py-20 sm:rounded-3xl sm:border sm:py-10 sm:shadow-[0_20px_60px_-38px_rgba(15,23,42,0.35)]">
      <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-primary/10 text-primary ring-4 ring-background shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vntrip-ava.png"
            alt="Ảnh đại diện Vntrip"
            className="h-full w-full object-cover"
          />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Kênh công khai
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{channelName}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {channelDescription ||
            "Bạn chưa tham gia kênh này. Hãy tham gia để xem nội dung và bắt đầu trò chuyện cùng mọi người."}
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {memberCount} thành viên
        </div>

        {errorMessage && (
          <p className="mt-4 flex items-start justify-center gap-1.5 text-xs leading-5 text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {errorMessage}
          </p>
        )}

        <Button
          type="button"
          onClick={() => void handleJoin()}
          disabled={status === "joining"}
          className="mt-6 w-full gap-2 rounded-xl"
        >
          {status === "joining" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {status === "joining" ? "Đang tham gia..." : "Tham gia kênh"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void handleLogout()}
          disabled={status === "joining"}
          className="mt-2 gap-2 text-muted-foreground"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </section>
  );
}
