"use client"; // Required for hooks and event handlers

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
    FaPenFancy, FaCopy, FaSearch, FaTrashAlt, FaLightbulb, FaCheck, FaTimes,
    FaFileAlt, FaCloudUploadAlt, FaVolumeUp, FaImage, FaCompressArrowsAlt,
    FaPlay, FaDownload, FaExclamationCircle, FaMagic, FaListUl, FaCheckCircle,
    FaArrowRight, FaCamera, FaInfoCircle, FaPaintBrush
} from 'react-icons/fa'; // Import necessary icons
import ApiSettingBlock, { ApiConfigProps } from '../../components/ApiSettingBlock';
import { generate } from '../../lib/api';
import mammoth from 'mammoth'; // Import mammoth for DOCX
import './style.css';

// Define interfaces for better type safety
interface Issue {
    id: number;
    original: string;
    suggestion: string;
    reason: string;
    start: number;
    end: number;
    fixed: boolean;
}

interface ResultSegment {
    type: 'text' | 'highlight';
    content: string;
    issue?: Issue; // Only present for 'highlight' type
}

interface Voice {
    id: string;
    name: string;
}

// API Models and Prompts
const PROOFREADING_MODEL = 'deepseek-v3';
const PROOFREADING_PROMPT = '你是一个专业的文章校对编辑，擅长发现并修正中文语法、拼写错误，同时保持原文风格。';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const IMAGE_MODEL = 'flux';

// Hardcoded available voices (as config panel is removed)
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

export default function CheckerEditor() {
    // --- State ---
    const [inputText, setInputText] = useState('');
    const [originalTextForIssues, setOriginalTextForIssues] = useState(''); // Store text used for issue finding
    const [isLoading, setIsLoading] = useState(false); // Proofreading loading
    const [showResults, setShowResults] = useState(false);
    const [issues, setIssues] = useState<Issue[]>([]); // Proofreading issues
    const [apiError, setApiError] = useState<string | null>(null); // Proofreading API error

    // API 设置状态
    const [apiConfig, setApiConfig] = useState<ApiConfigProps>({
      apiProvider: 'openai',
      apiUrl: '',
      apiKey: '',
      model: ''
    })

    // File Upload State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [isProcessingFile, setIsProcessingFile] = useState(false);

    // TTS State
    const [ttsLoading, setTtsLoading] = useState(false);
    const [ttsError, setTtsError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<string>(''); // Default to first voice

    // Image Generation State
    const [imageGenLoading, setImageGenLoading] = useState(false);
    const [imageGenError, setImageGenError] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // --- Computed Properties (using useMemo) ---
    const charCount = useMemo(() => inputText.length, [inputText]);
    const unfixedIssuesCount = useMemo(() => issues.filter(i => !i.fixed).length, [issues]);

    const resultSegments = useMemo((): ResultSegment[] => {
        // Render based on the *original* text where issues were found
        // This prevents highlight drift when text is modified by accepting suggestions
        if (!showResults || issues.length === 0) {
            return [{ type: 'text', content: inputText }]; // Show current text if no results/issues
        }

        const sortedIssues = [...issues].sort((a, b) => a.start - b.start);
        const segments: ResultSegment[] = [];
        let lastIndex = 0;

        sortedIssues.forEach(issue => {
            // Add text segment before the current issue (from original text)
            if (issue.start > lastIndex) {
                segments.push({
                    type: 'text',
                    content: originalTextForIssues.substring(lastIndex, issue.start)
                });
            }
            // Add the highlighted issue segment (use original text for display within highlight)
            segments.push({
                type: 'highlight',
                content: originalTextForIssues.substring(issue.start, issue.end),
                issue: issue
            });
            lastIndex = issue.end;
        });

        // Add any remaining text after the last issue (from original text)
        if (lastIndex < originalTextForIssues.length) {
            segments.push({
                type: 'text',
                content: originalTextForIssues.substring(lastIndex)
            });
        }

        // If somehow segments are empty but there was text, return the original as one segment
        if (segments.length === 0 && originalTextForIssues) {
             segments.push({ type: 'text', content: originalTextForIssues });
        }

        return segments;
    }, [showResults, issues, inputText, originalTextForIssues]); // Include inputText to re-render if user types after results shown

    // --- Methods ---

    // Input/Util Methods
    const copyText = useCallback(() => {
        if (!inputText.trim()) return;
        navigator.clipboard.writeText(inputText)
            .then(() => {
                // Simple visual feedback could be added here (e.g., temporary message)
                alert('文本已复制!');
            })
            .catch(err => {
                console.error('Copy failed:', err);
                alert('复制失败');
            });
    }, [inputText]);

    const compressText = useCallback(() => {
        if (!inputText.trim()) return;
        // Replace two or more newlines with a single newline.
        // This helps clean up text pasted from sources with excessive spacing.
        const compressed = inputText.replace(/(\r\n|\r|\n){2,}/g, '\n');
        setInputText(compressed);
    }, [inputText]);

    const clearInput = useCallback(() => {
        setInputText('');
        setOriginalTextForIssues('');
        setIssues([]);
        setShowResults(false);
        setApiError(null);
        setAudioUrl(null);
        setTtsError(null);
        setImageUrl(null);
        setImageGenError(null);
        removeUploadedFile(); // Also clear file input
    }, []); // Add removeUploadedFile if needed

    const loadExample = useCallback(() => {
        clearInput(); // Clear everything first
        const example = `太阳徐徐升起，给大地带来了早晨的气息。小名从梦中惊醒，他揉了揉眼睛，发先已经9点了。
他慌张的穿上衣服，拿起手提包就像着学校奔去。路上，他遇到了几个同班同学，他们一个个都在得意的笑着，原来，今天是星期六，没有课。
小明停下了脚本，仔细的想了想，确实，昨天是星期五，所以今天应该没有上课。他懊恼的拍了拍脑袋，自言自语道："我记忆力怎么这么差啊！"
回到家后，妈妈正在做饭。"你去哪了？"妈妈问道。小名有点尴尬的回答"我以为今天有课，差点去学校上课了。"妈妈哈哈大笑，说道："你呀，真是太马虎了，连今天星期几都能记错。"
小明想起上周也发生过类似的一件事情，他把语文老师留的作业给忘记了，结果被老师在全班面前批评，他真的很伤心；
人们常说"书读百变，其义自现。"小明觉的这句话特别有道理。他决定从明天开始，每天写一篇读书笔记，提高自己的阅读理解能力。`;
        setInputText(example);
    }, [clearInput]);

    // File Upload Methods
    const handleFileSelect = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validExtensions = ['.txt', '.md', '.markdown', '.doc', '.docx', '.rtf', '.text'];
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!validExtensions.includes(fileExt)) {
            alert('请上传支持的文本文件格式 (TXT, DOC, DOCX, MD等)');
            setUploadedFileName(null);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Clear the actual input
            return;
        }

        setUploadedFileName(file.name);
        setIsProcessingFile(true);
        setApiError(null);
        setInputText(''); // Clear text area while processing

        try {
            if (['.txt', '.md', '.markdown', '.text', '.rtf'].includes(fileExt)) { // Basic RTF handling as text
                const text = await file.text();
                setInputText(text);
            } else if (['.doc', '.docx'].includes(fileExt)) {
                if (typeof mammoth === 'undefined') {
                    throw new Error('Mammoth library not loaded. Cannot process DOCX files.');
                }
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                setInputText(result.value);
            } else {
                setInputText(`(无法预览 ${fileExt} 文件内容，请使用 TXT, MD, DOCX)`);
                throw new Error(`Unsupported file type for direct reading: ${fileExt}`);
            }
        } catch (error: any) {
            console.error('File processing error:', error);
            setApiError(`文件处理失败: ${error.message || '无法读取文件内容'}`);
            setInputText('');
            removeUploadedFile(); // Clear file input state on error
        } finally {
            setIsProcessingFile(false);
            // Reset the input value so the same file can be selected again
             if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, []); // Add removeUploadedFile if needed

    const removeUploadedFile = useCallback(() => {
        setUploadedFileName(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Clear the actual file input
        }
        // Optionally clear text area if it was filled by upload
        // setInputText('');
    }, []);


    // Proofreading Methods
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
    }, []); // Depends only on hardcoded config

    const checkText = useCallback(async () => {
        if (isLoading || !inputText.trim()) return;

        setIsLoading(true);
        setShowResults(false);
        setIssues([]);
        setApiError(null);
        setAudioUrl(null); // Clear previous outputs
        setImageUrl(null);
        setOriginalTextForIssues(inputText); // Store the text being analyzed

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
              // response_format: { type: "json_object" }
            })
            const parsedIssues = JSON.parse(data.content);
            if (!Array.isArray(parsedIssues)) throw new Error('响应不是JSON数组。');
            
            let currentOffset = 0;
            const processedIssues: Issue[] = [];
            let issueIdCounter = 0;
            const textToSearch = inputText; // Use the text that was sent

            parsedIssues.forEach(item => {
                if (!item || typeof item.original !== 'string' || typeof item.suggestion === 'undefined' || typeof item.reason !== 'string') {
                    console.warn('跳过格式不完整的建议:', item); return;
                }
                
                // Find the *first* occurrence after the last found issue
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
                    console.warn(`无法在文本中找到原始片段 (从 ${currentOffset} 开始): "${item.original}"`);
                    // Try searching from the beginning again as a fallback? Could lead to wrong matches.
                    const fallbackStart = textToSearch.indexOf(item.original);
                    if (fallbackStart !== -1) {
                        pushItem(fallbackStart);
                    }
                }
            });

            setIssues(processedIssues.sort((a, b) => a.start - b.start));
            setShowResults(true);

        } catch (error: any) {
            console.error('校对出错:', error);
            setApiError(error.message || '发生未知错误');
            setShowResults(false);
            setOriginalTextForIssues(''); // Clear original text on error
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, inputText, createPrompt, apiConfig]);

    // --- IMPORTANT: applyFixesToInputText ---
    // This function modifies the main inputText state based on accepted suggestions.
    // It needs to handle potential index shifts caused by previous replacements.
    // Applying fixes from end-to-start is a common strategy to avoid index issues.
    const applyFixesToInputText = useCallback((fixesToApply: Issue[]) => {
        // Sort fixes by start index in descending order
        const sortedFixes = [...fixesToApply].sort((a, b) => b.start - a.start);
        let currentText = inputText; // Get the current text

        sortedFixes.forEach(fix => {
            // Check if the original text still exists at the expected position
            // This is a basic check; more complex validation might be needed for overlapping fixes
            if (currentText.substring(fix.start, fix.end) === fix.original) {
                currentText = currentText.substring(0, fix.start) + fix.suggestion + currentText.substring(fix.end);
            } else {
                console.warn(`Skipping fix for issue ${fix.id} because original text "${fix.original}" not found at index ${fix.start}. Text might have changed.`);
                // Optionally, try to find the original text again nearby? Risky.
            }
        });

        setInputText(currentText); // Update the main text state

        // Mark these issues as fixed *after* applying changes to text
        setIssues(prevIssues =>
            prevIssues.map(issue =>
                fixesToApply.some(fix => fix.id === issue.id) ? { ...issue, fixed: true } : issue
            )
        );

        // After applying fixes, the originalTextForIssues is no longer perfectly aligned
        // with the highlights if we keep using it. We might need to re-run checkText
        // or accept that highlights might become slightly inaccurate relative to the *new* text.
        // For simplicity, we keep originalTextForIssues as is, meaning highlights refer
        // back to the text *before* the fix was applied.
        // OR: Clear results and force re-check?
        // setOriginalTextForIssues(currentText); // Option: Update original text (might break existing highlights)
        // setShowResults(false); // Option: Force re-check

    }, [inputText]); // Depends on current inputText

    const acceptSuggestion = useCallback((issueId: number) => {
        const issueToFix = issues.find(i => i.id === issueId && !i.fixed);
        if (issueToFix) {
            applyFixesToInputText([issueToFix]);
        }
    }, [issues, applyFixesToInputText]);

    const fixAllIssues = useCallback(() => {
        const issuesToFix = issues.filter(i => !i.fixed);
        if (issuesToFix.length > 0) {
            applyFixesToInputText(issuesToFix);
        }
    }, [issues, applyFixesToInputText]);


    // --- TTS Methods ---
    const generateTTS = useCallback(async () => {
        if (ttsLoading || !inputText.trim() || !selectedVoice) return;
        if (!apiConfig.apiKey || !apiConfig.apiUrl) {
            setTtsError('请先在上方设置 API URL 和 Key。');
            return;
        }

        setTtsLoading(true);
        setTtsError(null);
        setAudioUrl(null); // Clear previous audio

        // Revoke previous blob URL if it exists
        if (audioUrl && audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
        }

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
                    response_format: 'mp3' // Or other format supported by API
                }),
            });

            if (!response.ok) {
                 let errorMsg = `TTS API 请求失败: ${response.status} ${response.statusText}`;
                 try {
                     const errorData = await response.json();
                     errorMsg += `. ${errorData.error?.message || JSON.stringify(errorData)}`;
                 } catch (e) { /* Ignore if response is not JSON */ }
                 throw new Error(errorMsg);
            }

            const audioBlob = await response.blob();
            if (audioBlob.size === 0) {
                throw new Error('TTS API 返回了空的音频文件。');
            }
            // Create a URL for the blob
            const newAudioUrl = URL.createObjectURL(audioBlob);
            setAudioUrl(newAudioUrl);

        } catch (error: any) {
            console.error('TTS 生成出错:', error);
            setTtsError(error.message || '生成语音时发生未知错误');
            setAudioUrl(null);
        } finally {
            setTtsLoading(false);
        }
    }, [ttsLoading, inputText, selectedVoice, audioUrl, apiConfig]); // Include audioUrl to revoke previous

    // --- Image Generation Methods ---
    const generateCoverImage = useCallback(async () => {
        if (imageGenLoading || !inputText.trim()) return;
        if (!apiConfig.apiKey || !apiConfig.apiUrl) {
            setImageGenError('图像生成 API URL 或 Key 未配置。');
            return;
        }

        setImageGenLoading(true);
        setImageGenError(null);
        setImageUrl(null); // Clear previous image

        try {
            // Create a prompt for the image API
            const textSnippet = inputText.substring(0, 80); // Use a slightly longer snippet
            const imagePrompt = `为一篇关于 "${textSnippet}..." 的文章生成一个吸引人的封面插图，风格现代、简洁、色彩明亮。`;
            const imageUrl = apiConfig.apiUrl.replace(/chat\/completions$/, 'images/generations');

            const response = await fetch(imageUrl, {
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
                    response_format: "b64_json", // Request base64
                    seed: Math.floor(Math.random() * 10000), // Random seed
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

            if (data.data && data.data[0] && data.data[0].b64_json) {
                 setImageUrl(`data:image/png;base64,${data.data[0].b64_json}`);
            } else if (data.data && data.data[0] && data.data[0].url) {
                 // Fallback if API returns URL instead
                 setImageUrl(data.data[0].url);
            }
            else {
                throw new Error('图像生成 API 响应格式无效或缺少图像数据。');
            }

        } catch (error: any) {
            console.error('图像生成出错:', error);
            setImageGenError(error.message || '生成图像时发生未知错误');
            setImageUrl(null);
        } finally {
            setImageGenLoading(false);
        }
    }, [imageGenLoading, inputText, apiConfig]);

    // --- Lifecycle Hooks ---
    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (audioUrl && audioUrl.startsWith('blob:')) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    // --- Render ---
    return (
        <div className="container mx-auto">
            {/* API 设置部分 */}
            <ApiSettingBlock setApiConfig={setApiConfig} />

            {/* Input Area */}
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
                        onChange={(e) => {
                            setInputText(e.target.value);
                            // If user types, maybe clear results? Or let them keep editing.
                            // setShowResults(false);
                            // setIssues([]);
                        }}
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

                {/* File Upload Area */}
                <div>
                    <div
                        className="flex items-center border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors cursor-pointer"
                        onClick={handleFileSelect}
                    >
                        <input
                            type="file"
                            id="fileUploadInput"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".txt,.doc,.docx,.md,.markdown,.rtf,.text"
                            className="hidden"
                        />
                        {!uploadedFileName && !isProcessingFile && (
                            <div className="text-gray-500 w-full">
                                <FaCloudUploadAlt className="text-2xl mb-2 mx-auto" />
                                <p>点击或拖拽文件到此处</p>
                                <p className="text-xs mt-1">支持TXT, DOC, DOCX, MD等</p>
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
                                 {/* Keep placeholder visible */}
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

            {/* Loading Indicator during checkText */}
            {isLoading && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <div className="flex items-center justify-center py-12">
                        <div className="loading-spinner mr-3"></div>
                        <span className="text-gray-600">正在校对中，请稍候...</span>
                    </div>
                </div>
            )}

            {/* API Error Message */}
            {apiError && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded-lg shadow-md" role="alert">
                    <p className="font-bold">校对出错</p>
                    <p>{apiError}</p>
                </div>
            )}

            {/* Result Area */}
            {showResults && !isLoading && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <div className="flex items-center mb-4">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                            <FaCheck className="text-green-500" />
                        </div>
                        <h2 className="text-xl font-semibold">校对结果</h2>
                        {unfixedIssuesCount > 0 && (
                            <div className="ml-auto">
                                <button
                                    onClick={fixAllIssues}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center"
                                >
                                    <FaMagic className="mr-2" />
                                    一键修复全部 ({unfixedIssuesCount})
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        {/* Result Summary */}
                        {issues.length > 0 ? (
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <FaLightbulb className="text-yellow-500" />
                                    </div>
                                    <div className="ml-3">
                                        {unfixedIssuesCount > 0 ? (
                                            <p className="text-sm text-yellow-700">
                                                共发现 <span className="font-medium">{issues.length}</span> 个问题，还有 <span className="font-medium">{unfixedIssuesCount}</span> 个待处理。
                                                将鼠标悬停在下方带<span className="highlighted px-1 mx-1">高亮</span>的文本上查看并接受修改建议。
                                            </p>
                                        ) : (
                                            <p className="text-sm text-green-700">
                                                <FaCheckCircle className="inline-block mr-1" /> 太棒了！所有问题都已修复。最终文本已更新到上方输入框。您现在可以进行语音合成或封面生成。
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <FaCheckCircle className="text-green-500" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-green-700">
                                            未发现明显问题。您可以直接进行语音合成或封面生成。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Result Text with Highlights */}
                        <div id="result-text-area" className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 min-h-[150px] mb-6">
                            {resultSegments.map((segment) => (
                                segment.type === 'text' ? (
                                    <span key={segment.content}>{segment.content}</span>
                                ) : (
                                    <span
                                        key={segment.issue!.id} // Use issue ID for key
                                        className={`highlighted ${segment.issue!.fixed ? 'fixed-issue' : ''}`}
                                        data-issue-id={segment.issue!.id}
                                    >
                                        {segment.content}
                                        {!segment.issue!.fixed && (
                                            <div className="suggestion-popup">
                                                <div className="font-medium text-red-600 mb-1">问题：{segment.issue!.reason}</div>
                                                <div className="mb-2">建议修改为：<span className="font-medium text-green-600">{segment.issue!.suggestion}</span></div>
                                                <button
                                                    onClick={() => acceptSuggestion(segment.issue!.id)}
                                                    className="accept-suggestion bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
                                                >
                                                    接受建议
                                                </button>
                                            </div>
                                        )}
                                    </span>
                                )
                            ))}
                             {/* Show current text if no segments (e.g., during initial load before results) */}
                             {resultSegments.length === 0 && inputText}
                        </div>

                        {/* Suggestions List */}
                        {issues.length > 0 && (
                            <details className="mt-6 mb-6">
                                <summary className="cursor-pointer text-gray-600 hover:text-blue-600">
                                    <FaListUl className="inline-block mr-1" /> 查看/隐藏 问题列表 ({issues.length})
                                </summary>
                                <div className="mt-3 border border-gray-200 rounded-lg divide-y divide-gray-200">
                                    {issues.map((issue, index) => (
                                        <div key={issue.id} className={`p-3 hover:bg-gray-50 ${issue.fixed ? 'bg-green-50' : ''}`}>
                                            <div className="flex items-start">
                                                {!issue.fixed ? (
                                                    <span className="bg-yellow-100 text-yellow-800 font-medium text-xs px-2 py-0.5 rounded-full mr-2 whitespace-nowrap">问题 {index + 1}</span>
                                                ) : (
                                                    <span className="bg-green-100 text-green-800 font-medium text-xs px-2 py-0.5 rounded-full mr-2 whitespace-nowrap">已修复</span>
                                                )}
                                                <div className="flex-1">
                                                    <p className={`mb-1 text-sm ${issue.fixed ? 'text-gray-500' : 'text-red-600'}`}>{issue.reason}</p>
                                                    <div className="flex items-center text-xs">
                                                        <span className="line-through mr-2 text-gray-400">{issue.original}</span>
                                                        <FaArrowRight className="text-gray-400 mr-2" />
                                                        <span className="font-medium text-green-600">{issue.suggestion}</span>
                                                    </div>
                                                </div>
                                                {!issue.fixed ? (
                                                    <button
                                                        onClick={() => acceptSuggestion(issue.id)}
                                                        className="accept-suggestion-list bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs ml-2 flex-shrink-0"
                                                    >
                                                        接受
                                                    </button>
                                                ) : (
                                                    <div className="ml-2 flex-shrink-0">
                                                        <FaCheckCircle className="text-green-500" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            )}

            {/* Output Generation Section */}
            {!isLoading && ( // Show only when not proofreading
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <div className="flex items-center mb-6">
                        {/* Icon changed as config is removed */}
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                            <FaPlay className="text-purple-500" />
                        </div>
                        <h2 className="text-xl font-semibold">内容生成</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* TTS Section */}
                        <div>
                            <h3 className="text-lg font-medium mb-3 text-gray-800 flex items-center"><FaVolumeUp className="mr-2 text-green-500" />文本转语音</h3>
                            <div className="space-y-3">
                                <div>
                                    <select
                                        id="voiceSelect"
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
                                    {ttsLoading ? (
                                        <span className="loading-spinner mr-2 border-top-color-white"></span>
                                    ) : (
                                        <FaPlay className="mr-2" />
                                    )}
                                    {ttsLoading ? '生成中...' : '生成语音'}
                                </button>
                                {ttsError && (
                                    <div className="text-red-600 text-sm mt-2"><FaExclamationCircle className="inline-block mr-1" />{ttsError}</div>
                                )}
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
                            {/* Preset Voice Upload Section Removed */}
                        </div>

                        {/* Cover Image Section */}
                        <div>
                            <h3 className="text-lg font-medium mb-3 text-gray-800 flex items-center"><FaImage className="mr-2 text-yellow-500" />封面图生成</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={generateCoverImage}
                                    disabled={imageGenLoading || !inputText.trim()}
                                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {imageGenLoading ? (
                                        <span className="loading-spinner mr-2 border-top-color-white"></span>
                                    ) : (
                                        <FaPaintBrush className="mr-2" />
                                    )}
                                    {imageGenLoading ? '生成中...' : '生成封面图'}
                                </button>
                                {imageGenError && (
                                    <div className="text-red-600 text-sm mt-2"><FaExclamationCircle className="inline-block mr-1" />{imageGenError}</div>
                                )}
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
                    </div>
                </div>
            )}

            {/* About Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-1">
                <div className="flex items-center mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                        <FaInfoCircle className="text-gray-500" />
                    </div>
                    <h2 className="text-xl font-semibold">关于助手</h2>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700"> {/* Use prose-sm for smaller text */}
                    <p className="mb-3">本工具集成了文章校对、文本转语音 (TTS) 和封面图生成功能，旨在帮助内容创作者提高效率。</p>
                    <ul className="list-disc pl-5 mb-4 space-y-1">
                        <li><strong>校对:</strong> 检查错别字、语法、标点等，提供修改建议。</li>
                        <li><strong>文本转语音:</strong> 将校对后的文本转换为语音，支持选择不同音色。</li>
                        <li><strong>封面图:</strong> 根据文章内容（或摘要）生成匹配的封面图片。</li>
                    </ul>
                    {/* <p className="text-xs text-gray-500 mb-0">API配置已在此版本中移除。功能依赖于预设的API端点。请确保遵守各API服务提供商的使用条款。</p> */}
                </div>
            </div>

            {/* <footer className="mt-8 text-center text-gray-500 text-sm py-2"><p>Copyright by AsnLee</p></footer> */}
        </div>
    );
}
