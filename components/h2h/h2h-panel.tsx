"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import {
  H2HDashboard,
  type H2HDashboardData,
} from "@/components/h2h/h2h-dashboard";
import { H2HLoadingSkeleton } from "@/components/h2h/h2h-loading-skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ApiRequestError,
  getCachedManagerOptions,
  loadManagerOptions,
  setCachedManagerOptions,
  type ManagerOptionsResponse,
} from "@/lib/tab-data";
import type {
  AppProfile,
  ClaimedManager,
  H2HManagerOption,
} from "@/types/h2h";

type ViewState = "loading" | "anonymous" | "ready" | "error";

function normalizeManagerOptions(responseData: ManagerOptionsResponse) {
  const myManager = responseData.myManager;
  return {
    ...responseData,
    myManager,
    managers: myManager
      ? responseData.managers.map((manager) => ({
          ...manager,
          claimed: manager.claimed || manager.entryId === myManager.entryId,
          claimedByMe: manager.entryId === myManager.entryId,
        }))
      : responseData.managers,
  };
}

function ManagerAvatar({ manager }: { manager: H2HManagerOption }) {
  if (manager.managerAvatar) {
    return (
      <Image
        src={manager.managerAvatar}
        alt={manager.managerName}
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-2xl object-cover"
        unoptimized
      />
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
      {manager.managerName.charAt(0).toUpperCase()}
    </div>
  );
}

export function H2HPanel() {
  const router = useRouter();
  const initialData = getCachedManagerOptions()?.data;
  const [viewState, setViewState] = useState<ViewState>(() =>
    initialData ? "ready" : "loading",
  );
  const [data, setData] = useState<ManagerOptionsResponse | null>(
    () => (initialData ? normalizeManagerOptions(initialData) : null),
  );
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadManagerData = useCallback(async (force = false) => {
    const cached = getCachedManagerOptions();
    if (cached) setData(normalizeManagerOptions(cached.data));
    if (!cached || force) setViewState("loading");
    setErrorMessage("");

    try {
      const responseData = await loadManagerOptions(force);
      setData(normalizeManagerOptions(responseData));
      setViewState("ready");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setViewState("anonymous");
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : "Không thể tải dữ liệu H2H.",
      );
      setViewState("error");
    }
  }, []);

  useEffect(() => {
    void loadManagerData();
  }, [loadManagerData]);

  useEffect(() => {
    if (viewState === "anonymous") {
      router.replace("/login?next=%2Fh2h");
    }
  }, [router, viewState]);

  const selectedManager =
    data?.managers.find((manager) => manager.entryId === selectedEntryId) ?? null;

  const claimManager = async () => {
    if (!selectedManager || isClaiming) return;

    setIsClaiming(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/h2h/claim", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entryId: selectedManager.entryId }),
      });
      if (response.status === 401) {
        setViewState("anonymous");
        return;
      }

      const responseData = (await response.json()) as {
        manager?: ClaimedManager;
        error?: string;
      };
      if (!response.ok || !responseData.manager) {
        throw new Error(responseData.error || "Không thể claim manager.");
      }

      setData((current) =>
        current
          ? {
              ...current,
              myManager: responseData.manager!,
              managers: current.managers.map((manager) => ({
                ...manager,
                claimed:
                  manager.claimed ||
                  manager.entryId === responseData.manager!.entryId,
                claimedByMe: manager.entryId === responseData.manager!.entryId,
              })),
            }
          : current,
      );
      if (data) {
        setCachedManagerOptions({
          ...data,
          myManager: responseData.manager,
          managers: data.managers.map((manager) => ({
            ...manager,
            claimed: manager.claimed || manager.entryId === responseData.manager!.entryId,
            claimedByMe: manager.entryId === responseData.manager!.entryId,
          })),
        });
      }
      setSelectedEntryId(null);
      setClaimDialogOpen(false);
      window.dispatchEvent(
        new CustomEvent("fpl-vntrip:manager-claimed", {
          detail: { managerAvatar: responseData.manager.managerAvatar },
        }),
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể claim manager.",
      );
    } finally {
      setIsClaiming(false);
    }
  };

  if (viewState === "loading" || viewState === "anonymous") {
    return <H2HLoadingSkeleton />;
  }

  if (viewState === "error" || !data) {
    return (
      <Card className="mx-auto max-w-xl rounded-3xl border-destructive/40">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">
            {errorMessage || "Không thể tải dữ liệu H2H."}
          </p>
          <Button variant="outline" onClick={() => void loadManagerData(true)}>
            Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (data.myManager) {
    return <H2HDashboard data={data as H2HDashboardData} />;
  }

  return (
    <div className="w-full space-y-5">
      <div className="rounded-3xl border bg-gradient-to-br from-primary/[0.09] to-transparent p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Xác nhận manager của bạn
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Mỗi tài khoản chỉ claim một manager trong mùa {data.season}. Hãy
              chọn đúng trước khi bước vào H2H Arena.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.managers.map((manager) => {
          const selected = selectedEntryId === manager.entryId;
          const unavailable = manager.claimed && !manager.claimedByMe;

          return (
            <button
              key={manager.entryId}
              type="button"
              disabled={unavailable}
              onClick={() => setSelectedEntryId(manager.entryId)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-card p-4 text-left transition",
                selected
                  ? "border-primary bg-primary/[0.055] ring-2 ring-primary/10"
                  : "hover:border-primary/35 hover:shadow-sm",
                unavailable && "cursor-not-allowed opacity-40",
              )}
            >
              <ManagerAvatar manager={manager} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{manager.teamName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {manager.managerName}
                </p>
              </div>
              {unavailable ? (
                <span className="text-[11px] text-muted-foreground">Đã claim</span>
              ) : selected ? (
                <UserCheck className="h-5 w-5 text-primary" />
              ) : (
                <span className="h-5 w-5 rounded-full border-2" />
              )}
            </button>
          );
        })}
      </div>

      {errorMessage && (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {errorMessage}
        </p>
      )}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] rounded-2xl border bg-background/90 p-3 shadow-xl backdrop-blur md:bottom-3">
        <Button
          className="w-full rounded-xl"
          disabled={!selectedManager}
          onClick={() => selectedManager && setClaimDialogOpen(true)}
        >
          {selectedManager
            ? `Claim ${selectedManager.teamName}`
            : "Chọn manager để tiếp tục"}
        </Button>
      </div>

      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận manager</DialogTitle>
            <DialogDescription>
              Sau khi xác nhận, bạn không thể tự đổi manager trong mùa này.
            </DialogDescription>
          </DialogHeader>
          {selectedManager && (
            <div className="flex items-center gap-3 rounded-2xl border bg-muted/30 p-4">
              <ManagerAvatar manager={selectedManager} />
              <div>
                <p className="font-semibold">{selectedManager.teamName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedManager.managerName} · Entry #{selectedManager.entryId}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Manager này sẽ đại diện cho tài khoản Chat của bạn trong mọi trận H2H.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isClaiming}
              onClick={() => setClaimDialogOpen(false)}
            >
              Chọn lại
            </Button>
            <Button type="button" disabled={isClaiming} onClick={claimManager}>
              {isClaiming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isClaiming ? "Đang liên kết..." : "Xác nhận claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
