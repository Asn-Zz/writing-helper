"use client";

import React, { useState, useMemo, useRef } from 'react';
import { generate, exportToMarkdown } from '@/app/lib/api';
import { useApiSettings } from '@/app/components/ApiSettingsContext';
import MarkdownEditor from './MarkdownEditor';
import ArticleList, { ArticleItem } from './ArticleList';
import PromptList from '@/app/components/PromptList';
import { FaMagic, FaSearch } from 'react-icons/fa';
import { objectToQueryString } from '@/app/lib/utils';

const defaultPromptStyle = "质朴平实的散文笔触，以赶海为线索串联起乡愁记忆与人文关怀";

interface Message {
  role?: string;
  content?: string;
}

export default function WritingAssistant() {
  const [prompt, setPrompt] = useState<string>(defaultPromptStyle);
  const [useCustomPrompt, setUseCustomPrompt] = useState<boolean>(false);
  const [topic, setTopic] = useState<string>('儿时赶海');
  const [keywords, setKeywords] = useState<string>('浙江海边、小时候、渔村、温暖、质朴');
  const [wordCount, setWordCount] = useState<number>(800);
  const [articles, setArticles] = useState<string[]>([]);

  const { apiConfig } = useApiSettings();

  const notOpenAIKey = useMemo(() => {    
    return apiConfig.apiProvider !== 'ollama' && !apiConfig.apiKey;
  }, [apiConfig]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiResponseDetails, setApiResponseDetails] = useState<string | null>(null);

  const handleKeywordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeywords(e.target.value);
  };

  const [time, setTime] = useState<string>('');
  const [lastOutput, setLastOutput] = useState<string>('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setApiResponseDetails(null);
    setTime('');

    const userMessage = [
      useCustomPrompt && prompt ? { role: 'system', content: prompt } : {},
      articles.length ? { role: 'user', content: articles.join('') } : {}, 
      output ? { role: 'user', content: output } : {},
      topic && wordCount ? { role: 'user', content: `为我编写一篇${wordCount}字的文章，主题是${topic}，输出格式为markdown。关键词：${keywords}，不需要任何解释` } : {}
    ];
    const newMessages = userMessage.filter(msg => msg.content);
    setMessages(newMessages);
    setLastOutput(output);

    try {      
      const startTime = new Date();
      const translatedPrompt = await generate({
          ...apiConfig,
          model: 'gemini-2.5-pro',
          messages: newMessages,
          temperature: 0.7,
          handler(message) {
            setIsLoading(false);
            setOutput(message);

            const previewElm = document.getElementById('preview');
            if (previewElm) {
              previewElm.scrollTo({ top: previewElm.scrollHeight, behavior: 'smooth' });
            }
          }
      });

      if (translatedPrompt.content) {
        setOutput(translatedPrompt.content);
        setTime(`耗时: ${(new Date().getTime() - startTime.getTime()) / 1000} s`);
      }
    } catch (error) {
      setMessages(messages);
      setError((error as Error).message);
      setApiResponseDetails((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (output) {
      exportToMarkdown(topic, output);
    }
  };

  const handleExportConversation = () => {
    if (messages.length > 0) {
      const conversationContent = messages
        .map(msg => msg.content)
        .join('\\n\\n---\\n\\n');
      if (conversationContent) {
        exportToMarkdown(`${topic}(对话)`, conversationContent);
      }
    }
  };

  const exportArticle = (article: ArticleItem) => {
    setOutput(article.content);
  };

  const onSelectPrompt = (prompt: string) => {
    setPrompt(prompt);
    setUseCustomPrompt(true);
  };

  const searchTopic = async () => {
    if (!topic || isLoading) { return }
    const payload = objectToQueryString({ model: 'searchgpt', token: process.env.NEXT_PUBLIC_POLLAI_KEY });

    setIsLoading(true);
    const response = await fetch(`https://text.pollinations.ai/${topic}?${payload}`);
    const data = await response.text();
    setOutput(data);
    setIsLoading(false);
  };

  const generateKeyWords = async () => {
    const inputText = output || topic || '';
    const keywords = await generate({
        ...apiConfig,
        model: 'gemini-2.0-flash-exp',
        messages: [{ role: 'user', content: `根据提供的主题或者内容给出文章3-5个关键词按、分割，不需要任何解释:\n${inputText}` }],
        temperature: 0.7
    });

    if (keywords.content) {
      setKeywords(keywords.content);
    }
  }

  return (
    <div className="h-full">
      <div>
        <PromptList onSelectPrompt={onSelectPrompt} group="文章" />

        <ArticleList setArticles={setArticles} exportArticle={exportArticle} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
              <div className='flex items-center justify-between'>
                <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  写作设置
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Content Settings */}
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-4">
                  <h3 className="font-medium text-gray-700 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    内容设置
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      主题
                    </label>
                    <div className="flex items-start gap-2 text-sm">
                      <input
                        type="text"
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                      />
                      <button 
                        type="button" 
                        onClick={searchTopic} 
                        className="flex items-center gap-2 p-2 border border-gray-300 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        disabled={isLoading || !topic}
                      >
                        <FaSearch /> 搜索
                      </button>  
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      关键词（用、分隔）
                    </label>
                    <div className="flex items-start gap-2 text-sm">
                      <input
                        type="text"
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={keywords}
                        onChange={handleKeywordsChange}
                      />

                      <button 
                        type="button" 
                        onClick={generateKeyWords} 
                        className="flex items-center gap-2 p-2 border border-gray-300 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        disabled={isLoading || !keywords}
                      >
                        <FaMagic /> 自动
                      </button>  
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      字数
                    </label>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={wordCount}
                      onChange={(e) => setWordCount(Number(e.target.value))}
                    />
                  </div>
                </div>
                
                {/* Prompt Style Editor */}
                <div 
                  className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-gray-700 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                      </svg>
                      提示词风格
                    </h3>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-blue-600 rounded"
                          checked={useCustomPrompt}
                          onChange={(e) => setUseCustomPrompt(e.target.checked)}
                        />
                        <span className="text-sm text-gray-700">自定义风格</span>
                      </label>
                    </div>
                  </div>

                  <textarea
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="请输入您期望的写作风格，例如：质朴平实的散文笔触，以赶海为线索串联起乡愁记忆与人文关怀"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 px-6 rounded-md font-medium disabled:opacity-60 disabled:from-gray-400 disabled:to-gray-500 transition duration-150 ease-in-out transform hover:scale-105 shadow-md"
                    disabled={isLoading || (notOpenAIKey)}
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        生成中...
                      </span>
                    ) : '生成内容'}
                  </button>
                  
                  {output.length > 0 && (
                    <button
                      type="button"
                      onClick={(event) => {
                        setMessages([]);
                        setOutput(lastOutput);
                        handleSubmit(event);
                      }}
                      className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-2 px-4 rounded-md font-medium transition duration-150 ease-in-out transform hover:scale-105 shadow-md"
                    >
                      重新生成
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        
          {/* Output Section */}
          <div>
            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200 h-full flex flex-col relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  生成结果
                </h2>
                {output && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleExport}
                      className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-4 rounded-md text-sm flex items-center transition duration-150 ease-in-out shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      导出当前
                    </button>
                    {messages.length > 0 && (
                      <button
                        onClick={handleExportConversation}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-4 rounded-md text-sm flex items-center transition duration-150 ease-in-out shadow-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        导出对话
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex-grow min-h-[500px]">
                {error && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200 mb-4">
                    <div className="font-medium flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      错误: {error}
                    </div>
                    {apiResponseDetails && (
                      <div className="mt-2 text-sm pl-7">{apiResponseDetails}</div>
                    )}
                  </div>
                )}
                
                {isLoading ? (
                  <div className="flex justify-center items-center bg-gray-50 border border-gray-200 rounded-lg h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-600 mb-2">正在生成内容，请稍候...</p>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto">这可能需要几秒到几分钟的时间，取决于 API 响应速度和内容长度</p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute top-[10%] left-0 w-full h-[90%] rounded-lg p-6 pt-0">
                    <MarkdownEditor 
                      initialContent={output} 
                      onContentChange={(content) => {
                        setOutput(content);
                        // Update the last assistant message in the conversation if needed
                        if (messagesRef.current.length > 0) {
                          const lastMessage = messagesRef.current[messagesRef.current.length - 1];
                          if (lastMessage.role === 'assistant') {
                            const updatedMessages = [...messagesRef.current];
                            updatedMessages[updatedMessages.length - 1] = { ...lastMessage, content };
                            setMessages(updatedMessages);
                          }
                        }
                      }} 
                    />

                    <p className='text-xs text-gray-500 pt-1 flex gap-2'>
                      {output && <span>{output.length} 字</span>}
                      {time && <span>{time}</span>}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
