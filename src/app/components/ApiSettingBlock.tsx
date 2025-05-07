"use client";

import React, { useState, useEffect } from 'react';
import ApiSettings, { ApiConfigProps } from './ApiSettings';
import { API_URLS, DEFAULT_LLM, DEFAULT_OLLAMA_LLM, PROVIDER_KEY, ApiProvider } from '../lib/constant'
import { useLocalStorage } from '../hooks/useLocalStorage';
export type { ApiConfigProps } from './ApiSettings';

export interface ApiSettingsProps {
  setError?: (error: string) => void;
  setApiConfig?: (config: ApiConfigProps) => void;
}

export default function ApiSettingsBlock({ 
  setError, 
  setApiConfig 
}: ApiSettingsProps) {
  const defaultVisible = true;
  const [settingVisible, setSettingVisible] = useLocalStorage('writing_helper_setting_visible', true);

  // API 设置状态
  const [apiProvider, setApiProvider] = useState<ApiProvider>(PROVIDER_KEY.openai);
  const [llmApiUrl, setLlmApiUrl] = useState<string>(DEFAULT_LLM.apiUrl);
  const [llmApiKey, setLlmApiKey] = useState<string>(DEFAULT_LLM.apiKey);
  const [model, setModel] = useState<string>(DEFAULT_LLM.model);

  const [showApiSettings, setShowApiSettings] = useState<boolean>(defaultVisible);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
 
  const [isOllama, setIsOllama] = useState(false);
  const [ollamaModel, setOllamaModel] = useState(DEFAULT_OLLAMA_LLM.model);

  // 处理API设置的显示/隐藏
  const toggleApiSettings = () => {
    const settingVisible = !showApiSettings

    setSettingVisible(settingVisible);
    setShowApiSettings(settingVisible);
  };

  const setApiConfigByStore = (config: ApiConfigProps) => {
    if (config.apiProvider === PROVIDER_KEY.ollama) {
      setIsOllama(true);
    }

    setApiProvider(config.apiProvider);
    setLlmApiUrl(config.apiUrl);
    setLlmApiKey(config.apiKey);
    setModel(config.model);    

    if (setApiConfig)
      setApiConfig(config);
  }

  // 获取可用的 Ollama 模型
  const fetchOllamaModels = async () => {
    try {
      const response = await fetch(API_URLS.ollama.replace('generate', 'tags'));

      if (!response.ok) {
        throw new Error('无法获取模型列表');
      }

      const data = await response.json();
      if (data.models) {
        const models = data.models.map((model: Record<string, unknown>) => model.name);

        setAvailableModels(models);
        if (models.length > 0 && !models.includes(ollamaModel)) {
          setOllamaModel(models[0]);
        }
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
      if (setError)
        setError('无法获取 Ollama 模型列表，请确保 Ollama 服务正在运行');
    }
  };

  useEffect(() => {
    if (isOllama) {
      fetchOllamaModels();
    }

    setShowApiSettings(settingVisible);
  }, [isOllama, settingVisible]);
  // 处理 API 提供商的切换

  return <>
    {/* API 设置部分 */}
    <ApiSettings
      setApiConfig={setApiConfigByStore}
      showSettings={showApiSettings}
      toggleSettings={toggleApiSettings}
      apiProvider={apiProvider}
      setApiProvider={setApiProvider}
      apiUrl={llmApiUrl}
      setApiUrl={setLlmApiUrl}
      apiKey={llmApiKey}
      setApiKey={setLlmApiKey}
      model={model}
      setModel={setModel}
      availableModels={availableModels}
      fetchModels={fetchOllamaModels}
    />
  </>
}