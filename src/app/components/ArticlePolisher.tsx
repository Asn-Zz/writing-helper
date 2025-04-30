"use client";

import React, { useState } from 'react';
import { polishContent } from '../lib/api';
import { PolishRequest, PolishResponse } from '../lib/types';
import ApiSettingBlock, { ApiConfigProps } from './ApiSettingBlock';

export default function ArticlePolisher() {
  const [polishType, setPolishType] = useState<'standard' | 'academic' | 'business' | 'creative'>('standard');
  
  const [originalText, setOriginalText] = useState('');
  const [polishedResult, setPolishedResult] = useState<PolishResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API 设置状态
  const [apiConfig, setApiConfig] = useState<ApiConfigProps>({
    apiProvider: 'openai',
    apiUrl: '',
    apiKey: '',
    model: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPolishedResult(null);

    try {      
      const request: PolishRequest = {
        originalText,
        llmApiUrl: apiConfig.apiUrl,
        llmApiKey: apiConfig.apiKey, // Ollama 不需要 API 密钥，但保留该字段以保持接口一致性
        model: apiConfig.model,
        polishType
      };

      const result = await polishContent(request);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setPolishedResult(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setError(errorMessage);
      console.error('润色失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧设置区域 */}
        <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              润色设置
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 使用抽离的 API 设置组件 */}
              <ApiSettingBlock
                setApiConfig={setApiConfig} 
              />

              {/* 润色类型设置 */}
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-4">
                <h3 className="font-medium text-gray-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  润色类型
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="standard"
                      name="polishType"
                      checked={polishType === 'standard'}
                      onChange={() => setPolishType('standard')}
                      className="h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor="standard" className="ml-2 text-sm text-gray-700">
                      标准润色
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="academic"
                      name="polishType"
                      checked={polishType === 'academic'}
                      onChange={() => setPolishType('academic')}
                      className="h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor="academic" className="ml-2 text-sm text-gray-700">
                      学术润色
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="business"
                      name="polishType"
                      checked={polishType === 'business'}
                      onChange={() => setPolishType('business')}
                      className="h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor="business" className="ml-2 text-sm text-gray-700">
                      商业润色
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="creative"
                      name="polishType"
                      checked={polishType === 'creative'}
                      onChange={() => setPolishType('creative')}
                      className="h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor="creative" className="ml-2 text-sm text-gray-700">
                      创意润色
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 px-6 rounded-md font-medium disabled:opacity-60 disabled:from-gray-400 disabled:to-gray-500 transition duration-150 ease-in-out transform hover:scale-105 shadow-md"
                  disabled={loading || (apiConfig.apiProvider !== 'ollama' && !apiConfig.apiKey)}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      润色中...
                    </span>
                  ) : '开始润色'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 右侧内容区域 */}
        <div>
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200 h-full flex flex-col">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
              </svg>
              原始文章
            </h2>
            <div className="mb-4 flex-grow">
              <textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="请在此粘贴需要润色的文章..."
                className="w-full h-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[200px] resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 bg-red-50 text-red-700 p-4 rounded-md border border-red-200 mb-4">
          <div className="font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            错误: {error}
          </div>
        </div>
      )}

      {polishedResult && !error && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">润色结果</h2>
          
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-700">标记修改</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(polishedResult.polishedText);
                      alert('已复制到剪贴板');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    复制润色后文本
                  </button>
                </div>
              </div>
              <div className="p-4 bg-white">
                <div 
                  className="diff-container"
                  dangerouslySetInnerHTML={{ __html: polishedResult.diffMarkup }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 