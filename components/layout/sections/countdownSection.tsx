"use client";
import { useState, useEffect } from "react";

export const CountdownSection = () => {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    function calculateTimeLeft() {
        const targetDate = new Date("2025-07-01T00:00:00+07:00").getTime();
        const now = new Date().getTime();
        const difference = targetDate - now;

        if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((difference % (1000 * 60)) / 1000),
        };
    }

    useEffect(() => {
        const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    
    return (
        <div className="flex justify-center gap-4 text-white text-4xl font-bold">
            <div className="text-center">
                <div>{timeLeft.days}</div>
                <div className="text-sm text-gray-400">Days</div>
            </div>
            <div className="text-center">
                <div>{timeLeft.hours}</div>
                <div className="text-sm text-gray-400">Hours</div>
            </div>
            <div className="text-center">
                <div>{timeLeft.minutes}</div>
                <div className="text-sm text-gray-400">Minutes</div>
            </div>
            <div className="text-center">
                <div>{timeLeft.seconds}</div>
                <div className="text-sm text-gray-400">Seconds</div>
            </div>
        </div>
    );
};
