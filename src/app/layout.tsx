import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VT-9 Freq Deconflictor",
  description: "Deconflicts VT-9 schedule airspace and frequencies",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          :root {
            --font-display: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
            --bg: #0a0e14;
            --surface: #151a22;
            --border: #2a3140;
            --text-primary: #e6edf3;
            --text-secondary: #b3bcc9;
            --text-muted: #6e7a8a;
            --accent: #39d353;
            --green: #39d353;
            --red: #f85149;
            --red-bg: rgba(248, 81, 73, 0.1);
            --red-dim: rgba(248, 81, 73, 0.3);
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            background: var(--bg);
            color: var(--text-primary);
            font-family: var(--font-display);
            -webkit-font-smoothing: antialiased;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
