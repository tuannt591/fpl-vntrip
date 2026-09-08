"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
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
type ManagerFilter = "all" | "available" | "claimed";

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
  const [managerFilter, setManagerFilter] = useState<ManagerFilter>("all");
  const [managerNotice, setManagerNotice] = useState("");

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

  useEffect(() => {
    if (!managerNotice) return;

    const timeoutId = window.setTimeout(() => setManagerNotice(""), 3_500);
    return () => window.clearTimeout(timeoutId);
  }, [managerNotice]);

  const selectedManager =
    data?.managers.find((manager) => manager.entryId === selectedEntryId) ?? null;
  const availableManagers =
    data?.managers.filter((manager) => !manager.claimed || manager.claimedByMe) ?? [];
  const claimedManagers =
    data?.managers.filter((manager) => manager.claimed && !manager.claimedByMe) ?? [];

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

      window.sessionStorage.setItem(
        "fpl-vntrip:h2h-claim-success",
        responseData.manager.teamName,
      );

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
      <div className="rounded-2xl border bg-primary/[0.06] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Bước 1 / 2 · H2H Arena
            </p>
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              Xác nhận đội đại diện của bạn
            </h1>
          </div>
          <span className="hidden rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline">
            Mùa {data.season}
          </span>
        </div>
      </div>

      <section aria-labelledby="manager-list-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="manager-list-title" className="font-bold">Chọn đội FPL</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {availableManagers.length} khả dụng · {claimedManagers.length} đã được claim
            </p>
          </div>
          <div className="flex rounded-xl bg-muted p-1" role="tablist" aria-label="Lọc manager">
            {(
              [
                ["all", "Tất cả"],
                ["available", "Khả dụng"],
                ["claimed", "Đã claim"],
              ] as const
            ).map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={managerFilter === filter}
                onClick={() => setManagerFilter(filter)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  managerFilter === filter
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {(managerFilter === "all" || managerFilter === "available") && (
          <div className="space-y-3">
            {managerFilter === "all" && (
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Khả dụng ({availableManagers.length})
              </p>
            )}
            {availableManagers.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {availableManagers.map((manager) => {
                  const selected = selectedEntryId === manager.entryId;

                  return (
                    <button
                      key={manager.entryId}
                      type="button"
                      onClick={() => {
                        setSelectedEntryId(manager.entryId);
                        setManagerNotice("");
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-card p-4 text-left transition",
                        selected
                          ? "border-primary bg-primary/[0.055] ring-2 ring-primary/10"
                          : "hover:border-primary/35 hover:shadow-sm",
                      )}
                    >
                      <ManagerAvatar manager={manager} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{manager.teamName}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {manager.managerName}
                        </p>
                      </div>
                      {selected ? (
                        <UserCheck className="h-5 w-5 text-primary" aria-label="Đã chọn" />
                      ) : (
                        <span className="h-5 w-5 rounded-full border-2" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                Hiện không còn manager khả dụng để claim.
              </p>
            )}
          </div>
        )}

        {(managerFilter === "all" || managerFilter === "claimed") && (
          <div className="space-y-3">
            {managerFilter === "all" && (
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Đã được claim ({claimedManagers.length})
              </p>
            )}
            {claimedManagers.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {claimedManagers.map((manager) => (
                  <button
                    key={manager.entryId}
                    type="button"
                    aria-disabled="true"
                    onClick={() => setManagerNotice("Manager này đã được một tài khoản khác xác nhận.")}
                    className="flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/35 p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ManagerAvatar manager={manager} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{manager.teamName}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {manager.managerName}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                      <LockKeyhole className="h-3 w-3" aria-hidden="true" />
                      Đã claim
                    </span>
                  </button>
                ))}
              </div>
            ) : managerFilter === "claimed" ? (
              <p className="rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                Chưa có manager nào được claim.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {managerNotice && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-3 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-start gap-2 rounded-xl border border-amber-500/30 bg-background/95 p-3 text-sm text-amber-800 shadow-xl backdrop-blur animate-in fade-in slide-in-from-bottom-2 dark:text-amber-300 md:bottom-5"
        >
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          {managerNotice}
        </div>
      )}

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
            ? `Tiếp tục với ${selectedManager.teamName}`
            : "Chọn một manager để tiếp tục"}
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
