"use client";
import Image from "next/image";
import Link from "next/link";

export const HeaderSection = () => {
    return (
        <div className="container flex justify-between items-center p-4 bg-transparent">
            <Link href="/" className="flex items-center">
                <Image
                    src="/logo-uhm.png"
                    alt="Uhm Logo"
                    width={50}
                    height={50}
                    className="object-contain"
                />
            </Link>
        </div>
    );
};
