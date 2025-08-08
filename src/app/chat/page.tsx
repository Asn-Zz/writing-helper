"use client";

import React, { useState, useEffect, useRef } from 'react';
import FeatureLayout from '../components/FeatureLayout';
import { useApiSettings } from '../components/ApiSettingsContext';
import ReactMarkdown from 'react-markdown';
import { FaClipboard, FaTrash, FaSync } from 'react-icons/fa';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const { apiConfig, setApiConfig } = useApiSettings();
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好，我是AI编辑助手，很高兴与你交流。' },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageIndex(index);
      setTimeout(() => {
        setCopiedMessageIndex(null);
      }, 2000);
    });
  };

  const handleClearChat = () => {
    setMessages([
      { role: 'assistant', content: '你好，我是AI编辑助手，很高兴与你交流。' },
    ]);
  };

  const streamResponse = async (messagesForApi: Message[]) => {
    setIsLoading(true);
    try {
      const response = await fetch(apiConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...messagesForApi],
          temperature,
          model: apiConfig.model,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response from server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                assistantResponse += content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1].content = assistantResponse;
                  return updated;
                });
              }
            } catch (error) {
              console.error('Error parsing stream data:', data, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (isLoading) return;

    const lastUserMessageIndex = messages.map(m => m.role).lastIndexOf('user');
    if (lastUserMessageIndex === -1) {
      return;
    }
    const messagesForContext = messages.slice(0, lastUserMessageIndex + 1);
    setMessages(messagesForContext);
    await streamResponse(messagesForContext);
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: userInput }];
    setMessages(newMessages);
    setUserInput('');
    await streamResponse(newMessages);
  };

  return (
    <FeatureLayout title="模型演练场" subtitle="与大语言模型进行对话，点击设置切换模型">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 bg-white rounded-lg shadow flex flex-col" style={{ minHeight: '65vh' }}>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-white'}`}>
                  {msg.role === 'user' ? 'U' : 'A'}
                </div>
                <div
                  className={`relative group px-4 py-3 rounded-lg max-w-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-800'
                    }`}
                >
                  <ReactMarkdown>
                    {msg.content}
                  </ReactMarkdown>
                  {index !== 0 && msg.role === 'assistant' && msg.content && (
                    <div className="absolute top-0 right-0 mt-2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => handleCopy(msg.content, index)}
                            className="p-1 rounded text-gray-500 hover:text-gray-800"
                        >
                            {copiedMessageIndex === index ? (
                                <span className="text-xs">Copied!</span>
                            ) : (
                                <FaClipboard />
                            )}
                        </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <button
                onClick={handleClearChat}
                className="flex items-center px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <FaTrash className="mr-1" />
                清空
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isLoading || !messages.some(m => m.role === 'user')}
                className="flex items-center px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                <FaSync className="mr-1" />
                重新生成
              </button>
            </div>

            <div className="relative">
              <textarea
                className="w-full p-4 pr-24 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={2}
                placeholder="输入消息... (Shift + Enter 换行)"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                onClick={handleSendMessage}
                disabled={isLoading || !userInput.trim()}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-1 bg-white p-6 rounded-lg">
          <div className="space-y-6">
            <div>
              <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                模型选择
              </label>
              <input
                type="text"
                value={apiConfig.model}
                onChange={(e) => setApiConfig({ ...apiConfig, model: e.target.value })}
                className="w-full px-2 py-1 mt-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="temperature" className="text-sm font-medium text-gray-700">
                  温度
                </label>
                <span className="text-sm font-mono text-gray-600 bg-white px-2 py-1 rounded-md">{temperature.toFixed(1)}</span>
              </div>
              <input
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2 accent-blue-600"
              />
            </div>

            <div>
              <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                系统提示词
              </label>
              <textarea
                id="system-prompt"
                rows={10}
                className="w-full p-3 mt-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </FeatureLayout>
  );
}
