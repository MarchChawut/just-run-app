import type { Metadata } from "next"
import { Noto_Sans_Thai, Space_Mono, Bebas_Neue } from "next/font/google"
import "./globals.css"

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
})

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
})

const bebasNeue = Bebas_Neue({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400"],
})

export const metadata: Metadata = {
  title: "ตัวตึง - Just Run!",
  description: "วางแผนซ้อมวิ่งด้วยหลักวิทยาศาสตร์การกีฬา",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${spaceMono.variable} ${bebasNeue.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
