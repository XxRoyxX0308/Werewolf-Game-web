import type { Metadata, Viewport } from 'next';
import { LangProvider } from '@/lib/client/lang';
import './globals.css';

export const metadata: Metadata = {
  title: '狼人殺 Online',
  description: '3D 線上狼人殺：建立房間、分享連結，就能和朋友遠端同樂。',
};

export const viewport: Viewport = {
  themeColor: '#05071a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // 翻譯、文法檢查等瀏覽器擴充功能會改寫頁面內容，可能讓 React 出錯；這裡請它們不要處理本頁。
    // lang 會在玩家切換語言時由 LangProvider 更新
    <html lang="zh-Hant" translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Serif+TC:wght@600;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
