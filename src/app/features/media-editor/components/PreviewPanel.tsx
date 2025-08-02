'use client';

import React, { useState, useCallback } from 'react';
import {
    FaUser, FaRegHeart, FaRegComment, FaRegStar, FaRegThumbsUp, FaShareAlt, FaVideo, FaCommentDots, FaShare, FaPlayCircle, FaThumbsUp, FaSpinner, FaCopy
} from 'react-icons/fa';
import { Platform } from '../types';

interface PreviewPanelProps {
    platforms: Platform[];
    selectedPlatform: string;
    contentTopic: string;
    contentInput: string;
    previewTopics: string[];
    isLoading: boolean;
    onPlatformSelect: (platformId: string) => void;
}

export default function PreviewPanel({
    platforms,
    selectedPlatform,
    contentTopic,
    contentInput,
    previewTopics,
    isLoading,
    onPlatformSelect,
}: PreviewPanelProps) {
    const [activePreviewTab, setActivePreviewTab] = useState<string>(selectedPlatform);
    const [copyButtonText, setCopyButtonText] = useState<string>('复制文案');
    const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
    const [contentImage, setContentImage] = useState<string>('');

    const handleSelectTab = (platformId: string) => {
        setActivePreviewTab(platformId);
        onPlatformSelect(platformId);
    };

    const generateCoverImage = useCallback(async () => {
        if (isImageLoading) return;
        const prompt = encodeURIComponent(contentTopic.trim() || '抽象背景');
        const seed = Math.floor(Math.random() * 10000);
        setIsImageLoading(true);
        setContentImage('');
        try {
            const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?seed=${seed}&nologo=true&enhance=true`;
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

    const handleCopyContent = useCallback(() => {
        if (!contentInput) return;
        let contentToCopy = (contentTopic ? contentTopic + '\n\n' : '') + contentInput;
        if (previewTopics.length > 0) {
            contentToCopy += '\n\n' + previewTopics.join(' ');
        }
        navigator.clipboard.writeText(contentToCopy).then(() => {
            setCopyButtonText('已复制');
            setTimeout(() => {
                setCopyButtonText('复制文案');
            }, 1000);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制。');
        });
    }, [contentTopic, contentInput, previewTopics]);

    return (
        <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800">平台预览</h2>

                {/* Preview Tabs */}
                <div className="flex overflow-x-auto mb-4 pb-2 hide-on-print">
                    {platforms.map((platform) => (
                        <button
                            key={platform.id}
                            onClick={() => handleSelectTab(platform.id)}
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
                                <div className="flex flex-col items-center"><FaRegHeart className="text-2xl" /><span className="text-xs mt-1">8.2w</span></div>
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
                </div>
            </div>
        </div>
    );
}