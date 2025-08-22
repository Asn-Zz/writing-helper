"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { FaSpinner, FaLanguage, FaMagic, FaDownload, FaUpload, FaCopy, FaEdit, FaTrash } from 'react-icons/fa';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import FeatureLayout from '@/app/components/FeatureLayout';
import { useApiSettings } from '@/app/components/ApiSettingsContext';
import { generate } from '@/app/lib/api';
import { objectToQueryString, cn } from '@/app/lib/utils';
import 'react-photo-view/dist/react-photo-view.css';

const DEFAULT_SIZE = 1024;

export default function ImageEditor() {
    const { apiConfig } = useApiSettings();
    const [prompt, setPrompt] = useState('');
    const [width, setWidth] = useState(DEFAULT_SIZE);
    const [height, setHeight] = useState(DEFAULT_SIZE);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const aspectRatios = ['1:1', '16:9', '4:3', '3:2', '9:16', '3:4', '2:3'];

    const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
    const [contentImages, setContentImages] = useState<string[]>(Array.from({ length: 0 }, () => ''));
    const [numImages, setNumImages] = useState(1);
    const styleOptions = ['默认', '3D卡通', '线稿', '像素', '写实', '水彩', '水墨画', '蜡笔', 'Q版', '钢笔淡彩', '版画'];
    const [style, setStyle] = useState(styleOptions[0]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const modelOptions = ['flux', 'gptimage', 'kontext'];
    const [model, setModel] = useState(modelOptions[0]);
    const [uploadImage, setUploadImage] = useState<string>('');
    const [imageHistory, setImageHistory] = useState<string[]>([]);

    const [background, setBackground] = useState({});
    const generateBackgroundImage = useCallback(() => {
        const seed = Math.floor(Math.random() * 100000);
        setBackground({
            background: `no-repeat url(https://bing.img.run/rand.php?seed=${seed}) center center/cover`,
            backdropFilter: 'blur(5px)',
        });
    }, []);

    useEffect(() => {
        generateBackgroundImage();
    }, [generateBackgroundImage]);

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('imageHistory');
            if (storedHistory) {
                setImageHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error("Failed to load image history from localStorage", error);
        }
    }, []);

    
    const addImagesToHistory = useCallback((newImages: string[]) => {
        setImageHistory(prevHistory => {
            const updatedHistory = [...new Set([...newImages, ...prevHistory])].slice(0, 50);
            try {
                localStorage.setItem('imageHistory', JSON.stringify(updatedHistory));
            } catch (error) {
                console.error("Failed to save image history to localStorage", error);
            }
            return updatedHistory;
        });
    }, []);

    const handleDeleteFromHistory = useCallback((imageUrl: string) => {
        setImageHistory(prevHistory => {
            const updatedHistory = prevHistory.filter(img => img !== imageUrl);
            try {
                localStorage.setItem('imageHistory', JSON.stringify(updatedHistory));
            } catch (error) {
                console.error("Failed to update image history in localStorage", error);
            }
            return updatedHistory;
        });
    }, []);

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
            addImagesToHistory([data.message]);
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
                addImagesToHistory([res.message]);
            });
        }
    };

    const handleDeleteImage = (image: string) => {
        setContentImages((prevImages) => prevImages.filter((img) => img !== image));
    };

    const resetImage = () => {
        setPrompt('');
        setUploadImage('');
        setContentImages([]);
    }

    const generateCoverImage = useCallback(async () => {
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
                                className="p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 w-full"
                                rows={5}
                            />
                            <div className="flex items-center gap-3">
                                {isLoading ? <FaSpinner className="animate-spin text-gray-500" /> : (
                                    <div className="flex items-center gap-3">
                                        <button onClick={handleTranslate} className="flex items-center gap-1 text-gray-500 hover:text-gray-700" title="翻译">
                                            <FaLanguage size={18} />
                                            <span className="ml-1 text-xs">翻译</span>
                                        </button>
                                        <button onClick={handleGeneratePrompt} className="flex items-center gap-1 text-gray-500 hover:text-gray-700" title="智能创作">
                                            <FaMagic size={13} />
                                            <span className="ml-1 text-xs">智能创作</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
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
                                disabled={isImageLoading || prompt.trim() === ''}
                            >
                                {isImageLoading ? <><FaSpinner className="animate-spin mr-2" />生成中...</> : uploadImage ? '编辑图像' : '生成图像'}
                            </button>
                        </div>
                        {contentImages.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={resetImage}
                                    className="bg-gray-200 text-red-600 py-2 px-4 rounded-md hover:bg-gray-300 disabled:opacity-50 flex items-center justify-center flex-grow"
                                    disabled={isImageLoading}
                                >
                                    重置
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Image Display */}
                    <div className={cn("w-full md:w-2/3 bg-white rounded-lg shadow-sm", { "p-6": contentImages.length })}>
                        <div className="relative overflow-y-auto h-full" style={{ minHeight: '450px', maxHeight: '500px' }}>
                            {isImageLoading && contentImages.length === 0 ? (
                                <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                                    <FaSpinner className="animate-spin mr-2" /> 图像生成中...
                                </div>
                            ) : contentImages.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <PhotoProvider toolbarRender={({ onScale, scale, onRotate, rotate }) => {
                                        return (
                                            <>
                                                <svg className="PhotoView-Slider__toolbarIcon" width={44} height={44} viewBox="0 0 768 768" onClick={() => onScale(scale + 1)}>
                                                    <path d="M384 640.5q105 0 180.75-75.75t75.75-180.75-75.75-180.75-180.75-75.75-180.75 75.75-75.75 180.75 75.75 180.75 180.75 75.75zM384 64.5q132 0 225.75 93.75t93.75 225.75-93.75 225.75-225.75 93.75-225.75-93.75-93.75-225.75 93.75-225.75 225.75-93.75zM415.5 223.5v129h129v63h-129v129h-63v-129h-129v-63h129v-129h63z"></path>
                                                </svg>
                                                <svg className="PhotoView-Slider__toolbarIcon" width={44} height={44} viewBox="0 0 768 768" onClick={() => onScale(scale - 1)}>
                                                    <path d="M384 640.5q105 0 180.75-75.75t75.75-180.75-75.75-180.75-180.75-75.75-180.75 75.75-75.75 180.75 75.75 180.75 180.75 75.75zM384 64.5q132 0 225.75 93.75t93.75 225.75-93.75 225.75-225.75 93.75-225.75-93.75-93.75-225.75 93.75-225.75 225.75-93.75zM223.5 352.5h321v63h-321v-63z"></path>
                                                </svg>
                                                <svg className="PhotoView-Slider__toolbarIcon" width={44} height={44} fill="white" viewBox="0 0 768 768" onClick={() => onRotate(rotate + 45)}>
                                                    <path d="M565.5 202.5l75-75v225h-225l103.5-103.5c-34.5-34.5-82.5-57-135-57-106.5 0-192 85.5-192 192s85.5 192 192 192c84 0 156-52.5 181.5-127.5h66c-28.5 111-127.5 192-247.5 192-141 0-255-115.5-255-256.5s114-256.5 255-256.5c70.5 0 135 28.5 181.5 75z"></path>
                                                </svg>
                                                <svg className="PhotoView-Slider__toolbarIcon" fill="white" width="44" height="44" viewBox="0 0 768 768" onClick={() => document.documentElement.requestFullscreen()}>
                                                    <path d="M448.5 160.5h159v159h-63v-96h-96v-63zM544.5 544.5v-96h63v159h-159v-63h96zM160.5 319.5v-159h159v63h-96v96h-63zM223.5 448.5v96h96v63h-159v-159h63z"></path>
                                                </svg>
                                            </>
                                        );
                                    }}>
                                        {contentImages.map((image, index) => (
                                            <div className='view-list relative rounded-lg overflow-hidden border-1 border-gray-200 hover:border-blue-500' key={index}>
                                                <PhotoView src={image}>
                                                    <img src={image} alt={`${prompt || '生成的图像'} ${index + 1}`} />
                                                </PhotoView>

                                                <div className={cn('absolute w-full bottom-0 left-0 px-4 py-2 flex justify-between gap-2 bg-black/30', uploadImage === image ? 'block' : 'hidden')}>
                                                    <button
                                                        onClick={() => handleDownload(image)}
                                                        className="flex items-center gap-1 text-white opacity-80 hover:opacity-100 cursor-pointer"
                                                    >
                                                        <FaDownload size={14} />
                                                        <span className='text-[10px]'>下载</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleImageToPrompt(image)}
                                                        className="flex items-center gap-1 text-white opacity-80 hover:opacity-100 cursor-pointer"
                                                    >
                                                        <FaCopy size={14} />
                                                        <span className='text-[10px]'>提示词</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleEditImage(image)}
                                                        className="flex items-center gap-1 text-white opacity-80 hover:opacity-100 cursor-pointer"
                                                    >
                                                        <FaEdit size={14} />
                                                        <span className='text-[10px]'>{image === uploadImage ? '取消' : '编辑'}</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteImage(image)}
                                                        className="flex items-center gap-1 text-white opacity-80 hover:opacity-100 cursor-pointer"
                                                    >
                                                        <FaTrash size={14} />
                                                        <span className='text-[10px]'>删除</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </PhotoProvider>
                                </div>
                            ) : (
                                <div
                                    className="absolute inset-0 !bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 cursor-pointer"
                                    onClick={generateBackgroundImage}
                                    style={background}
                                    title="点击生成图像"
                                >
                                    {/* <span>输入描述后生成图像</span> */}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {imageHistory.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">我的作品</h3>
                        {imageHistory.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {imageHistory.map((image, index) => (
                                    <div key={index} className="relative group">
                                        <img src={image} alt={`历史图片 ${index + 1}`} className="w-full max-h-40 object-cover rounded-md cursor-pointer shadow-md" />
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-50 transition-opacity rounded-md">
                                            <button onClick={() => { handleDeleteFromHistory(image); }} className="text-white p-2">
                                                <FaTrash size={20} />
                                            </button>

                                            <button onClick={() => { setContentImages(prev => [...prev, image]); }} className="text-white p-2">
                                                <FaEdit size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-4">暂无历史记录。</p>
                        )}
                    </div>
                )}
            </div>

            <style jsx global>{`
            .view-list:hover > div {
                display: flex;
            }
            `}</style>
        </FeatureLayout>
    );
}