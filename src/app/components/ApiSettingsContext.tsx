"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { ApiConfigProps } from './ApiSettings'; // Assuming ApiSettings exports this type
import { DEFAULT_LLM, PROVIDER_KEY } from '../lib/constant';

interface ApiSettingsContextType {
  apiConfig: ApiConfigProps;
  setApiConfig: (config: ApiConfigProps) => void;
}

const ApiSettingsContext = createContext<ApiSettingsContextType | undefined>(undefined);

export const ApiSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [apiConfig, setApiConfig] = useState<ApiConfigProps>({
    apiProvider: PROVIDER_KEY.openai,
    apiUrl: DEFAULT_LLM.apiUrl,
    apiKey: DEFAULT_LLM.apiKey,
    model: DEFAULT_LLM.model,
  });

  return (
    <ApiSettingsContext.Provider value={{ apiConfig, setApiConfig }}>
      {children}
    </ApiSettingsContext.Provider>
  );
};

export const useApiSettings = () => {
  const context = useContext(ApiSettingsContext);
  if (context === undefined) {
    throw new Error('useApiSettings must be used within an ApiSettingsProvider');
  }
  return context;
};
