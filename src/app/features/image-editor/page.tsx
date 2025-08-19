"use client";

import React, { useState, useCallback } from 'react';
import { FaSpinner, FaLanguage, FaMagic, FaDownload, FaUpload, FaCopy, FaEdit } from 'react-icons/fa';
import FeatureLayout from '@/app/components/FeatureLayout';
import { useApiSettings } from '@/app/components/ApiSettingsContext';
import { generate } from '@/app/lib/api';
import { objectToQueryString } from '@/app/lib/utils';

const DEFAULT_SIZE = 1024;

export default function ImageEditor() {
    const { apiConfig } = useApiSettings();
    const [prompt, setPrompt] = useState('');
    const [width, setWidth] = useState(DEFAULT_SIZE);
    const [height, setHeight] = useState(DEFAULT_SIZE);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const aspectRatios = ['1:1', '16:9', '4:3', '3:2', '9:16', '3:4', '2:3'];

    const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
    const [contentImages, setContentImages] = useState<string[]>([]);
    const [numImages, setNumImages] = useState(1);
    const styleOptions = ['默认', '3D卡通', '线稿', '像素', '写实', '水彩', '水墨画', '蜡笔', 'Q版', '钢笔淡彩', '版画'];
    const [style, setStyle] = useState(styleOptions[0]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const modelOptions = ['flux', 'gptimage', 'kontext'];
    const [model, setModel] = useState(modelOptions[0]);
    const [uploadImage, setUploadImage] = useState<string>('');

    const handleTranslate = async () => {
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        try {
            const translatedPrompt = await generate({
                ...apiConfig,
                model: 'gemini-2.0-flash-exp',
                messages: [{ role: 'user', content: `Translate the following to English, provide only the translated text, no explanation: ${prompt}` }],
                temperature: 0,
            });
            if (translatedPrompt) {
                setPrompt(translatedPrompt.content);
            }
        } catch (error) {
            console.error('Error translating prompt:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeneratePrompt = async () => {
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        try {
            const generatedPrompt = await generate({
                ...apiConfig,
                model: 'gemini-2.0-flash-exp',
                messages: [{ role: 'user', content: `Transform the following description into a concise, detailed, and creative image generation prompt. Focus on key visual elements, style, and composition. Provide only the generated prompt. Description: ${prompt}` }],
                temperature: 0,
            });
            if (generatedPrompt) {
                setPrompt(generatedPrompt.content);
            }
        } catch (error) {
            console.error('Error generating prompt:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditImage = async (imageUrl: string) => {
        if (uploadImage === imageUrl) {
            setModel(modelOptions[0]);
            setUploadImage('');
            return;
        }

        setModel(modelOptions[2]);
        if (imageUrl.startsWith('http')) { return setUploadImage(imageUrl); }

        try {
            let response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            const fileName = `${prompt.slice(0, 10) || 'image'}-${Date.now()}.png`;
            const file = new File([blob], fileName, { type: blob.type });               

            const formData = new FormData();
            formData.append('file', file);
            response = await fetch('/api/cos-upload', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();

            setUploadImage(data.message);
        } catch (error) {
            console.error(error);
        }
    }

    const handleImageToPrompt = async (imageUrl: string) => {
        if (isLoading) return;

        const fileToBase64 = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = error => reject(error);
            });
        };

        setIsLoading(true);
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            const file = new File([blob], "image.png", { type: blob.type });
            const base64Url = await fileToBase64(file);

            const generatedPrompt = await generate({
                ...apiConfig,
                model: 'gemini-2.0-flash-exp',
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Transform the following image into a concise, detailed, and creative image generation prompt. Focus on key visual elements, style, and composition. Provide only the generated prompt",
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: base64Url,
                                },
                            },
                        ],
                    },
                ],
                temperature: 0,
            });
            if (generatedPrompt) {
                setPrompt(generatedPrompt.content);
            }
        } catch (error) {
            console.error('Error generating prompt from image:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            fetch('/api/cos-upload', {
                method: 'POST',
                body: formData,
            })
            .then(res => res.json())
            .then((res) => {
                setContentImages([res.message]);
            });
        }
    };

    const generateCoverImage = useCallback(async () => {
        if (isImageLoading || prompt.trim() === '') return;

        const basePrompt = prompt.trim() || 'sky';
        const finalPrompt = style !== styleOptions[0] ? `${style}, ${basePrompt}` : basePrompt;
        const imagePrompt = encodeURIComponent(finalPrompt);
        setIsImageLoading(true);

        try {
            const imagePromises = Array.from({ length: numImages }).map(async () => {
                const seed = Math.floor(Math.random() * 100000);
                const payload = { 
                    nologo: true, 
                    enhance: true, 
                    token: process.env.NEXT_PUBLIC_POLLAI_KEY, 
                    model,
                    ...(uploadImage ? { image: uploadImage } : { seed, width, height })
                };
                const imageUrl = `https://image.pollinations.ai/prompt/${imagePrompt}?${objectToQueryString(payload)}`;

                const response = await fetch(imageUrl);
                if (!response.ok) {
                    console.error("Failed to load generated image from Pollinations.");
                    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
                }
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                setContentImages(prev => [...prev, blobUrl]);
                return blobUrl;
            });

            await Promise.all(imagePromises);
        } catch (error) {
            console.error('Error generating cover image:', error);
            alert(`封面图生成失败: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsImageLoading(false);
        }
    }, [prompt, isImageLoading, width, height, numImages, style, styleOptions, uploadImage]);

    const toggleRatioLock = useCallback((value: string) => {
        setAspectRatio(value);

        const [w, h] = value.split(':').map(Number);
        const newHeight = Math.round(DEFAULT_SIZE * h / w);
        const newWidth = Math.round(DEFAULT_SIZE * w / h);
        if (height !== newHeight) {
            setHeight(newHeight);
            setWidth(newWidth);
        }
    }, [width, height]);

    let loading = false;
    const handleDownload = useCallback((url: string) => {
        if (loading) return;
        loading = true;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = `${prompt.slice(0, 10)}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        loading = false;
    }, [prompt]);

    return (
        <FeatureLayout
            title="图像编辑工具"
            subtitle="智能编辑图像，生成高质量的图像"
        >
            <div>
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Column: Form */}
                    <div className="w-full md:w-1/3 flex flex-col gap-4 bg-white rounded-lg shadow-sm p-6">
                        <div className="relative w-full">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="输入图像描述..."
                                className="p-2 pb-5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 w-full"
                                rows={5}
                            />
                            <div className="absolute bottom-3 left-3 flex items-center gap-3">
                                {isLoading ? <FaSpinner className="animate-spin text-gray-500" /> : (
                                    <>
                                        <button onClick={handleTranslate} className="flex items-center gap-1 text-gray-500 hover:text-gray-700" title="翻译">
                                            <FaLanguage size={18} />
                                            <span className="ml-1 text-xs">翻译</span>
                                        </button>
                                        <button onClick={handleGeneratePrompt} className="flex items-center gap-1 text-gray-500 hover:text-gray-700" title="智能创作">
                                            <FaMagic size={13} />
                                            <span className="ml-1 text-xs">智能创作</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-end gap-2">
                                <div className="flex-grow">
                                    <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-700">尺寸</label>
                                    <select
                                        id="aspectRatio"
                                        value={aspectRatio}
                                        onChange={(e) => toggleRatioLock(e.target.value)}
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {aspectRatios.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="numImages" className="block text-sm font-medium text-gray-700">数量</label>
                                <input
                                    type="number"
                                    id="numImages"
                                    value={numImages}
                                    onChange={(e) => setNumImages(Math.max(1, Math.min(4, parseInt(e.target.value, 10))))}
                                    min="1"
                                    max="4"
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="width" className="block text-sm font-medium text-gray-700">宽度</label>
                                <input
                                    type="number"
                                    id="width"
                                    value={width}
                                    onChange={(e) => setWidth(parseInt(e.target.value, 10))}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="height" className="block text-sm font-medium text-gray-700">高度</label>
                                <input
                                    type="number"
                                    id="height"
                                    value={height}
                                    onChange={(e) => setHeight(parseInt(e.target.value, 10))}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="style" className="block text-sm font-medium text-gray-700">风格</label>
                                <select
                                    id="style"
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {styleOptions.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="style" className="block text-sm font-medium text-gray-700">模型</label>
                                <select
                                    id="style"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {modelOptions.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                id="image-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                            <label
                                htmlFor="image-upload"
                                className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 cursor-pointer flex items-center justify-center"
                            >
                                <FaUpload className="mr-2" />
                                上传
                            </label>
                            <button
                                onClick={generateCoverImage}
                                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center flex-grow"
                                disabled={isImageLoading}
                            >
                                {isImageLoading ? <><FaSpinner className="animate-spin mr-2" />生成中...</> : uploadImage ? '编辑图像' : '生成图像'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Image Display */}
                    <div className="w-full md:w-2/3 bg-white rounded-lg shadow-sm p-6">
                        <div className="relative overflow-y-auto" style={{ minHeight: '450px', maxHeight: '500px' }}>
                            {isImageLoading && contentImages.length === 0 ? (
                                <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                                    <FaSpinner className="animate-spin mr-2" /> 图像生成中...
                                </div>
                            ) : contentImages.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                                    {contentImages.map((image, index) => (
                                        <div className='relative' key={index}>
                                            <img
                                                src={image}
                                                alt={`${prompt || '生成的图像'} ${index + 1}`}
                                                className={`w-full rounded-lg border border-gray-200 shadow-sm hover:border-blue-600 transition-colors ${uploadImage === image ? '!border-blue-600' : ''}`}
                                            />

                                            <div className="flex mt-2 gap-4">
                                                <button
                                                    onClick={() => handleDownload(image)}
                                                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                                                >
                                                    <FaDownload size={14} />
                                                    <span className='text-xs'>下载</span>
                                                </button>

                                                <button
                                                    onClick={() => handleImageToPrompt(image)}
                                                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                                                >
                                                    <FaCopy size={14} />
                                                    <span className='text-xs'>提示词</span>
                                                </button>

                                                <button
                                                    onClick={() => handleEditImage(image)}
                                                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700 cursor-pointer"
                                                >
                                                    <FaEdit size={14} />
                                                    <span className='text-xs'>{image === uploadImage ? '取消编辑' : '编辑'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div
                                    className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-300 transition-colors cursor-pointer"
                                    onClick={generateCoverImage}
                                >
                                    <span>输入描述后生成图像</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </FeatureLayout>
    );
}