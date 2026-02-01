export const metadata = {
  title: "VT-9 Freq Deconflictor",
  description: "Deconflicts VT-9 schedule airspace and frequencies",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
