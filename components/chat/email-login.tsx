"use client";

import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

import type { ErmisAuthProvider } from "@ermis-network/ermis-chat-sdk";

import { Button } from "@/components/ui/button";
import { ChatBackButton } from "@/components/chat/chat-back-button";
import { ermisConfig } from "@/config/ermis";
import { cn } from "@/lib/utils";
import type { AuthSession } from "./types";

type AuthFeedbackData = {
  type: "error" | "success";
  message: string;
};

const createEmptyOtp = () => Array<string>(6).fill("");

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const apiError = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };

    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
}

function AuthFeedback({ feedback }: { feedback: AuthFeedbackData | null }) {
  if (!feedback) return null;

  return (
    <div aria-live="polite" className="mt-2 text-xs leading-5">
      <p
        className={cn(
          "flex items-start gap-1.5",
          feedback.type === "error"
            ? "text-destructive"
            : "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {feedback.type === "error" ? (
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        )}
        {feedback.message}
      </p>
    </div>
  );
}

export function EmailLogin({
  onAuthenticated,
}: {
  onAuthenticated: (session: AuthSession) => void | Promise<void>;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(createEmptyOtp);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [countdown, setCountdown] = useState(60);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedbackData | null>(null);
  const authProviderRef = useRef<ErmisAuthProvider | null>(null);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const normalizedEmail = email.trim().toLowerCase();
  const canSendOtp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  useEffect(() => {
    if (step !== "otp") return;

    const timer = window.setInterval(() => {
      setCountdown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step]);

  const getAuthProvider = async () => {
    if (!authProviderRef.current) {
      const { ErmisAuthProvider } = await import("@ermis-network/ermis-chat-sdk");
      authProviderRef.current = new ErmisAuthProvider(
        ermisConfig.apiKey,
        ermisConfig.apiUrl,
        { endUserApiMode: "legacy" },
      );
    }

    return authProviderRef.current;
  };

  const sendOtp = async () => {
    if (!canSendOtp || isSending || (step === "otp" && countdown > 0)) return;

    setIsSending(true);
    setFeedback(null);

    try {
      const authProvider = await getAuthProvider();
      const response = await authProvider.sendOtpToEmail(normalizedEmail);

      if (response.success === false) {
        throw new Error(response.message || "Không thể gửi mã OTP.");
      }

      setStep("otp");
      setCountdown(60);
      setOtp(createEmptyOtp());
      setFeedback({
        type: "success",
        message: `Mã OTP đã được gửi đến ${normalizedEmail}.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getAuthErrorMessage(error, "Không thể gửi mã OTP. Vui lòng thử lại."),
      });
    } finally {
      setIsSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.every(Boolean) || isVerifying || step !== "otp") return;

    setIsVerifying(true);
    setFeedback(null);

    try {
      const authProvider = await getAuthProvider();
      const response = await authProvider.verifyOtp(otp.join(""));

      if (response.success === false) {
        throw new Error(response.message || "Mã OTP không chính xác.");
      }

      const token = response.token || response.access_token;
      if (!token) {
        throw new Error("Ermis không trả về token đăng nhập.");
      }

      await onAuthenticated({
        token,
        refreshToken: response.refresh_token,
        userId: response.user_id || response.user?.id,
        email: normalizedEmail,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getAuthErrorMessage(error, "Xác thực thất bại. Vui lòng kiểm tra lại mã OTP."),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const changeEmail = () => {
    setStep("email");
    setOtp(createEmptyOtp());
    setCountdown(60);
    setFeedback(null);
    authProviderRef.current = null;
  };

  const updateOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    setOtp((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    setFeedback(null);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      event.preventDefault();
      setOtp((current) => {
        const next = [...current];
        next[index - 1] = "";
        return next;
      });
      otpInputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;

    event.preventDefault();
    const next = createEmptyOtp();
    digits.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setOtp(next);
    setFeedback(null);
    otpInputRefs.current[Math.min(digits.length, 6) - 1]?.focus();
  };

  const submitEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendOtp();
  };

  const submitOtp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void verifyOtp();
  };

  return (
    <section className="relative mx-auto min-h-[100dvh] max-w-5xl overflow-hidden bg-card sm:h-[calc(100dvh-2.25rem)] sm:min-h-0 sm:rounded-3xl sm:border sm:shadow-[0_20px_60px_-38px_rgba(15,23,42,0.35)]">
      <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative grid min-h-[100dvh] grid-rows-[auto_1fr] sm:h-full sm:min-h-0 md:grid-cols-[minmax(17rem,0.85fr)_minmax(0,1.15fr)] md:grid-rows-1">
        <div className="border-b bg-primary/[0.06] p-5 sm:p-6 md:flex md:flex-col md:border-b-0 md:border-r md:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-3">
            <ChatBackButton className="-ml-2" />
            <button
              type="button"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              aria-label={
                resolvedTheme === "dark"
                  ? "Chuyển sang giao diện sáng"
                  : "Chuyển sang giao diện tối"
              }
              title={
                resolvedTheme === "dark"
                  ? "Giao diện sáng"
                  : "Giao diện tối"
              }
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-[17px] w-[17px]" />
              ) : (
                <Moon className="h-[17px] w-[17px]" />
              )}
            </button>
          </div>

          <div className="mt-4 md:my-auto md:py-8">
            <p className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-primary md:block">
              Kênh trò chuyện cộng đồng
            </p>
            <h1 className="text-xl font-bold tracking-tight md:mt-3 md:max-w-sm md:text-3xl md:leading-tight">
              Đăng nhập bằng email
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground md:mt-4 md:text-[15px]">
              Nhập email để nhận mã OTP và tham gia kênh trò chuyện.
            </p>

            <div className="mt-7 hidden space-y-3 md:block">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </span>
                <span>Nhận mã xác thực trực tiếp qua email</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span>Đăng nhập nhanh, không cần mật khẩu</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[230px] items-start p-5 pt-8 sm:items-center sm:p-6 md:bg-muted/20 md:p-8 lg:p-12">
          {step === "email" ? (
            <form
              className="mx-auto w-full max-w-md md:rounded-2xl md:border md:bg-card md:p-6 md:shadow-sm lg:p-7"
              onSubmit={submitEmail}
            >
              <div className="mb-6 hidden md:block">
                <h2 className="text-lg font-semibold">Bắt đầu trò chuyện</h2>
                <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                  Sử dụng email công việc hoặc email cá nhân của bạn.
                </p>
              </div>
              <label htmlFor="email-address" className="mb-2 block text-sm font-medium">
                Địa chỉ email
              </label>
              <div className="flex h-12 items-center rounded-xl border bg-background px-3 transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10">
                <Mail className="mr-2 h-4 w-4 shrink-0 text-primary" />
                <input
                  id="email-address"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value.slice(0, 254));
                    setFeedback(null);
                    authProviderRef.current = null;
                  }}
                  disabled={isSending}
                  placeholder="ban@example.com"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              <AuthFeedback feedback={feedback} />

              <Button
                type="submit"
                disabled={!canSendOtp || isSending}
                className="mt-3 w-full gap-2 rounded-xl"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {isSending ? "Đang gửi mã..." : "Gửi mã OTP"}
              </Button>
            </form>
          ) : (
            <form
              className="mx-auto w-full max-w-md md:rounded-2xl md:border md:bg-card md:p-6 md:shadow-sm lg:p-7"
              onSubmit={submitOtp}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Nhập mã xác thực</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Mã OTP đã được gửi đến{" "}
                    <span className="font-medium text-foreground">{normalizedEmail}</span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={changeEmail}
                  disabled={isVerifying || isSending}
                  className="shrink-0 text-xs"
                >
                  Đổi email
                </Button>
              </div>

              <label htmlFor="otp-code" className="mb-2 block text-sm font-medium">
                Mã OTP
              </label>
              <div
                className="flex max-w-sm items-center justify-between gap-1.5 sm:gap-2"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpInputRefs.current[index] = element;
                    }}
                    id={index === 0 ? "otp-code" : undefined}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    autoFocus={index === 0}
                    maxLength={1}
                    value={digit}
                    disabled={isVerifying}
                    onChange={(event) => updateOtpDigit(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    aria-label={`Chữ số OTP ${index + 1}`}
                    className="h-11 w-11 rounded-xl border bg-background text-center font-mono text-lg font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 sm:w-12"
                  />
                ))}
              </div>

              <AuthFeedback feedback={feedback} />

              <Button
                type="submit"
                disabled={!otp.every(Boolean) || isVerifying || isSending}
                className="mt-3 w-full gap-2 rounded-xl"
              >
                {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
                {isVerifying ? "Đang xác thực..." : "Xác nhận và đăng nhập"}
              </Button>

              <div className="mt-3 flex items-center justify-center text-xs text-muted-foreground">
                {countdown > 0 ? (
                  <span>Gửi lại mã sau 00:{String(countdown).padStart(2, "0")}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void sendOtp()}
                    disabled={isSending}
                    className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {isSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Gửi lại mã OTP
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
