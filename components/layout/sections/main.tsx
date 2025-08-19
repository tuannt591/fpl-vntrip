"use client"

import React, { useEffect, useState } from "react";

const LEAGUE_ID = 1405297;

export const Main = () => {
    const [data, setData] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [standingsResults, setStandingsResults] = useState<any[]>([]); // Thêm state mới


    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/fpl-bootstrap");
                const json = await res.json();
                setData(json);
                setPlayers(json.elements || []);
            } catch (error) {
                console.error("Error fetching FPL data:", error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchStandings = async () => {
            try {
                const leagueId = LEAGUE_ID;
                const pageId = 1;
                const phase = 1;
                const res = await fetch(`/api/fpl-league-standings?league_id=${leagueId}&page_id=${pageId}&phase=${phase}`);
                const json = await res.json();
                setStandingsResults(json.standings?.results || []); // Lưu kết quả vào state mới

            } catch (error) {
                console.error("Error fetching standings:", error);
            }
        };
        fetchStandings();
    }, []);

    return (
        <div className="text-center pt-[150px] pb-[10px]">
            <h1 className="text-[40px] font-bold">
                VNTRIP
            </h1>

            {/* Hiển thị bảng xếp hạng */}
            {standingsResults.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-2xl font-semibold mb-4">Bảng xếp hạng</h2>
                    <table className="mx-auto border-collapse border border-gray-300">
                        <thead>
                            <tr>
                                <th className="border px-4 py-2">Rank</th>
                                <th className="border px-4 py-2">Manager</th>
                                <th className="border px-4 py-2">Point</th>
                                <th className="border px-4 py-2">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {standingsResults.map((item: any, idx: number) => (
                                <tr key={item.entry}>
                                    <td className="border px-4 py-2">{idx + 1}</td>
                                    <td className="border px-4 py-2">{item.entry_name}</td>
                                    <td className="border px-4 py-2">{item.event_total ?? "-"}</td>
                                    <td className="border px-4 py-2">{item.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};