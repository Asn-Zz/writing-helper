"use client";

import React, { useState, useMemo, useCallback } from 'react';
import {
    FaPenFancy, FaCopy, FaTrashAlt, FaLightbulb, FaCompressArrowsAlt,
    FaSearch
} from 'react-icons/fa';
import { ApiConfigProps } from '@/app/components/ApiSettingBlock';
import FileUpload from '@/app/components/FileUpload';
import { generate } from '@/app/lib/api';
import ThesaurusManager from './ThesaurusManager';
import { Issue, Thesaurus } from '../types';

const PROOFREADING_MODEL = 'deepseek-v3';
const PROOFREADING_PROMPT = '你是一个专业的文章校对编辑，擅长发现并修正中文语法、拼写错误，同时保持原文风格。';

interface InputSectionProps {
    apiConfig: ApiConfigProps;
    inputText: string;
    isLoading: boolean;
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
    isLoading,
    setInputText,
    setIssues,
    setShowResults,
    setIsLoading,
    setApiError,
    setOriginalTextForIssues,
    setPdfPreviewUrl,
}: InputSectionProps) {
    const charCount = useMemo(() => inputText.length, [inputText]);

    const clearInput = useCallback(() => {
        setInputText('');
        setOriginalTextForIssues('');
        setIssues([]);
        setShowResults(false);
        setApiError(null);
    }, [setInputText, setOriginalTextForIssues, setIssues, setShowResults, setApiError]);

    const [thesauruses, setThesauruses] = useState<Thesaurus[]>([]);
    const createPrompt = useCallback((text: string): string => {
        const strictness = "严格检查所有可能的错误，包括拼写、语法、用词不当，并进行优化。";
        const thesaurusList = thesauruses.filter(t => t.enabled).map(t => t.corrections).flat();
        
        return `请分析以下文字片段，找出其中的语法错误、拼写错误、用词不当等问题，并提供修改建议。${strictness}
要求返回一个JSON数组，每个元素包含以下字段：
- "original": 原始文本片段 (必须在原文中精确存在)
- "suggestion": 建议修改后的文本
- "reason": 修改原因的简要说明
- "category": 错误类型，可选值为 '错别字', '语法错误', '标点符号', '表达优化'
请确保:
1. 只返回JSON格式的数据，不要包含任何额外解释或markdown标记。
2. "original" 字段必须是原文中连续且完全匹配的片段。
3. 保持原文风格，不要过度修改。
文本内容：
"""
${text}
"""
${thesaurusList.length > 0 ? `自定义词库：${thesaurusList.map(t => t.original + ' => ' + t.suggestion).join(', ')}` : ''}
请直接返回JSON数组：`;
    }, [thesauruses]);

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
              response_format: { type: 'json_object' },
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

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <FaPenFancy className="text-blue-500" />
                </div>
                <div className="flex items-center justify-between w-full">
                    <h2 className="text-xl font-semibold">输入与校对</h2>
                    <ThesaurusManager setThesauruses={setThesauruses} />
                </div>
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

            <FileUpload
                apiConfig={apiConfig}
                onTextExtracted={setInputText}
                setApiError={setApiError}
                setPdfPreviewUrl={setPdfPreviewUrl}
                clearInput={clearInput}
            />

            <div className="flex justify-between items-center mt-6">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={loadExample}
                        className="flex items-center border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg transition text-sm sm:text-base"
                    >
                        <FaLightbulb className="mr-1" /> 示例
                    </button>
                    <button
                        onClick={compressText}
                        className="flex items-center border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg transition text-sm sm:text-base"
                        title="移除多余的换行符"
                    >
                        <FaCompressArrowsAlt className="mr-1" /> 压缩
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <span className="flex items-center text-gray-500 hover:text-gray-700 cursor-pointer" onClick={clearInput}>
                        <FaTrashAlt />&nbsp;清空
                    </span>

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
            </div>
        </div>
    );
}