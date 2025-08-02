'use client'; // Required for hooks and event handlers

import React, { useState, useMemo, useCallback } from 'react';
import {
    FaBook, FaWeixin, FaTiktok, FaPlayCircle, FaWeibo,
    FaMagic, FaFeatherAlt, FaFire, FaChartLine, FaEye, FaBrain
} from 'react-icons/fa';
import { useApiSettings } from '@/app/components/ApiSettingsContext';
import { generate } from '@/app/lib/api';
import ContentCreationPanel from './components/ContentCreationPanel';
import ContentAnalysisPanel from './components/ContentAnalysisPanel';
import PreviewPanel from './components/PreviewPanel';
import { AnalysisData, Platform } from './types';

export default function NewMediaEditorPage() {
    // --- State ---
    const platforms: Platform[] = useMemo(() => [
        { id: 'xiaohongshu', name: '小红书', icon: FaBook, limit: '建议字数: 800-3000' },
        { id: 'wechat', name: '微信公众号', icon: FaWeixin, limit: '建议字数: 1000-5000' },
        { id: 'douyin', name: '抖音', icon: FaTiktok, limit: '建议字数: 500-2000' },
        { id: 'bilibili', name: 'B站', icon: FaPlayCircle, limit: '简介建议字数: 300-1000' },
        { id: 'weibo', name: '微博', icon: FaWeibo, limit: '字数上限: 2000' }
    ], []);

    const styles: string[] = useMemo(() => ['轻松幽默', '知识干货', '情感共鸣', '时尚潮流', '严谨专业', '故事叙述'], []);

    // State for user inputs and selections
    const [selectedPlatform, setSelectedPlatform] = useState<string>(platforms[0].id);
    const [selectedStyle, setSelectedStyle] = useState<string>(styles[0]);
    const [contentTopic, setContentTopic] = useState<string>('');
    const [contentInput, setContentInput] = useState<string>('');
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

    // State for loading, analysis, and UI feedback
    const [isLoading, setIsLoading] = useState<boolean>(false); // General loading (API calls)
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

    // --- API Configuration ---
    const { apiConfig } = useApiSettings();

    // --- Computed Values ---
    const charCount = useMemo(() => contentInput.length, [contentInput]);

    const charCountClass = useMemo(() => {
        if (charCount > 1500) return 'text-red-500';
        if (charCount > 1000) return 'text-yellow-500';
        return 'text-gray-500';
    }, [charCount]);

    const platformLimitText = useMemo(() => {
        const platform = platforms.find(p => p.id === selectedPlatform);
        return platform ? platform.limit : '建议字数: 500-2000';
    }, [selectedPlatform, platforms]);

    const previewTopics = useMemo(() => {
        if (selectedTopics.length > 0) return selectedTopics;
        return contentInput ? ['#话题1', '#话题2'] : [];
    }, [selectedTopics, contentInput]);

    // --- Event Handlers ---
    const handlePlatformSelect = useCallback((platformId: string) => {
        setSelectedPlatform(platformId);
    }, []);

    const handleStyleSelect = useCallback((style: string) => {
        setSelectedStyle(style);
    }, []);

    const clearInputs = useCallback(() => {
        setContentTopic('');
        setContentInput('');
        setAnalysisData(null);
    }, []);

    // --- API Call Functions ---
    const generateFallbackAnalysisData = useCallback((): AnalysisData => ({
        readability: { score: 75, comment: '结构清晰，易于阅读 (默认)' },
        engagement: { score: 75, comment: '内容有吸引力 (默认)' },
        keywords: { score: 75, comment: '关键词密度适中 (默认)' },
        suggestions: [
            { type: 'success', text: '内容已生成' },
            { type: 'warning', text: 'AI未返回详细分析数据' }
        ]
    }), []);

    const createPrompt = useCallback((isForPreview: boolean): string => {
        const platform = platforms.find(p => p.id === selectedPlatform);
        let prompt = isForPreview
            ? `根据主题"${contentTopic || '未指定主题'}"\n参考以下内容进行自然流畅的仿写：\n${contentInput}\n`
            : `请为${platform?.name || '通用'}平台创建一篇关于"${contentTopic || '未指定主题'}"的${selectedStyle}风格文案。`;

        if (!isForPreview && contentInput) {
            prompt += `\n基于以下内容优化：\n${contentInput}\n`;
        }
        if (!isForPreview && selectedTopics.length > 0) {
            prompt += `\n需要包含以下话题标签：${selectedTopics.join('，')}`;
        }

        prompt += `\n请严格按照以下JSON格式返回，不要包含任何额外的解释或标记：\n{\n  "title": "适合平台的标题 (抖音和微博可为空字符串)",\n  "content": "优化后的文案正文内容（纯文本，不包含markdown格式）",\n  "analysis": {\n    "readability": { "score": 数字 (0-100), "comment": "评价文字" },\n    "engagement": { "score": 数字 (0-100), "comment": "评价文字" },\n    "keywords": { "score": 数字 (0-100), "comment": "评价文字" },\n    "suggestions": [ { "type": "success" 或 "warning", "text": "建议内容" } ]\n  }\n}`;
        return prompt;
    }, [platforms, selectedPlatform, selectedStyle, selectedTopics, contentTopic, contentInput]);

    const callSiliconFlowAPI = useCallback(async (isForPreview: boolean = false): Promise<{ title: string; content: string; analysis: AnalysisData }> => {
        const prompt = createPrompt(isForPreview);
        const data = await generate({
            ...apiConfig,
            messages: [
                { role: "system", content: '你是一个专业的新媒体运营人员，能够为内容创作者快速生成适配不同平台的优质内容。' },
                { role: "user", content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 1,
        });

        try {
            const parsedContent = JSON.parse(data.content);
            if (!parsedContent || typeof parsedContent.content !== 'string' || typeof parsedContent.analysis !== 'object') {
                throw new Error('解析后的JSON结构不符合预期');
            }
            parsedContent.analysis = {
                readability: parsedContent.analysis.readability || { score: 70, comment: '未提供评分' },
                engagement: parsedContent.analysis.engagement || { score: 70, comment: '未提供评分' },
                keywords: parsedContent.analysis.keywords || { score: 70, comment: '未提供评分' },
                suggestions: parsedContent.analysis.suggestions || [{ type: 'warning', text: '未提供建议' }]
            };
            return {
                title: parsedContent.title || '',
                content: parsedContent.content,
                analysis: parsedContent.analysis
            };
        } catch (jsonError) {
            console.warn('JSON解析失败，将尝试使用原始文本:', jsonError);
            console.warn('原始AI响应:', data.content);
            return {
                title: contentTopic ? `关于${contentTopic}的${selectedStyle}文案` : `${selectedStyle}风格文案`,
                content: data.content,
                analysis: generateFallbackAnalysisData()
            };
        }
    }, [apiConfig, createPrompt, contentTopic, selectedStyle, generateFallbackAnalysisData]);

    const callQwenVLAPI = useCallback(async (uploadedImage: string): Promise<string> => {
        if (!uploadedImage) throw new Error('没有上传图片');
        const prompt = '请识别图片中的所有文本内容，并以纯文本格式返回。保持原始格式和段落结构。不要添加任何解释或额外内容，只需返回图片中的文字。';
        const data = await generate({
            ...apiConfig,
            model: 'qwen2.5-vl-72b',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: uploadedImage } }
                ]
            }],
            temperature: 0.1,
        });
        return data.content;
    }, [apiConfig]);

    const handleGenerateContent = useCallback(async (isForPreview: boolean = false) => {
        if (isLoading) return;
        setIsLoading(true);
        setAnalysisData(null);
        try {
            const result = await callSiliconFlowAPI(isForPreview);
            setContentTopic(prev => result.title || prev);
            setContentInput(result.content);
            setAnalysisData(result.analysis);
        } catch (error) {
            console.error('API Call Failed:', error);
            alert(`生成内容失败: ${error instanceof Error ? error.message : String(error)}. 请检查API配置或网络连接。`);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, callSiliconFlowAPI]);

    const handleAnalyzeImage = useCallback(async (uploadedImage: string) => {
        if (!uploadedImage || isLoading) return;
        if (!apiConfig.apiKey) {
            alert('请配置Qwen API密钥以使用图片分析功能');
            return;
        }
        setIsLoading(true);
        try {
            const extractedText = await callQwenVLAPI(uploadedImage);
            setContentInput(prev => `${prev}\n\n--- 图片识别内容 ---\n${extractedText}`.trim());
            alert('图片文字识别完成，已添加到文案内容区域。');
        } catch (error) {
            console.error('图片分析失败:', error);
            alert(`图片分析失败: ${error instanceof Error ? error.message : String(error)}. 请检查API配置或网络连接。`);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, apiConfig.apiKey, callQwenVLAPI]);

    // --- Render ---
    return (
        <div className="container mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <ContentCreationPanel
                        platforms={platforms}
                        selectedPlatform={selectedPlatform}
                        handlePlatformSelect={handlePlatformSelect}
                        contentTopic={contentTopic}
                        setContentTopic={setContentTopic}
                        contentInput={contentInput}
                        setContentInput={setContentInput}
                        charCount={charCount}
                        charCountClass={charCountClass}
                        platformLimitText={platformLimitText}
                        isLoading={isLoading}
                        selectedStyle={selectedStyle}
                        handleStyleSelect={handleStyleSelect}
                        selectedTopics={selectedTopics}
                        handleGenerateContent={handleGenerateContent}
                        handleAnalyzeImage={handleAnalyzeImage}
                        clearAllInputs={clearInputs}
                    />
                    <ContentAnalysisPanel
                        analysisData={analysisData}
                    />
                </div>
                <PreviewPanel
                    platforms={platforms}
                    selectedPlatform={selectedPlatform}
                    onPlatformSelect={handlePlatformSelect}
                    contentTopic={contentTopic}
                    contentInput={contentInput}
                    previewTopics={previewTopics}
                    isLoading={isLoading}
                />
            </div>

            {/* Feature Introduction (Static) */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">关于新媒体编辑</h2>
                <p className="text-gray-700 mb-4">新媒体编辑是一款专为新媒体运营人员、内容创作者设计的智能文案创作工具，能够帮助您快速生成适配不同平台的优质内容。</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><FaMagic /></div>
                            <h3 className="ml-3 font-medium">多平台适配</h3>
                        </div>
                        <p className="text-sm text-gray-600">自动适配抖音、小红书、微博、微信公众号和B站等多个平台的内容格式和风格特点。</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><FaFeatherAlt /></div>
                            <h3 className="ml-3 font-medium">风格多样化</h3>
                        </div>
                        <p className="text-sm text-gray-600">提供多种文案风格选择，包括轻松幽默、知识干货、情感共鸣、时尚潮流等。</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600"><FaFire /></div>
                            <h3 className="ml-3 font-medium">热点话题融入</h3>
                        </div>
                        <p className="text-sm text-gray-600">智能推荐当下热门话题，帮助您的内容获得更多曝光和更高流量。</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><FaChartLine /></div>
                            <h3 className="ml-3 font-medium">内容分析优化</h3>
                        </div>
                        <p className="text-sm text-gray-600">提供阅读体验、吸引力和关键词优化分析，帮助您创作出更具传播力的内容。</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><FaEye /></div>
                            <h3 className="ml-3 font-medium">实时预览</h3>
                        </div>
                        <p className="text-sm text-gray-600">直观展示不同平台上的内容呈现效果，让您在发布前就能了解最终效果。</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><FaBrain /></div>
                            <h3 className="ml-3 font-medium">AI智能辅助</h3>
                        </div>
                        <p className="text-sm text-gray-600">利用先进的AI技术，分析内容特点，提供改进建议，让您的创作更加高效。</p>
                    </div>
                </div>
            </div>
        </div>
    );
}