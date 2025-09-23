'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';

export default function LoadingIndicator() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 模拟加载进度
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(timer);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // 检查页面是否已经加载完成
    const checkLoading = () => {
      if (document.readyState === 'complete') {
        clearInterval(timer);
        setProgress(100);
        setTimeout(() => setLoading(false), 300);
      }
    };

    // 监听页面加载状态
    if (document.readyState === 'complete') {
      checkLoading();
    } else {
      window.addEventListener('load', checkLoading);
    }

    return () => {
      clearInterval(timer);
      window.removeEventListener('load', checkLoading);
    };
  }, []);

  if (!loading) return null;

  return (
    <>
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">AI 编辑工作室</h2>
          <p className="text-gray-500 mb-4">正在加载应用...</p>
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% 完成</p>
        </div>
      </div>
      <style jsx global>{`
        body {
          overflow: hidden;
        }
      `}</style>
    </>
  );
}