'use client'; // Required for hooks and event handlers

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    FaBook, FaWeixin, FaTiktok, FaPlayCircle, FaWeibo, FaUser, FaHeart, FaComment, FaStar, FaThumbsUp,
    FaShareAlt, FaVideo, FaCommentDots, FaShare, FaMagic, FaCopy, FaEraser, FaCog, FaSave, FaSpinner,
    FaTimes, FaCloudUploadAlt, FaCheckCircle, FaExclamationCircle, FaChartBar, FaFeatherAlt, FaFire,
    FaChartLine, FaEye, FaBrain, FaCheck
} from 'react-icons/fa'; // Using Font Awesome 6 via react-icons/fa6 or fa
import { FaRegHeart, FaRegComment, FaRegStar, FaRegThumbsUp } from 'react-icons/fa'; // Regular icons

// Define a type for the analysis data structure
interface AnalysisScore {
    score: number;
    comment: string;
}
interface Suggestion {
    type: 'success' | 'warning';
    text: string;
}
interface AnalysisData {
    readability: AnalysisScore;
    engagement: AnalysisScore;
    keywords: AnalysisScore;
    suggestions: Suggestion[];
}

// Define a type for Platform data
interface Platform {
    id: string;
    name: string;
    icon: React.ElementType; // Use React.ElementType for component types
    limit: string;
}

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
    const [contentImage, setContentImage] = useState<string>(''); // URL for generated cover image
    const [availableTopics, setAvailableTopics] = useState<string[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [customTopicInput, setCustomTopicInput] = useState<string>('');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null); // Data URL for uploaded image
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for loading, analysis, and UI feedback
    const [isLoading, setIsLoading] = useState<boolean>(false); // General loading (API calls)
    const [isImageLoading, setIsImageLoading] = useState<boolean>(false); // Cover image generation loading
    const [isImageAnalyzing, setIsImageAnalyzing] = useState<boolean>(false); // Uploaded image analysis loading
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [activePreviewTab, setActivePreviewTab] = useState<string>(platforms[0].id);
    const [copyButtonText, setCopyButtonText] = useState<string>('复制文案');
    const [copyButtonIcon, setCopyButtonIcon] = useState<React.ElementType>(FaCopy);

    // --- API Configuration (Hardcoded for now - move to environment variables) ---
    const apiConfig = useMemo(() => ({
        apiUrl: process.env.NEXT_PUBLIC_TEXT_API_URL || 'https://asnlee-proxy.hf.space/deepseek/v1/chat/completions', // Example using env var
        apiKey: process.env.NEXT_PUBLIC_TEXT_API_KEY || 'asnlee', // Example using env var
        model: process.env.NEXT_PUBLIC_TEXT_API_MODEL || 'DeepSeek-v3-Search',
        temperature: 1,
        customPrompt: '你是一个专业的新媒体运营人员，能够为内容创作者快速生成适配不同平台的优质内容。',
        qwenApiUrl: process.env.NEXT_PUBLIC_QWEN_API_URL || 'https://warm-squirrel-74.deno.dev/v1/chat/completions',
        qwenApiKey: process.env.NEXT_PUBLIC_QWEN_API_KEY || 'xy666',
        qwenModel: 'Qwen2.5-VL-72B-Instruct' // This seems fixed in the original code
    }), []);

    // --- Effects ---
    // Load initial topics from localStorage on mount
    useEffect(() => {
        const storedTopicsRaw = localStorage.getItem('socialMediaTopics');
        const storedTopics = storedTopicsRaw ? JSON.parse(storedTopicsRaw) : [];
        const initialTopics = storedTopics.length > 0 ? storedTopics : ['#夏日穿搭', '#生活小确幸', '#好物推荐', '#减肥日记', '#学习方法', '#职场攻略', '#旅行vlog', '#健康饮食'];
        setAvailableTopics(initialTopics);
    }, []); // Empty dependency array ensures this runs only once on mount

    // --- Computed Values (Derived State) ---
    const charCount = useMemo(() => contentInput.length, [contentInput]);

    const charCountClass = useMemo(() => {
        if (charCount > 1500) return 'text-red-500'; // danger
        if (charCount > 1000) return 'text-yellow-500'; // warning
        return 'text-gray-500'; // default
    }, [charCount]);

    const platformLimitText = useMemo(() => {
        const platform = platforms.find(p => p.id === selectedPlatform);
        return platform ? platform.limit : '建议字数: 500-2000';
    }, [selectedPlatform, platforms]);

    const isAnalysisAvailable = useMemo(() => analysisData !== null, [analysisData]);

    const previewTopics = useMemo(() => {
        if (selectedTopics.length > 0) return selectedTopics;
        // Provide default topics if none are selected and content is generated
        return contentInput ? ['#话题1', '#话题2'] : [];
    }, [selectedTopics, contentInput]);

    // --- Event Handlers and Logic Functions (useCallback for functions passed as props or in dependencies) ---

    const handlePlatformSelect = useCallback((platformId: string) => {
        setSelectedPlatform(platformId);
        setActivePreviewTab(platformId);
    }, []);

    const handleStyleSelect = useCallback((style: string) => {
        setSelectedStyle(style);
    }, []);

    const toggleTopic = useCallback((topic: string) => {
        setSelectedTopics(prev =>
            prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
        );
    }, []);

    const removeTopic = useCallback((indexToRemove: number) => {
        setAvailableTopics(prev => {
            const updatedTopics = prev.filter((_, index) => index !== indexToRemove);
            localStorage.setItem('socialMediaTopics', JSON.stringify(updatedTopics));
            return updatedTopics;
        });
        // Also remove from selected if it was selected
        setSelectedTopics(prev => prev.filter(topic => topic !== availableTopics[indexToRemove]));
    }, [availableTopics]); // Dependency needed

    const addCustomTopic = useCallback(() => {
        const topicText = customTopicInput.trim();
        if (topicText) {
            const formattedTopic = topicText.startsWith('#') ? topicText : '#' + topicText;
            if (!availableTopics.includes(formattedTopic)) {
                setAvailableTopics(prev => {
                    const updated = [...prev, formattedTopic];
                    localStorage.setItem('socialMediaTopics', JSON.stringify(updated));
                    return updated;
                });
            }
            if (!selectedTopics.includes(formattedTopic)) {
                setSelectedTopics(prev => [...prev, formattedTopic]);
            }
            setCustomTopicInput('');
        }
    }, [customTopicInput, availableTopics, selectedTopics]);

    const handleCustomTopicKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission if wrapped in form
            addCustomTopic();
        }
    }, [addCustomTopic]);

    const clearInputs = useCallback(() => {
        setContentTopic('');
        setContentInput('');
        setContentImage('');
        setSelectedTopics([]);
        setAnalysisData(null);
        setUploadedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Clear file input
        }
    }, []);

    const triggerFileUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            alert('请上传图片文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setUploadedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    }, []);

    const removeUploadedImage = useCallback(() => {
        setUploadedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    // --- API Call Functions ---

    const generateFallbackAnalysisData = useCallback((): AnalysisData => {
        const score = 75; // Default score
        return {
            readability: { score, comment: '结构清晰，易于阅读 (默认)' },
            engagement: { score, comment: '内容有吸引力 (默认)' },
            keywords: { score, comment: '关键词密度适中 (默认)' },
            suggestions: [
                { type: 'success', text: '内容已生成' },
                { type: 'warning', text: 'AI未返回详细分析数据' }
            ]
        };
    }, []);

    const createPrompt = useCallback((isForPreview: boolean): string => {
        const platform = platforms.find(p => p.id === selectedPlatform);
        const style = selectedStyle;
        const topics = selectedTopics;
        const topic = contentTopic;
        const text = contentInput;

        let prompt = '';

        if (isForPreview) {
             prompt += `根据主题"${topic || '未指定主题'}"\n参考以下内容进行自然流畅的仿写：\n${text}\n`;
        } else {
            prompt += `请为${platform?.name || '通用'}平台创建一篇关于"${topic || '未指定主题'}"的${style}风格文案。`;
            if (text) {
                prompt += `\n基于以下内容优化：\n${text}\n`;
            }
            if (topics.length > 0) {
                prompt += `\n需要包含以下话题标签：${topics.join('，')}`;
            }
        }

        prompt += `
请严格按照以下JSON格式返回，不要包含任何额外的解释或标记：
{
  "title": "适合平台的标题 (抖音和微博可为空字符串)",
  "content": "优化后的文案正文内容",
  "analysis": {
    "readability": { "score": 数字 (0-100), "comment": "评价文字" },
    "engagement": { "score": 数字 (0-100), "comment": "评价文字" },
    "keywords": { "score": 数字 (0-100), "comment": "评价文字" },
    "suggestions": [ { "type": "success" 或 "warning", "text": "建议内容" } ]
  }
}`;
        return prompt;
    }, [platforms, selectedPlatform, selectedStyle, selectedTopics, contentTopic, contentInput]);

    const callSiliconFlowAPI = useCallback(async (isForPreview: boolean = false): Promise<{ title: string; content: string; analysis: AnalysisData }> => {
        if (!apiConfig.apiKey || !apiConfig.apiUrl) {
            throw new Error("API Key 或 API URL 未配置");
        }

        const prompt = createPrompt(isForPreview);

        const response = await fetch(apiConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [
                    { role: "system", content: apiConfig.customPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: apiConfig.temperature,
                stream: false,
                // response_format: { type: "json_object" } // Enable if API supports
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("API Error Response:", errorBody);
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.choices?.[0]?.message?.content) {
            throw new Error('API响应格式不正确，缺少必要内容');
        }

        const aiMessage = data.choices[0].message.content;
        let parsedContent;

        try {
            const responseContent = aiMessage.replace(/^```json\s*|```$/g, '').trim();
            parsedContent = JSON.parse(responseContent);

            if (!parsedContent || typeof parsedContent.content !== 'string' || typeof parsedContent.analysis !== 'object') {
                throw new Error('解析后的JSON结构不符合预期');
            }
            // Ensure analysis sub-fields exist (provide defaults if missing)
            parsedContent.analysis = {
                readability: parsedContent.analysis.readability || { score: 70, comment: '未提供评分' },
                engagement: parsedContent.analysis.engagement || { score: 70, comment: '未提供评分' },
                keywords: parsedContent.analysis.keywords || { score: 70, comment: '未提供评分' },
                suggestions: parsedContent.analysis.suggestions || [{ type: 'warning', text: '未提供建议' }]
            };

        } catch (jsonError) {
            console.warn('JSON解析失败，将尝试使用原始文本:', jsonError);
            console.warn('原始AI响应:', aiMessage);
            parsedContent = {
                title: contentTopic ? `关于${contentTopic}的${selectedStyle}文案` : `${selectedStyle}风格文案`,
                content: aiMessage,
                analysis: generateFallbackAnalysisData()
            };
        }

        return {
            title: parsedContent.title || '',
            content: parsedContent.content,
            analysis: parsedContent.analysis
        };
    }, [apiConfig, createPrompt, contentTopic, selectedStyle, generateFallbackAnalysisData]);

    const callQwenVLAPI = useCallback(async (): Promise<string> => {
        if (!apiConfig.qwenApiKey || !apiConfig.qwenApiUrl) {
            throw new Error('Qwen API Key 或 URL 未配置');
        }
        if (!uploadedImage) {
            throw new Error('没有上传图片');
        }

        const prompt = '请识别图片中的所有文本内容，并以纯文本格式返回。保持原始格式和段落结构。不要添加任何解释或额外内容，只需返回图片中的文字。';

        const response = await fetch(apiConfig.qwenApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.qwenApiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.qwenModel,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: uploadedImage } }
                        ]
                    }
                ],
                temperature: apiConfig.temperature // Maybe use lower temp for OCR?
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Qwen API Error:', errorBody);
            throw new Error(`Qwen API请求失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Qwen API响应格式不正确，缺少必要内容');
        }

        return data.choices[0].message.content;
    }, [apiConfig, uploadedImage]);


    const generateCoverImage = useCallback(async () => {
        if (isImageLoading) return;
        const prompt = encodeURIComponent(contentTopic.trim() || '抽象背景'); // Use topic or a default
        const seed = Math.floor(Math.random() * 10000); // Wider range for seed

        setIsImageLoading(true);
        setContentImage(''); // Clear previous image

        try {
            // Using Pollinations AI as in the original example
            const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?seed=${seed}&nologo=true&enhance=true`;

            // Preload image to check if it loads successfully
            const img = new Image();
            img.onload = () => {
                setContentImage(imageUrl);
                setIsImageLoading(false);
            };
            img.onerror = () => {
                console.error("Failed to load generated image from Pollinations.");
                alert("封面图生成失败，请稍后重试。");
                setIsImageLoading(false);
            };
            img.src = imageUrl;

        } catch (error) {
            console.error('Error generating cover image:', error);
            alert(`封面图生成失败: ${error instanceof Error ? error.message : String(error)}`);
            setIsImageLoading(false);
        }
    }, [contentTopic, isImageLoading]);


    const handleGenerateContent = useCallback(async (isForPreview: boolean = false) => {
        if (isLoading) return;
        setIsLoading(true);
        setAnalysisData(null); // Clear previous analysis

        try {
            const result = await callSiliconFlowAPI(isForPreview);
            setContentTopic(prev => result.title || prev); // Update topic only if title is returned
            setContentInput(result.content);
            setAnalysisData(result.analysis);

            // Generate cover image based on the (potentially updated) topic
            await generateCoverImage();

        } catch (error) {
            console.error('API Call Failed:', error);
            alert(`生成内容失败: ${error instanceof Error ? error.message : String(error)}. 请检查API配置或网络连接。`);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, callSiliconFlowAPI, generateCoverImage]); // Add generateCoverImage dependency

    const handleAnalyzeImage = useCallback(async () => {
        if (!uploadedImage || isLoading || isImageAnalyzing) return;

        if (!apiConfig.qwenApiKey) {
            alert('请配置Qwen API密钥以使用图片分析功能');
            // Consider adding a way to prompt for config if needed, or disable button
            return;
        }

        setIsLoading(true); // Use general loading indicator
        setIsImageAnalyzing(true);

        try {
            const extractedText = await callQwenVLAPI();
            setContentInput(prev => `${prev}\n\n--- 图片识别内容 ---\n${extractedText}`.trim()); // Append or replace as needed
            alert('图片文字识别完成，已添加到文案内容区域。');
        } catch (error) {
            console.error('图片分析失败:', error);
            alert(`图片分析失败: ${error instanceof Error ? error.message : String(error)}. 请检查API配置或网络连接。`);
        } finally {
            setIsLoading(false);
            setIsImageAnalyzing(false);
        }
    }, [uploadedImage, isLoading, isImageAnalyzing, apiConfig.qwenApiKey, callQwenVLAPI]);

    const handleCopyContent = useCallback(() => {
        const platform = activePreviewTab;
        let contentToCopy = '';
        const title = contentTopic || 'AI生成内容'; // Use state topic
        const content = contentInput;

        if (!content) return;

        // Basic logic based on original, adjust as needed
        switch (platform) {
            case 'xiaohongshu':
            case 'wechat':
            case 'bilibili':
                contentToCopy = (title ? title + '\n\n' : '') + content;
                break;
            default: // douyin, weibo might have shorter limits or different formats
                contentToCopy = content; // Simple copy for now
        }

        // Add selected topics as hashtags
        if (selectedTopics.length > 0) {
            contentToCopy += '\n\n' + selectedTopics.join(' ');
        }


        navigator.clipboard.writeText(contentToCopy).then(() => {
            setCopyButtonText('已复制');
            setCopyButtonIcon(() => FaCheck); // Update icon component
            setTimeout(() => {
                setCopyButtonText('复制文案');
                setCopyButtonIcon(() => FaCopy); // Reset icon component
            }, 2000);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制。');
        });
    }, [activePreviewTab, contentTopic, contentInput, selectedTopics]);


    // --- Render ---
    return (
        <div className="container mx-auto">
            {/* Header */}
            {/* <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">新媒体编辑</h1>
                <p className="text-xl text-gray-600">全渠道社交媒体文案创建工具</p>
            </header> */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Content Creation & Analysis */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Content Creation Panel */}
                    <div className="bg-white rounded-lg shadow-md p-6 relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white bg-opacity-75 flex justify-center items-center z-10 rounded-lg">
                                <span className="text-blue-600 font-bold flex items-center">
                                    <FaSpinner className="animate-spin mr-2" />
                                    {isImageAnalyzing ? '图片分析中...' : (isImageLoading ? '封面生成中...' : 'AI处理中...')}
                                </span>
                            </div>
                        )}

                        <h2 className="text-xl font-bold mb-4 text-gray-800">内容创作</h2>

                        {/* Platform Selection */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">选择发布平台</label>
                            <div className="flex flex-wrap gap-2">
                                {platforms.map((platform) => (
                                    <button
                                        key={platform.id}
                                        onClick={() => handlePlatformSelect(platform.id)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 flex items-center ${selectedPlatform === platform.id
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
                                            }`}
                                    >
                                        <platform.icon className="mr-1" /> {platform.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Topic Input */}
                        <div className="mb-6">
                            <label htmlFor="contentTopic" className="block text-gray-700 font-medium mb-2">文案主题</label>
                            <input
                                type="text"
                                id="contentTopic"
                                value={contentTopic}
                                onChange={(e) => setContentTopic(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="例如：夏季穿搭、健身饮食、旅游攻略..."
                            />
                        </div>

                        {/* Content Input */}
                        <div className="mb-4">
                            <label htmlFor="contentInput" className="block text-gray-700 font-medium mb-2">文案内容</label>
                            <textarea
                                id="contentInput"
                                value={contentInput}
                                onChange={(e) => setContentInput(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-64 resize-none"
                                placeholder="输入你的文案内容，AI将帮你优化或仿写..."
                            />
                            <div className="flex justify-between mt-2 text-sm">
                                <span className={`transition-colors duration-300 ${charCountClass}`}>{charCount} 字符</span>
                                <span className="text-gray-400">{platformLimitText}</span>
                            </div>
                        </div>

                        {/* Image Upload Area */}
                        <div className="mb-6 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                            <input
                                type="file"
                                id="image-upload"
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                            />
                            {!uploadedImage ? (
                                <div onClick={triggerFileUpload} className="cursor-pointer">
                                    <FaCloudUploadAlt className="text-4xl text-gray-400 mb-3 mx-auto" />
                                    <p className="text-gray-600 mb-1">点击或拖拽上传图片</p>
                                    <p className="text-xs text-gray-500">支持JPG、PNG格式，可用于AI分析提取文字</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <img src={uploadedImage} className="max-h-64 mx-auto rounded-lg shadow-sm" alt="已上传图片" />
                                    <div className="absolute top-2 right-2 flex space-x-2">
                                        <button
                                            onClick={handleAnalyzeImage}
                                            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="分析图片提取文字"
                                            disabled={isLoading || isImageAnalyzing}
                                        >
                                            {isImageAnalyzing ? <FaSpinner className="animate-spin" /> : <FaMagic />}
                                        </button>
                                        <button
                                            onClick={removeUploadedImage}
                                            className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                                            title="移除图片"
                                            disabled={isLoading}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* Style Selection */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">文案风格</label>
                            <div className="flex flex-wrap gap-2">
                                {styles.map((style) => (
                                    <button
                                        key={style}
                                        onClick={() => handleStyleSelect(style)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${selectedStyle === style
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-purple-100'
                                            }`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hot Topics */}
                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">推荐话题（多选）</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {availableTopics.map((topic, index) => (
                                    <span
                                        key={topic + index} // Ensure unique key if topics can duplicate temporarily
                                        onClick={() => toggleTopic(topic)}
                                        className={`topic-tag px-3 py-1 rounded-full text-sm cursor-pointer transition-all duration-300 flex items-center ${selectedTopics.includes(topic)
                                                ? 'bg-blue-600 text-white scale-105'
                                                : 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
                                            }`}
                                    >
                                        {topic}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeTopic(index); }}
                                            className="ml-1.5 text-xs text-gray-400 hover:text-red-400"
                                            title={`移除话题 "${topic}"`}
                                        >
                                            <FaTimes />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex">
                                <input
                                    type="text"
                                    value={customTopicInput}
                                    onChange={(e) => setCustomTopicInput(e.target.value)}
                                    onKeyDown={handleCustomTopicKeyDown}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="添加自定义话题... (回车添加)"
                                />
                                <button onClick={addCustomTopic} className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600">添加</button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => handleGenerateContent(false)}
                                disabled={isLoading}
                                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading && !isImageAnalyzing ? <FaSpinner className="animate-spin mr-2" /> : <FaMagic className="mr-2" />}
                                {isLoading && !isImageAnalyzing ? '生成中...' : 'AI生成/优化'}
                            </button>
                             <button
                                onClick={() => handleGenerateContent(true)} // Pass true for preview/imitation
                                disabled={isLoading || !contentInput} // Disable if no input for imitation
                                className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <FaSpinner className="animate-spin mr-2" /> : <FaCopy className="mr-2" />}
                                {isLoading ? '仿写中...' : 'AI仿写'}
                            </button>
                            <button
                                onClick={clearInputs}
                                disabled={isLoading}
                                className="px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center disabled:opacity-50"
                            >
                                <FaEraser className="mr-2" /> 清空
                            </button>
                            {/* Removed API Config Button */}
                        </div>
                    </div>

                    {/* Content Analysis Panel */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">内容分析与优化</h2>
                        {isAnalysisAvailable && analysisData ? (
                            <div id="analysis-container">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    {/* Readability */}
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <h3 className="font-medium text-blue-700 mb-2">阅读体验</h3>
                                        <div className="flex items-center">
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${analysisData.readability.score}%` }}></div>
                                            </div>
                                            <span className="text-sm">{Math.round(analysisData.readability.score)}%</span>
                                        </div>
                                        <p className="text-sm mt-2 text-gray-600">{analysisData.readability.comment}</p>
                                    </div>
                                    {/* Engagement */}
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <h3 className="font-medium text-green-700 mb-2">吸引力</h3>
                                        <div className="flex items-center">
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${analysisData.engagement.score}%` }}></div>
                                            </div>
                                            <span className="text-sm">{Math.round(analysisData.engagement.score)}%</span>
                                        </div>
                                        <p className="text-sm mt-2 text-gray-600">{analysisData.engagement.comment}</p>
                                    </div>
                                    {/* Keywords */}
                                    <div className="bg-yellow-50 p-4 rounded-lg">
                                        <h3 className="font-medium text-yellow-700 mb-2">关键词优化</h3>
                                        <div className="flex items-center">
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                                <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${analysisData.keywords.score}%` }}></div>
                                            </div>
                                            <span className="text-sm">{Math.round(analysisData.keywords.score)}%</span>
                                        </div>
                                        <p className="text-sm mt-2 text-gray-600">{analysisData.keywords.comment}</p>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-4">
                                    <h3 className="font-medium text-gray-800 mb-3">改进建议</h3>
                                    <ul className="space-y-2 text-sm text-gray-700">
                                        {analysisData.suggestions.map((suggestion, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className={`mr-2 ${suggestion.type === 'success' ? 'text-green-500' : 'text-yellow-500'}`}>
                                                    {suggestion.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
                                                </span>
                                                <span>{suggestion.text}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div id="analysis-placeholder" className="flex flex-col items-center justify-center py-10 text-gray-400">
                                <FaChartBar className="text-5xl mb-4" />
                                <p>点击&quot;AI生成/优化&quot;或&quot;AI仿写&quot;按钮获取内容分析</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Preview */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">平台预览</h2>

                        {/* Preview Tabs */}
                        <div className="flex overflow-x-auto mb-4 pb-2 hide-on-print">
                            {platforms.map((platform) => (
                                <button
                                    key={platform.id}
                                    onClick={() => setActivePreviewTab(platform.id)}
                                    className={`whitespace-nowrap px-3 py-1 mr-2 rounded-md font-medium text-sm transition-colors duration-200 ${activePreviewTab === platform.id
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {platform.name}
                                </button>
                            ))}
                        </div>

                        {/* Previews Container */}
                        <div>
                            {/* Xiaohongshu Preview */}
                            {activePreviewTab === 'xiaohongshu' && (
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start mb-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500"><FaUser /></div>
                                        <div className="ml-2">
                                            <div className="font-medium">用户名称</div>
                                            <div className="text-gray-500 text-xs">刚刚</div>
                                        </div>
                                        <button className="ml-auto px-2 py-1 bg-red-500 text-white text-xs rounded-full">关注</button>
                                    </div>
                                    <div className="text-lg font-bold mb-2">{contentTopic || 'AI生成的标题将显示在这里...'}</div>
                                    <div className="mb-4">
                                        <p className="text-sm whitespace-pre-line">{contentInput || 'AI生成的文案将显示在这里...'}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {previewTopics.map((topic, index) => (
                                            <span key={index} className="text-xs text-red-400">{topic}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center mt-2 text-gray-500 text-sm">
                                        <span className="mr-4 flex items-center"><FaRegHeart className="mr-1" /> 8.2k</span>
                                        <span className="mr-4 flex items-center"><FaRegComment className="mr-1" /> 328</span>
                                        <span className="flex items-center"><FaRegStar className="mr-1" /> 收藏</span>
                                    </div>
                                </div>
                            )}

                            {/* WeChat Preview */}
                            {activePreviewTab === 'wechat' && (
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="font-bold text-xl mb-2 text-center">{contentTopic || 'AI生成的标题将显示在这里...'}</div>
                                    <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500"><FaUser /></div>
                                            <span className="ml-2 text-sm text-gray-600">公众号名称</span>
                                        </div>
                                        <span className="text-sm text-gray-500">{new Date().toLocaleDateString()}</span>
                                    </div>
                                    <div>
                                        <p className="text-base whitespace-pre-line">{contentInput || 'AI生成的文案将显示在这里...'}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-4 text-gray-500 text-sm border-t border-gray-200 pt-2">
                                        <span className="flex items-center"><FaRegThumbsUp className="mr-1" /> 赞</span>
                                        <span className="flex items-center"><FaRegStar className="mr-1" /> 在看</span>
                                        <span className="flex items-center"><FaShareAlt className="mr-1" /> 分享</span>
                                    </div>
                                </div>
                            )}

                            {/* Douyin Preview */}
                            {activePreviewTab === 'douyin' && (
                                <div className="bg-black rounded-lg p-4 relative min-h-[300px] text-white">
                                    <div className="flex items-start mb-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700"><FaUser /></div>
                                        <div className="ml-2">
                                            <div className="font-medium">用户名称</div>
                                            <div className="text-gray-400 text-xs">刚刚</div>
                                        </div>
                                        <button className="ml-auto px-2 py-1 bg-red-500 text-white text-xs rounded-full">关注</button>
                                    </div>
                                    <div className="mb-3">
                                        {/* Douyin often has title/topic mixed in */}
                                        <p className="text-sm whitespace-pre-line">{contentTopic ? `${contentTopic}\n\n` : ''}{contentInput || 'AI生成的文案将显示在这里...'}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {previewTopics.map((topic, index) => (
                                            <span key={index} className="text-xs text-blue-400">{topic}</span>
                                        ))}
                                    </div>
                                    <div className="absolute right-4 bottom-20 flex flex-col items-center space-y-4">
                                        <div className="flex flex-col items-center"><FaHeart className="text-2xl" /><span className="text-xs mt-1">8.2w</span></div>
                                        <div className="flex flex-col items-center"><FaCommentDots className="text-2xl" /><span className="text-xs mt-1">2.5w</span></div>
                                        <div className="flex flex-col items-center"><FaShare className="text-2xl" /><span className="text-xs mt-1">1.3w</span></div>
                                    </div>
                                </div>
                            )}

                            {/* Bilibili Preview */}
                            {activePreviewTab === 'bilibili' && (
                                <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[300px]">
                                    <div className="bg-gray-200 h-32 rounded-lg flex items-center justify-center mb-2 text-gray-400"><FaVideo className="text-3xl" /></div>
                                    <div className="font-bold text-lg mb-2">{contentTopic || 'AI生成的标题将显示在这里...'}</div>
                                    <div className="flex items-start mb-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500"><FaUser /></div>
                                        <div className="ml-2">
                                            <div className="text-sm">UP主名称</div>
                                            <div className="text-gray-500 text-xs">刚刚</div>
                                        </div>
                                        <button className="ml-auto px-2 py-1 bg-pink-500 text-white text-xs rounded-full">关注</button>
                                    </div>
                                    <div className="text-sm text-gray-700 mb-2">
                                        <p className="whitespace-pre-line">{contentInput || 'AI生成的简介将显示在这里...'}</p>
                                    </div>
                                    <div className="flex items-center text-gray-500 text-sm">
                                        <span className="mr-3 flex items-center"><FaPlayCircle className="mr-1" /> 5.2万</span>
                                        <span className="mr-3 flex items-center"><FaCommentDots className="mr-1" /> 1.3千</span>
                                        <span className="flex items-center"><FaThumbsUp className="mr-1" /> 3.8万</span>
                                    </div>
                                </div>
                            )}

                            {/* Weibo Preview */}
                            {activePreviewTab === 'weibo' && (
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start mb-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500"><FaUser /></div>
                                        <div className="ml-2">
                                            <div className="font-medium">用户名称 <span className="text-yellow-500 text-xs">V</span></div>
                                            <div className="text-gray-500 text-xs">刚刚</div>
                                        </div>
                                        <button className="ml-auto px-2 py-1 bg-red-500 text-white text-xs rounded-full">关注</button>
                                    </div>
                                    <div className="mb-3">
                                        {/* Weibo often has title/topic mixed in */}
                                        <p className="text-sm whitespace-pre-line">{contentTopic ? `${contentTopic}\n\n` : ''}{contentInput || 'AI生成的文案将显示在这里...'}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {previewTopics.map((topic, index) => (
                                            <span key={index} className="text-xs text-orange-500">{topic.endsWith('#') ? topic : topic + '#'}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between text-gray-500 text-sm border-t border-gray-100 pt-2">
                                        <span className="flex items-center"><FaShareAlt className="mr-1" /> 转发 2.3k</span>
                                        <span className="flex items-center"><FaRegComment className="mr-1" /> 评论 1.5k</span>
                                        <span className="flex items-center"><FaRegHeart className="mr-1" /> 点赞 8.2k</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Preview Image (Generated Cover) */}
                        <div className="relative mt-4 cursor-pointer" style={{ minHeight: '150px' /* Adjusted height */ }}>
                            {isImageLoading ? (
                                <div className="absolute inset-0 bg-gray-200 w-full h-full rounded-lg flex items-center justify-center text-gray-500">
                                    <FaSpinner className="animate-spin mr-2" /> 封面生成中...
                                </div>
                            ) : contentImage ? (
                                <img
                                    src={contentImage}
                                    alt={contentTopic || '生成的封面图'}
                                    className="w-full rounded-lg object-cover h-full" // Ensure image covers the area
                                    onClick={generateCoverImage} // Re-generate on click
                                    title="点击重新生成封面图"
                                />
                            ) : (
                                <div
                                    className="absolute inset-0 bg-gray-200 w-full h-full rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-300 transition-colors"
                                    onClick={generateCoverImage}
                                >
                                    <span>点击根据主题生成封面图</span>
                                </div>
                            )}
                        </div>


                        {/* Action Buttons */}
                        <div className="mt-4 hide-on-print">
                            <button
                                onClick={handleCopyContent}
                                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 mb-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!contentInput || isLoading}
                            >
                                <FaCopy className="mr-2" /> {copyButtonText}
                            </button>
                            {/* Removed Save Draft Button */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Introduction (Static) */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">关于新媒体编辑</h2>
                <p className="text-gray-700 mb-4">新媒体编辑是一款专为新媒体运营人员、内容创作者设计的智能文案创作工具，能够帮助您快速生成适配不同平台的优质内容。</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {/* Feature Cards - Replaced icons */}
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

            {/* Footer (Static) */}
            {/* <footer className="mt-8 text-center text-gray-500 text-sm py-4">
                <p>Copyright by AsnLee</p>
            </footer> */}
        </div>
    );
}