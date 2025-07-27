"use client";

import React, { useState, useCallback, useEffect } from 'react';
import {
    FaPlay, FaVolumeUp, FaImage, FaDownload, FaExclamationCircle, FaPaintBrush, FaCamera
} from 'react-icons/fa';
import { Voice } from '../types';
import { ApiConfigProps } from '@/app/components/ApiSettingBlock';

const TTS_MODEL = 'gemini-2.5-flash-tts';
const IMAGE_MODEL = 'flux';

const availableVoices: Voice[] = [
    { id: 'Zephyr', name: '明亮' },
    { id: 'Puck', name: '欢快' },
    { id: 'Charon', name: '信息丰富' },
    { id: 'Kore', name: '坚定' },
    { id: 'Fenrir', name: '易激动' },
    { id: 'Leda', name: '年轻' },
    { id: 'Orus', name: '坚定' },
    { id: 'Aoede', name: '轻松' },
    { id: 'Callirhoe', name: '随和' },
    { id: 'Autonoe', name: '明亮' },
    { id: 'Enceladus', name: '呼吸感' },
    { id: 'Iapetus', name: '清晰' },
    { id: 'Umbriel', name: '随和' },
    { id: 'Algieba', name: '平滑' },
    { id: 'Despina', name: '平滑' },
    { id: 'Erinome', name: '清晰' },
    { id: 'Algenib', name: '沙哑' },
    { id: 'Rasalgethi', name: '信息丰富' },
    { id: 'Laomedeia', name: '欢快' },
    { id: 'Achernar', name: '轻柔' },
    { id: 'Alnilam', name: '坚定' },
    { id: 'Schedar', name: '平稳' },
    { id: 'Gacrux', name: '成熟' },
    { id: 'Pulcherrima', name: '向前' },
    { id: 'Achird', name: '友好' },
    { id: 'Zubenelgenubi', name: '休闲' },
    { id: 'Vindemiatrix', name: '温柔' },
    { id: 'Sadachbia', name: '活泼' },
    { id: 'Sadaltager', name: '博学' },
    { id: 'Sulafat', name: '温暖' }
];

interface OutputSectionProps {
    isLoading: boolean;
    inputText: string;
    showResults: boolean,
    apiConfig: ApiConfigProps;
}

export default function OutputSection({
    isLoading,
    inputText,
    showResults,
    apiConfig,
}: OutputSectionProps) {
    const [ttsLoading, setTtsLoading] = useState(false);
    const [ttsError, setTtsError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<string>('');
    const [imageGenLoading, setImageGenLoading] = useState(false);
    const [imageGenError, setImageGenError] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [showOutput, setShowOutput] = useState(false); 

    const generateTTS = useCallback(async () => {
        if (ttsLoading || !inputText.trim() || !selectedVoice) return;
        if (!apiConfig.apiKey || !apiConfig.apiUrl) {
            setTtsError('请先在上方设置 API URL 和 Key。');
            return;
        }

        setTtsLoading(true);
        setTtsError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);

        try {
            const ttsUrl = apiConfig.apiUrl.replace(/chat\/completions$/, 'audio/speech');
            const response = await fetch(ttsUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiConfig.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: inputText,
                    voice: selectedVoice,
                    model: TTS_MODEL,
                    response_format: 'mp3'
                }),
            });

            if (!response.ok) {
                 let errorMsg = `TTS API 请求失败: ${response.status} ${response.statusText}`;
                 try {
                     const errorData = await response.json();
                     errorMsg += `. ${errorData.error?.message || JSON.stringify(errorData)}`;
                 } catch (e) { /* Ignore */ }
                 throw new Error(errorMsg);
            }

            const audioBlob = await response.blob();
            if (audioBlob.size === 0) throw new Error('TTS API 返回了空的音频文件。');
            setAudioUrl(URL.createObjectURL(audioBlob));
        } catch (error: any) {
            setTtsError(error.message || '生成语音时发生未知错误');
        } finally {
            setTtsLoading(false);
        }
    }, [ttsLoading, inputText, selectedVoice, apiConfig, audioUrl]);

    const generateCoverImage = useCallback(async () => {
        if (imageGenLoading || !inputText.trim()) return;
        if (!apiConfig.apiKey || !apiConfig.apiUrl) {
            setImageGenError('图像生成 API URL 或 Key 未配置。');
            return;
        }

        setImageGenLoading(true);
        setImageGenError(null);
        setImageUrl(null);

        try {
            const textSnippet = inputText.substring(0, 80);
            const imagePrompt = `为一篇关于 "${textSnippet}..." 的文章生成一个吸引人的封面插图，风格现代、简洁、色彩明亮。`;
            const imageUrlEndpoint = apiConfig.apiUrl.replace(/chat\/completions$/, 'images/generations');

            const response = await fetch(imageUrlEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiConfig.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: imagePrompt,
                    model: IMAGE_MODEL,
                    n: 1,
                    size: "1024x1024",
                    response_format: "b64_json",
                    seed: Math.floor(Math.random() * 10000),
                }),
            });

            if (!response.ok) {
                 let errorMsg = `图像生成 API 请求失败: ${response.status} ${response.statusText}`;
                 try {
                     const errorData = await response.json();
                     errorMsg += `. ${errorData.error?.message || JSON.stringify(errorData)}`;
                 } catch (e) { /* Ignore */ }
                 throw new Error(errorMsg);
            }

            const data = await response.json();
            if (data.data?.[0]?.b64_json) {
                 setImageUrl(`data:image/png;base64,${data.data[0].b64_json}`);
            } else if (data.data?.[0]?.url) {
                 setImageUrl(data.data[0].url);
            } else {
                throw new Error('图像生成 API 响应格式无效或缺少图像数据。');
            }
        } catch (error: any) {
            setImageGenError(error.message || '生成图像时发生未知错误');
        } finally {
            setImageGenLoading(false);
        }
    }, [imageGenLoading, inputText, apiConfig]);

    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    if (isLoading) {
        return null;
    }

    return showResults && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                    <FaPlay className="text-purple-500" />
                </div>
                <div className="flex items-center justify-between" onClick={() => setShowOutput(prev => !prev)} >
                    <span className='text-xl font-semibold'>内容生成</span>
                    <span className='ml-3 cursor-pointer'>{showOutput ? '隐藏' : '展示'}</span>
                </div>
            </div>

            {showOutput && <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div>
                    <h3 className="text-lg font-medium mb-3 text-gray-800 flex items-center"><FaVolumeUp className="mr-2 text-green-500" />文本转语音</h3>
                    <div className="space-y-3">
                        <div>
                            <select
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="">-- 选择一个音色 --</option>
                                {availableVoices.map(voice => (
                                    <option key={voice.id} value={voice.id}>{voice.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={generateTTS}
                            disabled={ttsLoading || !inputText.trim() || !selectedVoice}
                            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {ttsLoading ? <span className="loading-spinner mr-2 border-top-color-white"></span> : <FaPlay className="mr-2" />}
                            {ttsLoading ? '生成中...' : '生成语音'}
                        </button>
                        {ttsError && <div className="text-red-600 text-sm mt-2"><FaExclamationCircle className="inline-block mr-1" />{ttsError}</div>}
                        {audioUrl && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700 mb-1">播放生成的语音:</p>
                                <audio controls src={audioUrl}>您的浏览器不支持音频播放。</audio>
                                <a href={audioUrl} download="generated_audio.mp3" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                                    <FaDownload className="inline-block mr-1" /> 下载音频
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium mb-3 text-gray-800 flex items-center"><FaImage className="mr-2 text-yellow-500" />封面图生成</h3>
                    <div className="space-y-3">
                        <button
                            onClick={generateCoverImage}
                            disabled={imageGenLoading || !inputText.trim()}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {imageGenLoading ? <span className="loading-spinner mr-2 border-top-color-white"></span> : <FaPaintBrush className="mr-2" />}
                            {imageGenLoading ? '生成中...' : '生成封面图'}
                        </button>
                        {imageGenError && <div className="text-red-600 text-sm mt-2"><FaExclamationCircle className="inline-block mr-1" />{imageGenError}</div>}
                        {imageUrl ? (
                            <div className="mt-4 text-center">
                                <img src={imageUrl} alt="Generated Cover Image" className="generated-image mx-auto" />
                                <a href={imageUrl} download="cover_image.png" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                                    <FaDownload className="inline-block mr-1" /> 下载图片
                                </a>
                            </div>
                        ) : (
                            !imageGenLoading && (
                                <div className="text-center text-gray-400 mt-4 border border-dashed rounded-lg p-6">
                                    <FaCamera className="text-3xl mb-2 mx-auto" />
                                    <p>点击按钮生成封面图</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>}
        </div>
    );
}