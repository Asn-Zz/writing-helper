import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
import { Metadata } from "next";
import Footer from "./components/Footer";
import { ApiSettingsProvider } from "./components/ApiSettingsContext";
import { ToastProvider } from "@/components/toast/ToastContext";
import { ToastContainer } from "@/components/toast/ToastContainer";
import LoadingIndicator from "./components/LoadingIndicator";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 编辑工作室",
  description: "由先进的大语言模型驱动的智能写作助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <LoadingIndicator />
        <Script id="desktop-studio-detection" strategy="afterInteractive">
          {`            
            // 检测是否在Pake打包的桌面应用中运行
            function isInPakeApp() {
              try {
                // Pake应用通常会注入特定的全局变量或有特定的环境特征
                return typeof window.__TAURI__ !== 'undefined' || 
                       navigator.userAgent.includes('Tauri') ||
                       document.body.classList.contains('pake-app');
              } catch (e) {
                return false;
              }
            }
            
            // 根据环境调整UI
            if (isInPakeApp()) {
              document.body.classList.add('pake-app');
              console.log('Running in Pake desktop app');
            } else {
              console.log('Running in standard environment');
            }
          `}
        </Script>
        <ToastProvider>
          <ApiSettingsProvider>
            <div className="flex-grow">
              {children}
            </div>
          </ApiSettingsProvider>
          <ToastContainer />
        </ToastProvider>
        <Footer />
      </body>
    </html>
  );
}
