"use client";
import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import ApiSettingsBlock from './ApiSettingBlock';

type FeatureLayoutProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export default function FeatureLayout({
  children,
  title,
  subtitle, 
}: FeatureLayoutProps) {
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const toggleSettings = () => {
    setSettingsOpen(!isSettingsOpen);
  };

  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    const storeAuthKey = 'writing_helper_auth_token';
    const authKey = localStorage.getItem(storeAuthKey);

    if (authKey === process.env.NEXT_PUBLIC_AUTH_TOKEN) {
      setIsAuthed(true);
    }
  }, []);

  return (
    <div className="bg-gray-50 flex flex-col" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <Navigation isAuthed={isAuthed} onSettingsClick={toggleSettings} />
      
      <main className="flex-1">
        {(title || subtitle) && (
          <div className="bg-white shadow">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {title && (
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-2 text-lg text-gray-600">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}
        
        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
          <div className="mb-4" style={{ display: isSettingsOpen ? 'block' : 'none' }}>
            <ApiSettingsBlock />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
} 