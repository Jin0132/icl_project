import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ICL Events — International Community Lab",
  description:
    "Upcoming cultural exchange meetups in Tokyo hosted by International Community Lab (ICL).",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "ICL Events — International Community Lab",
    description:
      "Upcoming cultural exchange meetups in Tokyo hosted by International Community Lab (ICL).",
    type: "website",
  },
};

export default function EventsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
