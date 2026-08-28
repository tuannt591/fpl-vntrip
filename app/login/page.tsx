import type { Metadata } from "next";

import { LoginPage } from "@/components/login-page";

export const metadata: Metadata = {
  title: "Đăng nhập - FPL Vntrip",
  description: "Đăng nhập để sử dụng Chat và H2H trên FPL Vntrip.",
};

export default function Login() {
  return (
    <main className="min-h-[100dvh] w-full sm:px-6 sm:pb-5 sm:pt-4">
      <LoginPage />
    </main>
  );
}
