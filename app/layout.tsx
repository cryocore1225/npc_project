import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'N.P.C 垃圾分类助手',
  description: '使用 ONNX Runtime Web 在浏览器中分析图片并给出垃圾分类建议。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
