import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
import { Metadata } from "next";
import Footer from "./components/Footer";
import { ApiSettingsProvider } from "./components/ApiSettingsContext";
import { ToastProvider } from "@/components/toast/ToastContext";
import { ToastContainer } from "@/components/toast/ToastContainer";
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
        <Script id="cherry-studio-detection" strategy="afterInteractive">
          {`
            // 检测是否在Cherry Studio中运行
            function isInCherryStudio() {
              try {
                return window.parent !== window && 
                       window.location.ancestorOrigins && 
                       window.location.ancestorOrigins[0].includes('cherry-studio');
              } catch (e) {
                return false;
              }
            }
            
            // 根据环境调整UI
            if (isInCherryStudio()) {
              document.body.classList.add('in-cherry-studio');
              console.log('Running in Cherry Studio environment');
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
