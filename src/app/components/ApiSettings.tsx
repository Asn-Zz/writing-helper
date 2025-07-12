"use client";

import React, { useEffect, useState, useMemo } from 'react';
import {
  API_HELP,
  API_URLS,
  DEFAULT_LLM,
  DEFAULT_ADMIN_LLM,
  DEFAULT_OLLAMA_LLM,
  PROVIDER_KEY,
  ApiProvider
} from '@/app/lib/constant'
import { useLocalStorage } from '../hooks/useLocalStorage';

export interface ApiConfigProps {
  apiProvider: ApiProvider;
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface ApiSettingsProps {
  setApiConfig?: (config: ApiConfigProps) => void;
  showSettings: boolean;
  toggleSettings: () => void;
  apiProvider: ApiProvider;
  setApiProvider: (apiProvider: ApiProvider) => void;
  apiUrl: string;
  setApiUrl: (apiUrl: string) => void;
  apiKey: string;
  setApiKey: (apiKey: string) => void;
  model: string;
  setModel: (model: string) => void;
  availableModels?: string[];
  setAvailableModels?: (models: string[]) => void;
  fetchModels?: () => Promise<string[] | void>;
}

export default function ApiSettings({
  setApiConfig,
  showSettings,
  toggleSettings,
  apiProvider,
  setApiProvider,
  apiUrl,
  setApiUrl,
  apiKey,
  setApiKey,
  model,
  setModel,
  availableModels = [],
  setAvailableModels,
  fetchModels
}: ApiSettingsProps) {
  const storeKey = 'writing_helper_api_config';
  const [settingConfig, setSettingConfig, saveStatus] = useLocalStorage(storeKey, DEFAULT_LLM);
  const [cachedProviderModels, setCachedProviderModels] = useLocalStorage<Record<string, string[]>>('provider_models_cache', {});
  const [isCustomModelInput, setIsCustomModelInput] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const currentCached = cachedProviderModels[apiProvider] || [];    

    setIsMounted(true);
    
    if (currentCached.length && setAvailableModels) {      
      setAvailableModels(currentCached);
    }
  }, []);

  const displayedModels = useMemo(() => {
    if (!isMounted) { return availableModels }

    return cachedProviderModels[apiProvider] || availableModels;
  }, [isMounted, apiProvider, availableModels, cachedProviderModels]);

  const effectiveIsCustom = useMemo(() => {
    if (isCustomModelInput) return true;
    if (displayedModels.length > 0 && model && !displayedModels.includes(model)) {
      return true;
    }
    return false;
  }, [model, displayedModels, isCustomModelInput]);

  const fetchLocalModel = () => {
    if (fetchModels) {
      fetchModels().then(models => {
        setCachedProviderModels({ ...cachedProviderModels, [apiProvider]: models || [] });
      }).catch(err => {
        console.error('刷新模型列表失败:', err);
      });
    }
  }

  const saveApiConfig = () => {
    try {
      const apiConfig = {
        apiProvider: apiProvider,
        apiUrl: apiUrl,
        apiKey: apiKey,
        model: model
      };
      setSettingConfig(apiConfig);
      if (setApiConfig) {
        setApiConfig(apiConfig);
      }
    } catch (error) {
      console.error('保存API配置失败:', error);
    }
  };

  const loadApiConfig = (config: ApiConfigProps) => {
    if (setApiConfig) {
      console.log('已从本地存储加载API配置');
      setApiConfig(config)
    }
  };

  const clearApiConfig = () => {
    try {
      setSettingConfig(DEFAULT_LLM);
      loadApiConfig(DEFAULT_LLM);
      setCachedProviderModels({});
      console.log('API配置已重置');
    } catch (error) {
      console.error('清除API配置失败:', error);
    }
  };

  useEffect(() => {
    loadApiConfig(settingConfig);
  }, []); // This useEffect is safe, it only runs once on mount.

  const handleApiProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newApiProvider = e.target.value as ApiProvider;
    setApiProvider(newApiProvider);

    setApiUrl(API_URLS[newApiProvider]);

    if (newApiProvider === PROVIDER_KEY.openai) {
      setModel(DEFAULT_LLM.model);
      setApiKey(DEFAULT_LLM.apiKey);
    } else if (newApiProvider === PROVIDER_KEY.ollama) {
      setModel(DEFAULT_OLLAMA_LLM.model);
      setApiKey(DEFAULT_OLLAMA_LLM.apiKey);
    } else if (newApiProvider === PROVIDER_KEY.custom) {
      setModel('');
      setApiKey('');
      setApiUrl('');
    }

    const providersWithFetch = [PROVIDER_KEY.ollama, PROVIDER_KEY.openai];
    if (providersWithFetch.includes(newApiProvider) && fetchModels) {
      const cached = cachedProviderModels[newApiProvider] || [];
      if (cached.length === 0) {
        fetchModels().catch(err => {
          console.error(`获取 ${newApiProvider} 模型列表失败:`, err);
        });
      }
    }
  };

  const handleModelSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === '__custom__') {
      setIsCustomModelInput(true);
      setModel('');
    } else {
      setIsCustomModelInput(false);
      setModel(selectedValue);
    }
  };

  const storeAuthKey = 'writing_helper_auth_token';
  const setAuthToken = () => {
    const password = window.prompt('请输入访问密码:');

    if (password === process.env.NEXT_PUBLIC_AUTH_TOKEN) {
      localStorage.setItem(storeAuthKey, process.env.NEXT_PUBLIC_AUTH_TOKEN);
      setSettingConfig(DEFAULT_ADMIN_LLM)
      loadApiConfig(DEFAULT_ADMIN_LLM)
      console.log('认证成功');
    }
  }

  return (
    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-4">
      <div className="flex justify-between items-center cursor-pointer" onClick={toggleSettings}>
        <h3 className="font-medium text-gray-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1H4v8a1 1 0 001 1h10a1 1 0 001-1V6zM4 4a1 1 0 011-1h10a1 1 0 011 1v1H4V4z" clipRule="evenodd" />
          </svg>
          API 设置
          {saveStatus !== 'idle' && (
            <span className="ml-2 text-xs inline-flex items-center">
              {saveStatus === 'saving' ? (
                <span className="text-blue-500 animate-pulse">保存中...</span>
              ) : (
                <span className="text-green-500 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  已保存
                </span>
              )}
            </span>
          )}
        </h3>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${showSettings ? 'transform rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>

      {showSettings && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="apiProvider" className="block text-sm font-medium text-gray-700 mb-1">
                选择 API 提供商
              </label>
              <select
                id="apiProvider"
                value={apiProvider}
                onChange={handleApiProviderChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="openai">OpenAI</option>
                <option value="ollama">Ollama (本地)</option>
                <option value="custom">自定义</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {API_HELP[apiProvider]}
              </p>
            </div>

            <div>
              <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700 mb-1">
                API 地址
              </label>
              <input
                type="text"
                id="apiUrl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="API 端点 URL"
              />
            </div>

            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                API 密钥
              </label>
              {apiProvider === 'ollama' ? (
                <div className="block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-500 text-sm">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    使用本地 Ollama 服务无需 API 密钥
                  </span>
                </div>
              ) : (
                <input
                  type="password"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="输入您的 API 密钥"
                />
              )}
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                模型
                {displayedModels.length > 0 && (
                  <span className="text-xs text-green-600 ml-2">{displayedModels.length} 可用</span>
                )}
              </label>
              {displayedModels.length > 0 ? (
                <div className="space-y-2">
                  <div className='flex items-center'>
                    <select
                      id="model"
                      value={effectiveIsCustom ? '__custom__' : model}
                      onChange={handleModelSelectChange}
                      className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {displayedModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value="__custom__">自定义...</option>
                    </select>

                    {fetchModels && (
                      <button
                        type="button"
                        onClick={fetchLocalModel}
                        className="ml-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        刷新
                      </button>
                    )}
                  </div>
                  {effectiveIsCustom && (
                    <input
                      type="text"
                      id="custom_model_input"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="block w-full px-3 py-2 mt-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="输入自定义模型名称"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    id="model_input"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder={
                      ['openai', 'ollama'].includes(apiProvider)
                        ? '加载模型列表中或手动输入...'
                        : '输入模型名称'
                    }
                  />
                  {apiProvider === 'ollama' && (
                    <div className="text-xs text-gray-500">
                      未找到模型，请确保 Ollama 正在运行并已安装模型。
                    </div>
                  )}
                </div>
              )}

              {apiProvider === 'ollama' && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>
                    提示: 如需安装新模型，请在终端执行: <code className="px-1 py-0.5 bg-gray-100 rounded">ollama pull llama3.1</code>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t border-gray-100">
            <div className='flex justify-end'>
              <button
                type="button"
                onClick={setAuthToken}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                访问密码
              </button>
            </div>
            <div className='flex justify-end'>
              <button
                type="button"
                onClick={saveApiConfig}
                className="inline-flex items-center px-3 py-1.5 mr-3 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
              >
                保存设置
              </button>

              <button
                type="button"
                onClick={clearApiConfig}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}