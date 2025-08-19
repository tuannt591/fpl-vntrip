"use client"

import React, { useEffect, useState } from "react";

const LEAGUE_ID = 1405297;

const ModalManager = ({ modalId }: { modalId: any }) => {
    return (
        <div id={modalId} tabIndex={-1} aria-hidden="true" className="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
            <div className="relative p-4 w-full max-w-2xl max-h-full">
                {/* Modal content */}
                <div className="relative bg-white rounded-lg shadow-sm dark:bg-gray-700">
                    {/* Modal header */}
                    <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {modalId}
                        </h3>
                        <button type="button" className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-hide={modalId}>
                            <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                            <span className="sr-only">Close modal</span>
                        </button>
                    </div>
                    {/* Modal body */}
                    <div className="p-4 md:p-5 space-y-4">
                        <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                            {modalId}
                        </p>

                    </div>

                </div>
            </div>
        </div>
    )

}

export const Main = () => {
    const [data, setData] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [standingsResults, setStandingsResults] = useState<any[]>([]);
    const [managerSelected, setManagerSelected] = useState<any>(null);

    const TEAM_87 = [2195023, 6293111, 6291846];
    const TEAM_89 = [4565469, 4550400, 5005626];
    const TEAM_3T = [6400474, 3024127, 6425684];

    const team87Total = standingsResults
        .filter((item: any) => TEAM_87.includes(item.entry))
        .reduce((sum, item) => sum + (item.event_total || 0), 0);

    const team89Total = standingsResults
        .filter((item: any) => TEAM_89.includes(item.entry))
        .reduce((sum, item) => sum + (item.event_total || 0), 0);

    const team3TTotal = standingsResults
        .filter((item: any) => TEAM_3T.includes(item.entry))
        .reduce((sum, item) => sum + (item.event_total || 0), 0);


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

    const handleSelectManager = (item: any) => {
        console.log('---item---', item);
        setManagerSelected(item);
    }

    return (
        <div>
            <h1 className="text-[40px] font-bold mb-5 text-center">
                VNTRIP
            </h1>


            {/* Hiển thị tổng điểm tuần của các team */}
            <div className="flex justify-center gap-8 mb-6">
                <div className="font-semibold">87 team: <span className="text-blue-600">{team87Total}</span></div>
                <div className="font-semibold">89 team: <span className="text-green-600">{team89Total}</span></div>
                <div className="font-semibold">3T team: <span className="text-purple-600">{team3TTotal}</span></div>
            </div>

            <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3" style={{ width: "60px" }}>Rank</th>
                            <th scope="col" className="px-6 py-3">Manager</th>
                            <th scope="col" className="px-6 py-3" style={{ width: "60px" }}>GW</th>
                            <th scope="col" className="px-6 py-3" style={{ width: "60px" }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {standingsResults.map((item: any) => (
                            <tr key={item.entry} className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700 border-gray-200">
                                <td className="px-6 py-4">{item.rank}</td>
                                <td className="px-6 py-4 cursor-pointer text-blue-700 underline"
                                >{item.player_name} ({item.entry_name})


                                    <div>
                                        <button data-modal-target={String(item.entry)} data-modal-toggle={String(item.entry)} className="block text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" type="button">
                                            Toggle modal
                                        </button>
                                        {/* Main modal */}
                                        <div id={String(item.entry)} tabIndex={-1} aria-hidden="true" className="hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full">
                                            <div className="relative p-4 w-full max-w-2xl max-h-full">
                                                {/* Modal content */}
                                                <div className="relative bg-white rounded-lg shadow-sm dark:bg-gray-700">
                                                    {/* Modal header */}
                                                    <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
                                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                            {item.player_name} ({item.entry_name})
                                                        </h3>
                                                        <button type="button" className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" data-modal-hide="default-modal">
                                                            <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                                                            </svg>
                                                            <span className="sr-only">Close modal</span>
                                                        </button>
                                                    </div>
                                                    {/* Modal body */}
                                                    <div className="p-4 md:p-5 space-y-4">
                                                        <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                                                            With less than a month to go before the European Union enacts new consumer privacy laws for its citizens, companies around the world are updating their terms of service agreements to comply.
                                                        </p>
                                                        <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400">
                                                            The European Union’s General Data Protection Regulation (G.D.P.R.) goes into effect on May 25 and is meant to ensure a common set of data rights in the European Union. It requires organizations to notify users as soon as possible of high-risk data breaches that could personally affect them.
                                                        </p>
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                    {/* <ModalManager modalId={`${item?.entry}`} /> */}

                                </td>
                                <td className="px-6 py-4">{item.event_total}</td>
                                <td className="px-6 py-4">{item.total}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};