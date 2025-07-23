"use client";

import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
    FaPenFancy, FaCopy, FaTrashAlt, FaLightbulb, FaCompressArrowsAlt,
    FaFileAlt, FaCloudUploadAlt, FaTimes, FaSearch
} from 'react-icons/fa';
import { ApiConfigProps } from '@/app/components/ApiSettingBlock';
import { generate, generateOcr } from '@/app/lib/api';
import { Issue } from '../types';

const PROOFREADING_MODEL = 'deepseek-v3';
const PROOFREADING_PROMPT = '你是一个专业的文章校对编辑，擅长发现并修正中文语法、拼写错误，同时保持原文风格。';

interface InputSectionProps {
    apiConfig: ApiConfigProps;
    inputText: string;
    setInputText: (text: string) => void;
    setIssues: (issues: Issue[]) => void;
    setShowResults: (show: boolean) => void;
    setIsLoading: (loading: boolean) => void;
    setApiError: (error: string | null) => void;
    setOriginalTextForIssues: (text: string) => void;
    setPdfPreviewUrl: (url: string | null) => void;
}

export default function InputSection({
    apiConfig,
    inputText,
    setInputText,
    setIssues,
    setShowResults,
    setIsLoading,
    setApiError,
    setOriginalTextForIssues,
    setPdfPreviewUrl,
}: InputSectionProps) {
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const charCount = useMemo(() => inputText.length, [inputText]);
    const isLoading = isProcessingFile;

    const removeUploadedFile = useCallback(() => {
        setUploadedFileName(null);
        setPdfPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [setPdfPreviewUrl]);

    const clearInput = useCallback(() => {
        setInputText('');
        setOriginalTextForIssues('');
        setIssues([]);
        setShowResults(false);
        setApiError(null);
        removeUploadedFile();
    }, [setInputText, setOriginalTextForIssues, setIssues, setShowResults, setApiError, removeUploadedFile]);

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        clearInput();
        setUploadedFileName(file.name);

        if (file.type === 'application/pdf') {
            const url = URL.createObjectURL(file);
            setPdfPreviewUrl(url);
            setInputText('');
            return;
        }

        setIsProcessingFile(true);
        setApiError(null);
        setInputText('');

        const formData = new FormData();
        formData.append('file', file);        

        try {
            const ocrTypes = ['image', 'audio']

            if (ocrTypes.includes(file.type.split('/')[0])) {
                const { text, error } = await generateOcr({ file, ...apiConfig });
                if (!text && error) { throw new Error(error) }

                setInputText(text);
            } else {
                const response = await fetch('/api/file-upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'File upload failed');
                }

                const data = await response.json();
                setInputText(data.text);
            }
        } catch (error: any) {
            setApiError(`文件处理失败: ${error.message || '无法读取文件内容'}`);
            removeUploadedFile();
        } finally {
            setIsProcessingFile(false);
        }
    }, [clearInput, apiConfig, setInputText, setApiError, removeUploadedFile, setPdfPreviewUrl]);

    const createPrompt = useCallback((text: string): string => {
        const strictness = "严格检查所有可能的错误，包括拼写、语法、用词不当，并进行优化。";
        return `请分析以下文字片段，找出其中的语法错误、拼写错误、用词不当等问题，并提供修改建议。${strictness}
要求返回一个JSON数组，每个元素包含以下字段：
- "original": 原始文本片段 (必须在原文中精确存在)
- "suggestion": 建议修改后的文本
- "reason": 修改原因的简要说明
请确保:
1. 只返回JSON格式的数据，不要包含任何额外解释或markdown标记。
2. "original" 字段必须是原文中连续且完全匹配的片段。
3. 保持原文风格，不要过度修改。
文本内容：
"""
${text}
"""
请直接返回JSON数组：`;
    }, []);

    const checkText = useCallback(async () => {
        if (isLoading || !inputText.trim()) return;

        setIsLoading(true);
        setShowResults(false);
        setIssues([]);
        setApiError(null);
        setOriginalTextForIssues(inputText);

        try {
            const prompt = createPrompt(inputText);
            const data = await generate({
              ...apiConfig,
              model: apiConfig.model || PROOFREADING_MODEL,
              messages: [
                { role: "system", content: PROOFREADING_PROMPT },
                { role: "user", content: prompt }
              ],
              temperature: 0.1,
            });
            const parsedIssues = JSON.parse(data.content);
            if (!Array.isArray(parsedIssues)) throw new Error('响应不是JSON数组。');
            
            let currentOffset = 0;
            const processedIssues: Issue[] = [];
            let issueIdCounter = 0;
            const textToSearch = inputText;

            parsedIssues.forEach(item => {
                if (!item || typeof item.original !== 'string' || typeof item.suggestion === 'undefined' || typeof item.reason !== 'string') {
                    console.warn('跳过格式不完整的建议:', item); return;
                }
                
                const start = textToSearch.indexOf(item.original.slice(0, 5), currentOffset);
                const pushItem = (start = 0) => {
                    const end = start + item.original.length;
                    processedIssues.push({
                        ...item,
                        id: issueIdCounter++,
                        start: start,
                        end: end,
                        fixed: false
                    });
                    currentOffset = start + 1;      
                }

                if (start !== -1) {
                   pushItem(start)                    
                } else {
                    const fallbackStart = textToSearch.indexOf(item.original);
                    if (fallbackStart !== -1) {
                        pushItem(fallbackStart);
                    }
                }
            });

            setIssues(processedIssues.sort((a, b) => a.start - b.start));
            setShowResults(true);

        } catch (error: any) {
            setApiError(error.message || '发生未知错误');
            setShowResults(false);
            setOriginalTextForIssues('');
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, inputText, createPrompt, apiConfig, setIsLoading, setShowResults, setIssues, setApiError, setOriginalTextForIssues]);

    const copyText = useCallback(() => {
        if (!inputText.trim()) return;
        navigator.clipboard.writeText(inputText).then(() => alert('文本已复制!')).catch(() => alert('复制失败'));
    }, [inputText]);

    const compressText = useCallback(() => {
        if (!inputText.trim()) return;
        setInputText(inputText.replace(/(\r\n|\r|\n){2,}/g, '\n'));
    }, [inputText, setInputText]);

    const loadExample = useCallback(() => {
        clearInput();
        const example = `太阳徐徐升起，给大地带来了早晨的气息。小名从梦中惊醒，他揉了揉眼睛，发先已经9点了。
他慌张的穿上衣服，拿起手提包就像着学校奔去。路上，他遇到了几个同班同学，他们一个个都在得意的笑着，原来，今天是星期六，没有课。
小明停下了脚本，仔细的想了想，确实，昨天是星期五，所以今天应该没有上课。他懊恼的拍了拍脑袋，自言自语道："我记忆力怎么这么差啊！"
回到家后，妈妈正在做饭。"你去哪了？"妈妈问道。小名有点尴尬的回答"我以为今天有课，差点去学校上课了。"妈妈哈哈大笑，说道："你呀，真是太马虎了，连今天星期几都能记错。"
小明想起上周也发生过类似的一件事情，他把语文老师留的作业给忘记了，结果被老师在全班面前批评，他真的很伤心；
人们常说"书读百变，其义自现。"小明觉的这句话特别有道理。他决定从明天开始，每天写一篇读书笔记，提高自己的阅读理解能力。`;
        setInputText(example);
    }, [clearInput, setInputText]);

    const handleFileSelect = useCallback(() => fileInputRef.current?.click(), []);

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mt-4 mb-8">
            <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <FaPenFancy className="text-blue-500" />
                </div>
                <h2 className="text-xl font-semibold">输入与校对</h2>
            </div>

            <div className="relative mb-4">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={10}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="在此处粘贴您的文章内容..."
                />
                <button
                    onClick={copyText}
                    className="absolute top-2 right-2 bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition"
                    title="复制文本"
                >
                    <FaCopy />
                </button>
                <div className="absolute bottom-4 right-4 text-gray-400 text-sm">
                    <span>{charCount}</span> 字符
                </div>
            </div>

            <div>
                <div
                    className="flex items-center border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={handleFileSelect}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="*"
                        className="hidden"
                    />
                    {!uploadedFileName && !isProcessingFile && (
                        <div className="text-gray-500 w-full">
                            <FaCloudUploadAlt className="text-2xl mb-2 mx-auto" />
                            <p>点击或拖拽文件到此处</p>
                            <p className="text-xs mt-1">支持 TXT, DOCX, MD, PNG, JPG, MP3, PDF 等</p>
                        </div>
                    )}
                    {uploadedFileName && !isProcessingFile && (
                         <div className="relative w-full">
                            <div className="bg-gray-100 p-3 rounded max-h-32 mx-auto overflow-hidden flex items-center justify-center">
                                <FaFileAlt className="text-purple-500 text-2xl mr-2 flex-shrink-0" />
                                <span className="text-gray-700 text-sm truncate flex-grow text-left">{uploadedFileName}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeUploadedFile(); }}
                                    className="ml-3 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0"
                                    title="移除文件"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </div>
                    )}
                     {isProcessingFile && (
                        <div className="relative w-full">
                             <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                                 <div className="loading-spinner mr-2"></div>
                                 <span className="text-sm text-gray-600">处理中...</span>
                             </div>
                             <div className="bg-gray-100 p-3 rounded max-h-32 mx-auto overflow-hidden flex items-center justify-center opacity-50">
                                 <FaFileAlt className="text-purple-500 text-2xl mr-2" />
                                 <span className="text-gray-700 text-sm truncate">{uploadedFileName || '...'}</span>
                             </div>
                         </div>
                     )}
                </div>
            </div>

            <div className="flex justify-between items-center mt-6">
                <div>
                    <button
                        onClick={checkText}
                        disabled={isLoading || !inputText.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="loading-spinner mr-2 border-top-color-white"></span>
                        ) : (
                            <FaSearch className="mr-2" />
                        )}
                        {isLoading ? '校对中...' : '开始校对'}
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={loadExample}
                        className="flex items-center border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg transition text-sm sm:text-base"
                    >
                        <FaLightbulb className="mr-1" /> 示例
                    </button>
                    <button
                        onClick={clearInput}
                        className="flex items-center border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg transition text-sm sm:text-base"
                    >
                        <FaTrashAlt className="mr-1" /> 清空
                    </button>
                    <button
                        onClick={compressText}
                        className="flex items-center border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg transition text-sm sm:text-base"
                        title="移除多余的换行符"
                    >
                        <FaCompressArrowsAlt className="mr-1" /> 压缩
                    </button>
                </div>
            </div>
        </div>
    );
}