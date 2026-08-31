"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Sparkles, X } from "lucide-react";

import { ermisConfig } from "@/config/ermis";
import { cn } from "@/lib/utils";

type GiphyType = "gifs" | "stickers";

type GiphyItem = {
  id: string;
  title: string;
  images: {
    fixed_height: {
      url: string;
    };
    downsized_medium?: {
      url: string;
    };
    original: {
      url: string;
    };
  };
};

type GiphyResponse = {
  data?: GiphyItem[];
  meta?: {
    status?: number;
  };
};

const SUGGESTIONS = [
  { label: "Xu hướng", query: "" },
  { label: "Reaction", query: "reaction" },
  { label: "Vui nhộn", query: "funny" },
  { label: "Meme", query: "meme" },
  { label: "Bóng đá", query: "football" },
] as const;

const giphyCache = new Map<string, GiphyItem[]>();

function getBestGiphyUrl(item: GiphyItem) {
  return (
    item.images.downsized_medium?.url ||
    item.images.fixed_height.url ||
    item.images.original.url
  );
}

export function ChatGiphyPicker({
  active,
  onSelect,
}: {
  active: boolean;
  onSelect: (url: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [type, setType] = useState<GiphyType>("gifs");
  const [items, setItems] = useState<GiphyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!active) return;

    if (!ermisConfig.giphyApiKey) {
      setItems([]);
      setLoading(false);
      setError("Chưa cấu hình khóa GIPHY trong config/ermis.ts.");
      return;
    }

    const cacheKey = `${type}:${debouncedQuery.toLocaleLowerCase()}`;
    const cachedItems = giphyCache.get(cacheKey);

    if (cachedItems) {
      setItems(cachedItems);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    const endpoint = debouncedQuery ? "search" : "trending";
    const params = new URLSearchParams({
      api_key: ermisConfig.giphyApiKey,
      limit: "30",
      rating: "g",
      ...(debouncedQuery ? { q: debouncedQuery } : {}),
    });

    setLoading(true);
    setError("");

    void fetch(
      `https://api.giphy.com/v1/${type}/${endpoint}?${params.toString()}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const result = (await response.json()) as GiphyResponse;
        if (!response.ok || result.meta?.status !== 200) {
          throw new Error("GIPHY request failed");
        }

        const nextItems = result.data ?? [];
        giphyCache.set(cacheKey, nextItems);
        setItems(nextItems);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }
        setItems([]);
        setError("Không thể tải GIF. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [active, debouncedQuery, type]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2 border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kiếm trên GIPHY..."
            aria-label="Tìm kiếm GIF trên GIPHY"
            className="h-9 w-full rounded-xl bg-muted pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
          {(["gifs", "stickers"] as const).map((itemType) => (
            <button
              key={itemType}
              type="button"
              onClick={() => setType(itemType)}
              className={cn(
                "h-7 rounded-md text-xs font-medium transition",
                type === itemType
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {itemType === "gifs" ? "GIF" : "GIPHY Sticker"}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {SUGGESTIONS.map((suggestion) => {
            const selected = query === suggestion.query;

            return (
              <button
                key={suggestion.label}
                type="button"
                onClick={() => setQuery(suggestion.query)}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {!suggestion.query && <Sparkles className="h-3 w-3" />}
                {suggestion.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs">Đang tải GIF...</span>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Không tìm thấy GIF phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void onSelect(getBestGiphyUrl(item))}
                aria-label={item.title || "Gửi GIF"}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.images.fixed_height.url}
                  alt={item.title || "GIF từ GIPHY"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t bg-muted/40 px-3 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Powered by GIPHY
      </div>
    </div>
  );
}
