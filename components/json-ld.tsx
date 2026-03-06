export function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FPL Vntrip",
    url: "https://fpl-vntrip.vercel.app",
    description:
      "Theo dõi bảng xếp hạng Fantasy Premier League của nhóm Vntrip. Cập nhật điểm số theo tuần, đội hình, thống kê chi tiết.",
    author: {
      "@type": "Person",
      name: "Nguyen Tuan",
    },
    publisher: {
      "@type": "Organization",
      name: "Vntrip",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
