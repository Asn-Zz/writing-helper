"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApiSettings } from './ApiSettingsContext';
import { generate } from '../lib/api';

export default function WritingHelp() {
  const { apiConfig } = useApiSettings();
  const [text, setText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [targetWordCount, setTargetWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'unsaved' | 'saving' | 'saved'>('saved');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const cursorPositionRef = useRef<number>(0);

  // 组件挂载和卸载时设置标志
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 获取写作建议
  const getWritingSuggestion = useCallback(async (prefix: string, suffix?: string) => {
    if (!prefix.trim()) {
      setSuggestion('');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let fullPrompt = '';
      if (topic || description) {
        fullPrompt = `主题: ${topic}\n描述: ${description}\n字数: ${targetWordCount}\n\n请根据以下上下文续写文本，只返回续写内容，不要添加任何解释或格式：\n\n上下文：${suffix || ''}\n\n待续写内容：${prefix}`;
      } else {
        fullPrompt = `请根据以下上下文续写文本，只返回续写内容，不要添加任何解释或格式：\n\n上下文：${suffix || ''}\n\n待续写内容：${prefix}`;
      }
      
      const data = await generate({
        ...apiConfig,
        model: 'gemini-2.0-flash-exp',
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        extra_body: JSON.stringify({
          prefix,
          suffix
        }),
        temperature: 0.7,
        stream: false
      });
      
      if (!isMountedRef.current) return;
      
      const content = data.content || '';
      const suggestion = content?.trim().replace(prefix, '');
        
      setSuggestion(suggestion);
      setText(prefix + suggestion + suffix);
    } catch (error) {
      console.error('获取建议失败:', error);
      if (isMountedRef.current) {
        setError('获取建议失败，请检查API设置或网络连接');
        setSuggestion('');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [apiConfig, topic, description, targetWordCount]);

  // 保存文本到本地存储
  const saveTextToStorage = useCallback((textToSave: string) => {
    try {
      setSaveStatus('saving');
      localStorage.setItem('writingHelperText', textToSave);
      
      if (isMountedRef.current) {
        setSaveStatus('saved');
        
        // 2秒后重置保存状态提示
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus(prev => prev === 'saved' ? 'saved' : prev);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('保存文本失败:', error);
      if (isMountedRef.current) {
        setSaveStatus('unsaved');
        setError('保存失败，请检查存储权限');
      }
    }
  }, []);

  // 处理文本变化
  const [lastText, setLastText] = useState('');
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    cursorPositionRef.current = e.target.selectionStart || 0;

    // 如果有建议未应用，重置文本
    if (suggestion) {
      setSuggestion('');
      setText(lastText);
    } else {
      setText(value);
    }
    
    setSaveStatus('unsaved');    
    setLastText(value);    
    
    // 清除之前的定时器
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }
    
    // 设置新的建议获取定时器
    suggestionTimeoutRef.current = setTimeout(() => {
      // 获取光标前后的文本
      const cursorPos = cursorPositionRef.current;
      const prefix = value.slice(0, cursorPos);
      const suffix = value.slice(cursorPos);  

      getWritingSuggestion(prefix, suffix);
    }, 2000);
  }, [suggestion, getWritingSuggestion]);

  // 应用建议
  const applySuggestion = useCallback(() => {
    if (suggestion) {
      const cursorPos = cursorPositionRef.current;
      
      setSuggestion('');
      saveTextToStorage(text);
      
      // 聚焦到textarea并设置光标位置
      if (textareaRef.current) {
        textareaRef.current.focus();
        // 在下一个事件循环中设置光标位置，确保DOM已更新
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = cursorPos + suggestion.length;
            textareaRef.current.selectionEnd = cursorPos + suggestion.length;
          }
        }, 0);
      }
    }
  }, [suggestion, text, saveTextToStorage]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 按Tab键应用建议
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      applySuggestion();
    }
    // 按ESC键取消建议
    if (e.key === 'Escape' && suggestion) {
      e.preventDefault();
      setSuggestion('');
      setText(lastText);
    }
  }, [lastText, suggestion, applySuggestion]);

  // 组件挂载时从本地存储加载文本
  useEffect(() => {
    try {
      const savedText = localStorage.getItem('writingHelperText');
      if (savedText) {
        setText(savedText);
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error('加载保存的文本失败:', error);
      setError('加载保存的文本失败');
    }
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, []);

  // 计算字数
  const wordCount = useMemo(() => text.length, [text]);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">                
        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
            <button 
              className="ml-2 text-red-800 font-bold"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        )}
        
        <div className="relative">
          <textarea
            id='textarea'
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={() => saveTextToStorage(text)}
            placeholder="开始写作... (按Tab键补全建议，按ESC键取消)"
            className="w-full h-84 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
          />
          {/* 补全文字覆盖层 */}
          {suggestion && (
            <div className="absolute top-0 left-0 border border-transparent w-full h-full p-3 pointer-events-none text-sm">
              <span className='opacity-0'>{text.slice(0, cursorPositionRef.current)}</span>
              <span className="text-gray-400 opacity-70">{suggestion}</span>
              <span className='opacity-0'>{text.slice(cursorPositionRef.current).replace(suggestion, '')}</span>
            </div>
          )}
          
          {/* 保存状态指示器 */}
          <div className="absolute top-2 right-2 flex items-center">
            {saveStatus === 'saving' && (
              <span className="text-xs text-gray-500 flex items-center">
                <span className="w-3 h-3 border-t-2 border-blue-500 rounded-full animate-spin mr-1"></span>
                保存中...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-green-500 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                已保存
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="text-xs text-yellow-500 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                未保存
              </span>
            )}
          </div>
          
          {/* 加载指示器 */}
          {loading && (
            <div className="absolute bottom-4 left-4">
              <div className="w-5 h-5 border-t-2 border-blue-500 rounded-full animate-spin"></div>
            </div>
          )}
          
          {/* 写作框右下角字数统计 */}
          <div className="absolute bottom-3 right-3 text-xs text-gray-500">
            {wordCount} 字
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>提示：输入文本时会自动获取写作建议，按Tab键补全，按ESC键取消</p>
        </div>

        {/* 主题和描述表单 */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
              主题
            </label>
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="请输入写作主题"
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="wordCount" className="block text-sm font-medium text-gray-700 mb-1">
              字数
            </label>
            <input
              type="number"
              id="wordCount"
              value={targetWordCount}
              onChange={(e) => setTargetWordCount(Number(e.target.value))}
              placeholder="请输入写作字数"
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="0"
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入写作描述或背景信息"
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
}