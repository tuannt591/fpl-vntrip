import { Main } from "@/components/layout/sections/main";
import { HeaderSection } from "@/components/layout/sections/headerSection";
import { CountdownSection } from "@/components/layout/sections/countdownSection";

export const metadata = {
  title: "Uhm Landing Page",
  description: "Uhmm...! - A modern, secure chat app that connects people quickly and easily",
};

export default function Home() {
  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/bg-1.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="relative z-10">
        <HeaderSection />
        <div className="text-center space-y-4">
          <Main />
          <CountdownSection />
        </div>
        {/* <FooterSection /> */}
      </div>
    </div>
  );
}
