import '@/app/globals.css'
import type { Metadata } from 'next'
import React from "react";

export const metadata: Metadata = {
  title: {
    template: '%s - Event Pilot',
    default: 'Event Pilot',
  },
  description: '',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="light text-zinc-950 antialiased lg:bg-zinc-100"
    >
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <title>Event Pilot</title>
      </head>
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  )
}
