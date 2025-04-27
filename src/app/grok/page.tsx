"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import FeatureLayout from '../components/FeatureLayout';

export default function GrokTest() {
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('https://api.x.ai/v1/chat/completions');
  const [isOllama, setIsOllama] = useState(false);
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434/api/generate');
  const [ollamaModel, setOllamaModel] = useState('llama2');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [wordCount, setWordCount] = useState('1000');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [style, setStyle] = useState({
    role: '写作助手',
    expertise: ['写作', '内容创作'],
    writingStyle: ['清晰', '专业'],
    tone: '正式',
    structure: ['段落分明', '逻辑清晰'],
    requirements: ['原创', '高质量']
  });
  const [prompt, setPrompt] = useState<string>('Testing. Just say hi and hello world and nothing else.');
  const [response, setResponse] = useState<string>('');
  const [rawResponse, setRawResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取可用的 Ollama 模型
  const fetchOllamaModels = async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        throw new Error('无法获取模型列表');
      }
      const data = await response.json();
      if (data.models) {
        setAvailableModels(data.models);
        if (data.models.length > 0 && !data.models.includes(ollamaModel)) {
          setOllamaModel(data.models[0]);
        }
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
      setError('无法获取 Ollama 模型列表，请确保 Ollama 服务正在运行');
    }
  };

  // 当切换到 Ollama 时获取模型列表
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (isOllama) {
      fetchOllamaModels();
    }
  }, [isOllama]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse('');
    setRawResponse('');

    try {
      // 检查 Ollama 服务是否可用
      if (isOllama) {
        try {
          const checkResponse = await fetch(ollamaEndpoint.replace('/api/generate', '/api/tags'));
          if (!checkResponse.ok) {
            throw new Error('无法连接到 Ollama 服务，请确保：\n1. Ollama 已安装并运行\n2. 服务地址正确（默认：http://localhost:11434）\n3. 没有防火墙阻止连接');
          }
        } catch (error) {
          throw new Error('无法连接到 Ollama 服务，请确保：\n1. Ollama 已安装并运行\n2. 服务地址正确（默认：http://localhost:11434）\n3. 没有防火墙阻止连接');
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 如果不是 Ollama，添加 API Key
      if (!isOllama && apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const requestBody = {
        model: isOllama ? ollamaModel : 'grok-1',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的${style.role}，擅长${style.expertise.join('、')}。你的写作风格是${style.writingStyle.join('、')}。`
          },
          {
            role: 'user',
            content: prompt || `请根据以下要求生成内容：
主题：${topic}
关键词：${keywords}
字数要求：${wordCount}字
写作风格：${style.writingStyle.join('、')}
专业领域：${style.expertise.join('、')}
角色定位：${style.role}
语气：${style.tone}
结构要求：${style.structure.join('、')}
特殊要求：${style.requirements.join('、')}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      };

      // 添加重试逻辑
      let retries = 3;
      let lastError = null;

      while (retries > 0) {
        try {
          const proxyResponse = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              targetUrl: isOllama ? ollamaEndpoint : apiEndpoint,
              headers: headers,
              body: requestBody,
              isOllama: isOllama
            })
          });
          
          if (!proxyResponse.ok) {
            const errorData = await proxyResponse.json().catch(() => ({ error: { message: `代理服务错误: ${proxyResponse.status}` } }));
            
            // 处理超时错误
            if (proxyResponse.status === 504) {
              throw new Error('请求超时，请稍后重试。如果问题持续存在，请检查网络连接或联系支持。');
            }
            
            throw new Error(errorData.error?.message || `代理服务错误: ${proxyResponse.status}: ${proxyResponse.statusText}`);
          }
          
          const data = await proxyResponse.json();
          console.log('代理 API 响应:', data);
          
          // 保存原始响应用于调试
          setRawResponse(JSON.stringify(data, null, 2));
          
          // 尝试不同的方式解析响应内容
          let content = '';
          
          if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
            // 标准格式
            content = data.choices[0].message.content;
            console.log('从 choices[0].message.content 提取内容');
          } else if (data.message && data.message.content) {
            // 替代格式1
            content = data.message.content;
            console.log('从 message.content 提取内容');
          } else if (data.content) {
            // 替代格式2
            content = data.content;
            console.log('从 content 提取内容');
          } else if (data.output) {
            // 替代格式3
            content = data.output;
            console.log('从 output 提取内容');
          } else if (data.response) {
            // 替代格式4
            content = data.response;
            console.log('从 response 提取内容');
          } else if (data.text) {
            // 替代格式5
            content = data.text;
            console.log('从 text 提取内容');
          } else if (typeof data === 'string') {
            // 可能整个响应就是文本
            content = data;
            console.log('响应本身是字符串');
          } else {
            // 无法识别的格式，显示整个响应
            content = "无法从响应中提取内容。请查看原始响应。";
            console.log('无法识别的响应格式');
          }
          
          setResponse(content);
          break; // 成功则退出重试循环
        } catch (error) {
          lastError = error;
          retries--;
          if (retries > 0) {
            console.log(`请求失败，剩余重试次数: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
          }
        }
      }

      if (retries === 0 && lastError) {
        throw lastError;
      }
    } catch (error) {
      console.error('请求错误:', error);
      setError(error instanceof Error ? error.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureLayout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1H4v8a1 1 0 001 1h10a1 1 0 001-1V6zM4 4a1 1 0 011-1h10a1 1 0 011 1v1H4V4z" clipRule="evenodd" />
              </svg>
              Grok API 测试
            </h1>
            <Link 
              href="/" 
              className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium transition duration-150 ease-in-out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              返回写作助手
            </Link>
          </div>
          
          <p className="mb-6 text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-100">
            此测试页面可帮助您验证 Grok API 的连接和响应。成功测试后，您可以在写作助手中使用相同的 API 密钥。
          </p>
          
          <form onSubmit={handleSubmit} className="mb-6 space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useOllama"
                checked={isOllama}
                onChange={(e) => setIsOllama(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="useOllama" className="text-sm font-medium text-gray-700">
                使用 Ollama
              </label>
            </div>

            {isOllama ? (
              <>
                <div>
                  <label htmlFor="ollamaEndpoint" className="block text-sm font-medium text-gray-700">
                    Ollama 端点
                  </label>
                  <input
                    type="text"
                    id="ollamaEndpoint"
                    value={ollamaEndpoint}
                    onChange={(e) => setOllamaEndpoint(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="http://localhost:11434/api/generate"
                  />
                </div>
                <div>
                  <label htmlFor="ollamaModel" className="block text-sm font-medium text-gray-700">
                    Ollama 模型
                  </label>
                  <select
                    id="ollamaModel"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    {availableModels.length > 0 ? (
                      availableModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))
                    ) : (
                      <option value="llama2">llama2</option>
                    )}
                  </select>
                </div>
                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
                    主题
                  </label>
                  <input
                    type="text"
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="输入文章主题"
                  />
                </div>
                <div>
                  <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">
                    关键词
                  </label>
                  <input
                    type="text"
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="输入关键词，用逗号分隔"
                  />
                </div>
                <div>
                  <label htmlFor="wordCount" className="block text-sm font-medium text-gray-700">
                    字数
                  </label>
                  <input
                    type="number"
                    id="wordCount"
                    value={wordCount}
                    onChange={(e) => setWordCount(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="输入目标字数"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                    API Key
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="输入您的 API Key"
                  />
                </div>
                <div>
                  <label htmlFor="apiEndpoint" className="block text-sm font-medium text-gray-700">
                    API 端点
                  </label>
                  <input
                    type="text"
                    id="apiEndpoint"
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="https://api.x.ai/v1/chat/completions"
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">提示词</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
                placeholder={`请根据以下要求生成内容：
主题：${topic}
关键词：${keywords}
字数要求：${wordCount}字`}
              />
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 px-6 rounded-md font-medium disabled:opacity-60 disabled:from-gray-400 disabled:to-gray-500 transition duration-150 ease-in-out shadow-md w-full sm:w-auto"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    请求中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    发送请求
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {error && (
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-red-800">请求错误</h3>
                <div className="mt-2 text-red-700">
                  <pre className="whitespace-pre-wrap text-sm bg-red-50 p-3 rounded-md">{error}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {response && (
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              解析后的响应内容
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <pre className="whitespace-pre-wrap text-sm">{response}</pre>
            </div>
          </div>
        )}
        
        {rawResponse && (
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              原始 API 响应 (JSON)
            </h2>
            <pre className="whitespace-pre-wrap text-xs text-green-600 bg-gray-900 p-4 rounded-lg overflow-auto max-h-96 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">{rawResponse}</pre>
          </div>
        )}
        
        <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
            </svg>
            技术说明
          </h2>
          <div className="space-y-4">
            <p className="text-gray-700">本示例使用了如下 Grok API 格式:</p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto max-h-60 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
{`curl https://api.x.ai/v1/chat/completions 
-H "Content-Type: application/json" 
-H "Authorization: Bearer xai-YOUR_API_KEY" 
-d '{
  "messages": [
    {
      "role": "system",
      "content": "You are a test assistant."
    },
    {
      "role": "user",
      "content": "Testing. Just say hi and hello world and nothing else."
    }
  ],
  "model": "grok-2-latest",
  "stream": false,
  "temperature": 0
}'`}
            </pre>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-gray-700">
              <h3 className="font-semibold text-yellow-800 mb-2">故障排除提示</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>如果您看到&ldquo;无内容生成&rdquo;的问题，请检查上方显示的原始 API 响应格式</li>
                <li>确保您的 API 密钥格式正确（以 xai- 开头）</li>
                <li>查看浏览器控制台以获取更多调试信息</li>
                <li>成功测试后，可以使用相同配置在写作助手中使用 Grok API</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* <div className="text-center mt-6 text-gray-600 text-sm">
          <p>
            <Link href="/" className="text-blue-600 hover:underline">返回写作助手</Link> • 
            Grok API 测试工具 • 
            <a href="/polish" className="text-blue-600 hover:underline">文章润色</a> •
            <a href="https://x.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">X.AI</a>
          </p>
          
          <div className="mt-4 flex justify-center space-x-4">
            <a href="https://github.com/GeekyWizKid" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-black transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
            </a>
            <a href="https://x.com/named_Das" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-blue-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/>
              </svg>
            </a>
            <a href="mailto:dasvenxx@gmail.com" className="text-gray-700 hover:text-red-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555ZM0 4.697v7.104l5.803-3.558L0 4.697ZM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-1.239-.757Zm3.436-.586L16 11.801V4.697l-5.803 3.546Z"/>
              </svg>
            </a>
          </div>
          
          <p className="mt-2 text-xs text-gray-500">© {new Date().getFullYear()} 写作助手 - 由 Cursor 强力驱动</p>
        </div> */}
      </div>
    </FeatureLayout>
  );
} 