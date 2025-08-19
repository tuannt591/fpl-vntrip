import Link from "next/link";


export const NavSection = () => {
  
    return (
        <div className="flex justify-end p-4">
            <Link
                href="#"
                className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition duration-300"
            >
                Home
            </Link>
        </div>
    );
};
