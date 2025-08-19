"use client";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/context/theme-context";
import Image from "next/image";
import Link from "next/link";

export const FooterSection = () => {
  const { theme } = useTheme();

  return (
    <footer id="footer" className="container mx-auto px-4 py-6 mt-auto">
      <div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center">
            <Image
              width={180}
              height={70}
              src='/uhm.svg'
              alt="logo"
            />
          </Link>

          <p className="text-muted-foreground text-sm md:text-xl text-right">
            Uhm started with a <br className="block md:hidden" />
            public utility vision
          </p>
        </div>

        <Separator className="my-4" />
        <div className="flex justify-between md:justify-end items-center gap-8 text-sm md:text-md pb-4">
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="opacity-60 hover:opacity-100">
              Privacy
            </Link>
            <Link href="/terms-of-use" className="opacity-60 hover:opacity-100">
              Term of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
