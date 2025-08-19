"use client";
import { Menu } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { Separator } from "../ui/separator";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../ui/navigation-menu";
import { Button } from "../ui/button";
import Link from "next/link";
import Image from "next/image";
import { ToggleTheme } from "./toogle-theme";
import { useTheme } from "@/context/theme-context";

interface RouteProps {
  href: string;
  label: string;
}

interface FeatureProps {
  title: string;
  href: string
}

const routeList: RouteProps[] = [
  {
    href: "https://docs.ermis.network/JavaScript/doc",
    label: "Developers",
  },
  {
    href: "/pricing",
    label: "Pricing",
  },
  // {
  //   href: "https://docs.ermis.network/JavaScript/doc",
  //   label: "Blog",
  // },
  // {
  //   href: "#faq",
  //   label: "FAQ",
  // },
];

const featureList: FeatureProps[] = [
  {
    title: "Chat",
    href: "https://chat-demo.ermis.network/login"
  },
  {
    title: "Meeting",
    href: "https://meeting.ermis.network/"
  },
];

export const Navbar = () => {
  const { theme } = useTheme();

  const [isOpen, setIsOpen] = React.useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className={`w-[90%] md:w-[70%] lg:w-[75%] lg:max-w-screen-xl top-3 mx-auto sticky z-40 rounded-full flex justify-between items-center p-3 backdrop-blur-[20px] ${theme === 'light' ? 'lg:bg-[rgba(13,13,13,0.1)]' : 'lg:bg-white/10'}`}>
      <Link href="/" className="font-bold text-lg flex items-center">
        {mounted && (
          <Image
            width={90}
            height={90}
            src={
              theme === "light"
                ? "/logo-light.svg"
                : "/logo-dark.svg"
            }
            alt="logo"
          />
        )}
      </Link>
      {/* <!-- Mobile --> */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-3">
            {/* <Button asChild size="sm" variant='white' aria-label="Join now" className="rounded-full">
              <Link
                aria-label="Join now"
                href="https://github.com/nobruf/shadcn-landing-page.git"
                target="_blank"
              >
                Join now
              </Link>
            </Button> */}
            {/* <SheetTrigger asChild>
              <Menu
                onClick={() => setIsOpen(!isOpen)}
                className="cursor-pointer lg:hidden"
              />
            </SheetTrigger> */}
            <SheetTrigger asChild>
              <Image
                src={
                  theme === "light"
                    ? "/icon-menu-dark.png"
                    : "/icon-menu.png"
                }
                alt="Ermis Menu Icon"
                width={40}
                height={40}

              />
            </SheetTrigger>
          </div>



          <SheetContent
            side="left"
            className="flex flex-col justify-between rounded-tr-2xl rounded-br-2xl bg-card border-secondary"
          >
            <div>
              <SheetHeader className="mb-4 ml-4">
                <SheetTitle className="flex items-center">
                  <Link href="/" className="flex items-center">
                    <Image
                      width={90}
                      height={90}
                      src={
                        theme === "light"
                          ? "/logo-light.svg"
                          : "/logo-dark.svg"
                      }
                      alt="logo"
                    />
                  </Link>
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-2">
                <div className="pb-2">
                  <p className="text-base py-2 px-4 font-medium">Products</p>
                  <ul className="flex flex-col gap-2 px-10">
                    {featureList.map(({ title, href }) => (
                      <Link
                        href={href}
                        key={title}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block cursor-pointer hover:text-primary transition-all duration-200"
                      >
                        {title}
                      </Link>
                    ))}
                  </ul>
                </div>
                {routeList.map(({ href, label }) => (
                  <Button
                    key={label}
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    className="justify-start text-base"
                  >
                    <Link href={href} target={label !== 'Pricing' ? '_blank' : '_self'}>{label}</Link>
                  </Button>
                ))}
              </div>
            </div>

            <SheetFooter className="flex-col sm:flex-col justify-start items-start">
              <Separator className="mb-2" />

              <ToggleTheme />
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* <!-- Desktop --> */}
      <NavigationMenu className="hidden lg:block mx-auto">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="text-base cursor-pointer hover:text-primary transition-all duration-200">
              Products
            </NavigationMenuTrigger>
            <NavigationMenuContent asChild>
              <div className="w-[350px] p-5 rounded-xl">
                <ul className="flex flex-col gap-6">
                  {featureList.map(({ title, href }) => (
                    <Link
                      href={href}
                      key={title}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block cursor-pointer hover:text-primary transition-all duration-200"
                    >
                      {title}
                    </Link>
                  ))}
                </ul>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            {routeList.map(({ href, label }) => (
              <NavigationMenuLink key={label} asChild>
                <Link href={href} target={label !== 'Pricing' ? '_blank' : '_self'} className="text-base px-2 cursor-pointer hover:text-primary transition-all duration-200">
                  {label}
                </Link>
              </NavigationMenuLink>
            ))}
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      <div className="hidden lg:flex gap-2">
        <ToggleTheme />

        {/* <Button asChild size="lg" variant='white' aria-label="Join now" className="rounded-full">
          <Link
            aria-label="Join now"
            href="https://github.com/nobruf/shadcn-landing-page.git"
            target="_blank"
          >
            Join now
          </Link>
        </Button> */}
      </div>
    </header>
  );
};
