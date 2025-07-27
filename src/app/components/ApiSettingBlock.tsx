"use client";

import React, { useState, useEffect } from 'react';
import ApiSettings, { ApiConfigProps } from './ApiSettings';
import { API_URLS, DEFAULT_OLLAMA_LLM, PROVIDER_KEY } from '../lib/constant';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useApiSettings } from './ApiSettingsContext';

export type { ApiConfigProps } from './ApiSettings';

export interface ApiSettingsProps {
  setError?: (error: string) => void;
}

export default function ApiSettingsBlock({ setError }: ApiSettingsProps) {
  const { apiConfig, setApiConfig } = useApiSettings();
  const { apiProvider, apiUrl, apiKey, model } = apiConfig;  

  const [settingVisible, setSettingVisible] = useLocalStorage('writing_helper_setting_visible', true);
  const [showApiSettings, setShowApiSettings] = useState<boolean>(settingVisible);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isOllama, setIsOllama] = useState(apiProvider === PROVIDER_KEY.ollama);
  const [ollamaModel, setOllamaModel] = useState(DEFAULT_OLLAMA_LLM.model);

  useEffect(() => {
    setShowApiSettings(settingVisible);
  }, [settingVisible]);

  const toggleApiSettings = () => {
    const newVisibility = !showApiSettings;
    setSettingVisible(newVisibility);
    setShowApiSettings(newVisibility);
  };

  const handleApiConfigChange = (newConfig: Partial<ApiConfigProps>) => {
    const updatedConfig = { ...apiConfig, ...newConfig };
    setApiConfig(updatedConfig);

    if (newConfig.apiProvider === PROVIDER_KEY.ollama) {
      setIsOllama(true);
      fetchOllamaModels();
    } else if (newConfig.apiProvider) {
      setIsOllama(false);
      if (updatedConfig.apiKey) {
        fetchOpenAIModels(updatedConfig.apiUrl, updatedConfig.apiKey);
      }
    }
  };

  const fetchOpenAIModels = async (url: string, key: string) => {
    try {
      const [modelUrl] = url.split('/chat');
      const response = await fetch(`${modelUrl}/models`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
      });

      if (!response.ok) throw new Error('无法获取模型列表');

      const res = await response.json();
      if (res.data) {
        const models = res.data.map((m: Record<string, unknown>) => m.id as string);
        setAvailableModels(models);
        if (models.length > 0 && !models.includes(apiConfig.model)) {
          handleApiConfigChange({ model: models[0] });
        }

        return models;
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
      if (setError) setError('无法获取 OpenAI 模型列表，请检查 API Key 和网络连接');
    }
  };

  const fetchOllamaModels = async () => {
    try {
      const response = await fetch(API_URLS.ollama.replace('generate', 'tags'));
      if (!response.ok) throw new Error('无法获取模型列表');

      const data = await response.json();
      if (data.models) {
        const models = data.models.map((m: Record<string, unknown>) => m.name as string);
        setAvailableModels(models);
        if (models.length > 0 && !models.includes(ollamaModel)) {
          setOllamaModel(models[0]); // This seems to be local state, consider moving to context if needed globally
        }

        return models;
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
      if (setError) setError('无法获取 Ollama 模型列表，请确保 Ollama 服务正在运行');
    }
  };
  
  useEffect(() => {
    if (apiProvider === PROVIDER_KEY.ollama) {
      fetchOllamaModels();
    } else if (apiKey) {
      fetchOpenAIModels(apiUrl, apiKey);
    }
  }, [apiProvider, apiKey, apiUrl]);

  return (
    <ApiSettings
      showSettings={showApiSettings}
      toggleSettings={toggleApiSettings}
      setApiConfig={setApiConfig}
      apiProvider={apiProvider}
      setApiProvider={(p) => handleApiConfigChange({ apiProvider: p })}
      apiUrl={apiUrl}
      setApiUrl={(u) => handleApiConfigChange({ apiUrl: u })}
      apiKey={apiKey}
      setApiKey={(k) => handleApiConfigChange({ apiKey: k })}
      model={model}
      setModel={(m) => handleApiConfigChange({ model: m })}
      availableModels={availableModels}
      setAvailableModels={setAvailableModels}
      fetchModels={isOllama ? fetchOllamaModels : () => fetchOpenAIModels(apiUrl, apiKey)}
    />
  );
}
