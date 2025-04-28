"use client";

import React, { useState } from 'react';
import FeatureLayout from '../../components/FeatureLayout';
import ApiSettings from '../../components/ApiSettings';
import { generate } from '@/app/lib/api';
import { API_URLS, DEFAULT_LLM, DEFAULT_OLLAMA_LLM, PROVIDER_KEY, ApiProvider } from '@/app/lib/constant'

export default function TextSummarizer() {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  // API 设置状态
  const [apiProvider, setApiProvider] = useState<ApiProvider>(PROVIDER_KEY.openai);
  const [llmApiUrl, setLlmApiUrl] = useState<string>(API_URLS.openai);
  const [llmApiKey, setLlmApiKey] = useState<string>('');
  const [model, setModel] = useState<string>(DEFAULT_LLM.model);
  const [showApiSettings, setShowApiSettings] = useState<boolean>(true);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // 处理API设置的显示/隐藏
  const toggleApiSettings = () => {
    setShowApiSettings(!showApiSettings);
  };

  const promptTemplate = `请按以下结构提取文章关键信息并生成摘要：
核心主题（1句话概括）
关键论点（分条列出，最多3条）
重要数据/案例（如有）
最终结论（1-2句话）
要求：语言精炼，逻辑清晰，避免主观评价。
以下是原文：
${text}
只返回摘要结果，不要添加任何说明或解释。
  `

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setSummary('');

    try {
      // 这里会调用后端API，现在只是模拟
      // 实际应用中，应该创建一个API端点处理请求
      const data = await generate({
        apiUrl: llmApiUrl,
        apiKey: llmApiKey,
        model: model || 'gpt-4',
        prompt: promptTemplate,
        messages: [
          {
            role: 'user',
            content: promptTemplate
          }
        ],
        temperature: 0.7,
        stream: false
      })
      const polishedText = data.content || data.error || '';
      setSummary(polishedText);
      setLoading(false);
    } catch (error) {
      console.error('生成摘要时出错:', error);
      setLoading(false);
    }
  };

  return (
    <FeatureLayout 
      title="文本摘要工具" 
      subtitle="快速生成文章的摘要，提取关键信息"
    >
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {/* API 设置部分 */}
            <ApiSettings
              showSettings={showApiSettings}
              toggleSettings={toggleApiSettings}
              apiProvider={apiProvider}
              setApiProvider={(provider) => {
                setApiProvider(provider);
                if (provider === 'openai') {
                  setLlmApiUrl('https://api.openai.com/v1/chat/completions');
                  setModel('gpt-4');
                } else if (provider === 'ollama') {
                  setLlmApiUrl('http://localhost:11434/api/generate');
                  setModel('llama2');
                  setLlmApiKey('');
                }
              }}
              apiUrl={llmApiUrl}
              setApiUrl={setLlmApiUrl}
              apiKey={llmApiKey}
              setApiKey={setLlmApiKey}
              model={model}
              setModel={setModel}
              availableModels={availableModels}
            />

            <div className="my-4">
              <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                输入需要摘要的文本
              </label>
              <textarea
                id="text"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="请输入要生成摘要的文本..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !text.trim()}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  loading || !text.trim()
                    ? 'bg-indigo-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {loading ? '生成中...' : '生成摘要'}
              </button>
            </div>
          </form>

          {summary && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">摘要结果</h3>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-gray-700 whitespace-pre-line">{summary}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </FeatureLayout>
  );
} 