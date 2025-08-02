'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    FaMagic, FaCopy, FaEraser, FaSpinner, FaTimes, FaCloudUploadAlt
} from 'react-icons/fa';
import { Platform } from '../types';

interface ContentCreationPanelProps {
    platforms: Platform[];
    selectedPlatform: string;
    handlePlatformSelect: (platformId: string) => void;
    contentTopic: string;
    setContentTopic: (topic: string) => void;
    contentInput: string;
    setContentInput: (input: string) => void;
    charCount: number;
    charCountClass: string;
    platformLimitText: string;
    isLoading: boolean;
    selectedStyle: string;
    handleStyleSelect: (style: string) => void;
    selectedTopics: string[];
    handleGenerateContent: (isForPreview: boolean) => void;
    handleAnalyzeImage: (image: string) => Promise<void>;
    clearAllInputs: () => void;
}

export default function ContentCreationPanel({
    platforms,
    selectedPlatform,
    handlePlatformSelect,
    contentTopic,
    setContentTopic,
    contentInput,
    setContentInput,
    charCount,
    charCountClass,
    platformLimitText,
    isLoading,
    selectedStyle,
    handleStyleSelect,
    selectedTopics,
    handleGenerateContent,
    handleAnalyzeImage,
    clearAllInputs,
}: ContentCreationPanelProps) {
    const styles: string[] = useMemo(() => ['轻松幽默', '知识干货', '情感共鸣', '时尚潮流', '严谨专业', '故事叙述'], []);

    const [availableTopics, setAvailableTopics] = useState<string[]>([]);
    const [currentSelectedTopics, setCurrentSelectedTopics] = useState<string[]>([]);
    const [customTopicInput, setCustomTopicInput] = useState<string>('');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isImageAnalyzing, setIsImageAnalyzing] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const storedTopicsRaw = localStorage.getItem('socialMediaTopics');
        const storedTopics = storedTopicsRaw ? JSON.parse(storedTopicsRaw) : [];
        const initialTopics = storedTopics.length > 0 ? storedTopics : ['#夏日穿搭', '#生活小确幸', '#好物推荐', '#减肥日记', '#学习方法', '#职场攻略', '#旅行vlog', '#健康饮食'];
        setAvailableTopics(initialTopics);
    }, []);

    const toggleTopic = useCallback((topic: string) => {
        setCurrentSelectedTopics(prev =>
            prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
        );
    }, []);

    const removeTopic = useCallback((indexToRemove: number) => {
        setAvailableTopics(prev => {
            const updatedTopics = prev.filter((_, index) => index !== indexToRemove);
            localStorage.setItem('socialMediaTopics', JSON.stringify(updatedTopics));
            return updatedTopics;
        });
        setCurrentSelectedTopics(prev => prev.filter(topic => topic !== availableTopics[indexToRemove]));
    }, [availableTopics]);

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
            if (!currentSelectedTopics.includes(formattedTopic)) {
                setCurrentSelectedTopics(prev => [...prev, formattedTopic]);
            }
            setCustomTopicInput('');
        }
    }, [customTopicInput, availableTopics, currentSelectedTopics]);

    const handleCustomTopicKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addCustomTopic();
        }
    }, [addCustomTopic]);

    const triggerFileUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.match('image.*')) {
            alert('请上传图片文件');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => setUploadedImage(e.target?.result as string);
        reader.readAsDataURL(file);
    }, []);

    const removeUploadedImage = useCallback(() => {
        setUploadedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const onAnalyzeImage = async () => {
        if (!uploadedImage) return;
        setIsImageAnalyzing(true);
        await handleAnalyzeImage(uploadedImage);
        setIsImageAnalyzing(false);
    };
    
    const onClearInputs = () => {
        clearAllInputs();
        setCurrentSelectedTopics([]);
        setUploadedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 relative">
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
                                onClick={onAnalyzeImage}
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
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
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
                    {isLoading && !isImageAnalyzing ? '生成中...' : 'AI生成'}
                </button>
                <button
                    onClick={() => handleGenerateContent(true)} // Pass true for preview/imitation
                    disabled={isLoading || !contentInput} // Disable if no input for imitation
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <FaSpinner className="animate-spin mr-2" /> : <FaCopy className="mr-2" />}
                    {isLoading ? '仿写中...' : 'AI仿写'}
                </button>
                <button
                    onClick={onClearInputs}
                    disabled={isLoading}
                    className="px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center disabled:opacity-50"
                >
                    <FaEraser className="mr-2" /> 清空
                </button>
            </div>
        </div>
    );
}