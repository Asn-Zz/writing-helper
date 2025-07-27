"use client"; // Required for useState, useEffect, event handlers

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { FaCopy, FaEdit, FaTrash, FaMagic } from 'react-icons/fa'; // Import necessary icons
import { useApiSettings } from '@/app/components/ApiSettingsContext';
import { generate } from '@/app/lib/api';

// Define the structure for a comment
interface Comment {
    id: number;
    title: string;
    content: string;
    isEditing: boolean;
    editingTitle: string;
    editingContent: string;
}

// Define the structure for generation settings
interface GenerationSettings {
    topic: string;
    author: string;
    description: string;
    mantra: string;
    showMantra: boolean;
    selectedCommentType: string;
    customCommentType: string;
    selectedResponseStyle: string;
    customResponseStyle: string;
    commentLength: string;
    commentCount: number;
}

// Static data (can be moved outside the component if preferred)
const typeDesc: Record<string, string> = {
    'general': '普通评论', 'product': '产品评测', 'movie': '影视评论', 'book': '书籍点评',
    'news': '新闻评论', 'tech': '科技分析', 'food': '美食点评', 'travel': '旅行体验',
    'game': '游戏评测', 'music': '音乐评论'
};
const styleDesc: Record<string, string> = {
    'professional': '专业分析', 'normal': '正常评价', 'casual': '随意吐槽',
    'positive': '正面积极', 'negative': '负面批评', 'humorous': '幽默诙谐',
    'sarcastic': '讽刺挖苦', 'academic': '学术严谨'
};
const lengthGuide: Record<string, string> = {
    'short': '约50字', 'medium': '约150字',
    'long': '约300字', 'detailed': '约500字以上'
};

export default function CommentEditorPage() {
    // --- State ---
    const [generationSettings, setGenerationSettings] = useState<GenerationSettings>({
        topic: '',
        author: '',
        description: '',
        mantra: '',
        showMantra: false,
        selectedCommentType: 'general',
        customCommentType: '',
        selectedResponseStyle: 'normal',
        customResponseStyle: '',
        commentLength: 'medium',
        commentCount: 3,
    });
    const [results, setResults] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [notification, setNotification] = useState('');
    const notificationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // API 设置状态
    const { apiConfig } = useApiSettings();

    // --- Event Handlers ---
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        setGenerationSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
                   type === 'number' ? parseInt(value, 10) || 1 : // Ensure number type for count
                   value
        }));
    };

    const showNotification = (message: string) => {
        setNotification(message);
        if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
        }
        notificationTimeoutRef.current = setTimeout(() => {
            setNotification('');
            notificationTimeoutRef.current = null;
        }, 3000);
    };

    const showError = (message: string) => {
        setErrorMessage(message);
    };

    // --- Generation Logic ---
    const generateComments = async (e: FormEvent) => {
        e.preventDefault(); // Prevent default form submission if wrapped in form

        // Basic Validations
        if (!generationSettings.topic) {
            showError('请输入评论主题'); return;
        }
        const count = generationSettings.commentCount;
        if (count < 1 || count > 10) {
            showError('生成数量必须在1-10之间'); return;
        }
        if (generationSettings.selectedCommentType === '__custom__' && !generationSettings.customCommentType.trim()) {
            showError('请输入自定义评论类型'); return;
        }
        if (generationSettings.selectedResponseStyle === '__custom__' && !generationSettings.customResponseStyle.trim()) {
            showError('请输入自定义回答风格'); return;
        }

        setIsLoading(true);
        setErrorMessage('');
        setResults([]); // Clear previous results

        // Determine final type and style
        const finalCommentType = generationSettings.selectedCommentType === '__custom__'
            ? generationSettings.customCommentType.trim() || '自定义类型'
            : typeDesc[generationSettings.selectedCommentType] || generationSettings.selectedCommentType;

        const finalResponseStyle = generationSettings.selectedResponseStyle === '__custom__'
            ? generationSettings.customResponseStyle.trim() || '自定义风格'
            : styleDesc[generationSettings.selectedResponseStyle] || generationSettings.selectedResponseStyle;

        const systemPrompt = `你是一位优秀的评论员。请针对用户提供的主题和描述，生成 ${count} 条不同的评论。
要求：
1.  每条评论都需要包含标题（title）和内容（content）。
2.  评论类型：${finalCommentType}。
3.  评论风格：${finalResponseStyle}${generationSettings.mantra && generationSettings.showMantra ? '， 口语化词语：' + generationSettings.mantra : ''}。
4.  每条评论长度大致为：${lengthGuide[generationSettings.commentLength]}。
5.  语言自然流畅，符合中文表达习惯，观点鲜明。
要求返回一个JSON数组，不要包含任何额外的解释或标记，每个元素包含以下字段：
- "title": 标题
- "content": 内容
`;
        const userPrompt = `主题：${generationSettings.topic}
${generationSettings.author ? '来源：' + generationSettings.author : ''}
${generationSettings.description ? '描述：' + generationSettings.description : ''}
请生成 ${count} 条评论。`;

        const requestBody = {
            ...apiConfig,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 1,
            stream: false
            // response_format: { type: "json_object" } // Consider adding if model supports reliably
        };

        // --- API Call ---
        try {
            const data = await generate(requestBody)
            const parsedResults = JSON.parse(data.content);

            if (!Array.isArray(parsedResults)) {
              throw new Error('API 未返回有效的评论数组');
            }

            const formattedResults: Comment[] = parsedResults
                .filter(item => item && typeof item.title === 'string' && typeof item.content === 'string')
                .map((item, index) => ({
                    id: Date.now() + index, // Simple unique ID
                    title: item.title,
                    content: item.content,
                    isEditing: false,
                    editingTitle: '',
                    editingContent: ''
                }));

            setResults(formattedResults);

            if (formattedResults.length === 0 && parsedResults.length > 0) {
                throw new Error('API 返回的评论对象结构不符合预期 (缺少 title 或 content)');
            }
            if (formattedResults.length < count) {
                showNotification(`成功生成 ${formattedResults.length} 条评论 (目标 ${count} 条)`);
            }

        } catch (error) {
          console.error('生成评论时出错:', error);
          setResults([]); // Clear results on error
        } finally {
          setIsLoading(false);
        }
    };

    // --- Result Handling ---
    const copyComment = (comment: Comment) => {
        const textToCopy = `${comment.title || ''}\n\n${comment.content}`;
        navigator.clipboard.writeText(textToCopy)
            .then(() => showNotification('评论已复制'))
            .catch(err => {
                console.error('复制失败:', err);
                showNotification('复制失败');
            });
    };

    const editComment = (id: number) => {
        setResults(prevResults =>
            prevResults.map(comment =>
                comment.id === id
                    ? { ...comment, isEditing: true, editingTitle: comment.title, editingContent: comment.content }
                    : { ...comment, isEditing: false } // Close other editors
            )
        );
    };

    const saveEdit = (id: number) => {
        setResults(prevResults =>
            prevResults.map(comment =>
                comment.id === id
                    ? { ...comment, title: comment.editingTitle.trim(), content: comment.editingContent.trim(), isEditing: false }
                    : comment
            )
        );
        showNotification('评论已更新');
    };

    const cancelEdit = (id: number) => {
        setResults(prevResults =>
            prevResults.map(comment =>
                comment.id === id ? { ...comment, isEditing: false } : comment
            )
        );
    };

    const deleteComment = (id: number, title: string) => {
        const titleToDelete = title || `评论 ID ${id}`;
        if (window.confirm(`确定要删除 "${titleToDelete}" 吗？`)) {
            setResults(prevResults => prevResults.filter(comment => comment.id !== id));
            showNotification('评论已删除');
        }
    };

    // --- Cleanup timeout on unmount ---
    useEffect(() => {
        return () => {
            if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
            }
        };
    }, []);

    // --- Render ---
    return (
        <div className="container mx-auto min-h-screen">           
            <main>
                {/* Generation Settings Card */}
                <div className="card bg-white rounded-lg p-6 mb-6 shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">生成设置</h2>
                    <form onSubmit={generateComments}> {/* Wrap in form for potential Enter key submission */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="topic">
                                    主题 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="topic"
                                    name="topic"
                                    type="text"
                                    value={generationSettings.topic}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    placeholder="例如：活着"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="author">
                                    来源 (可选)
                                </label>
                                <input
                                    id="author"
                                    name="author"
                                    type="text"
                                    value={generationSettings.author}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    placeholder="如：余华"
                                />
                            </div>
                        </div>

                        <div className="my-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                                描述 (可选)
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={generationSettings.description}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                rows={4}
                                placeholder="活着是最有力量的词语"
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Custom Select for Comment Type */}
                            <div className="custom-select-wrapper">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="commentTypeSelect">
                                    评论类型
                                </label>
                                <select
                                    id="commentTypeSelect"
                                    name="selectedCommentType"
                                    value={generationSettings.selectedCommentType}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    {Object.entries(typeDesc).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
                                    <option value="__custom__">自定义...</option>
                                </select>
                                {generationSettings.selectedCommentType === '__custom__' && (
                                    <input
                                        type="text"
                                        name="customCommentType"
                                        value={generationSettings.customCommentType}
                                        onChange={handleInputChange}
                                        placeholder="输入自定义评论类型"
                                        className="custom-select-input mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        required // Make required if custom is selected
                                    />
                                )}
                            </div>

                            {/* Custom Select for Response Style */}
                            <div className="custom-select-wrapper">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="responseStyleSelect">
                                    回答风格
                                </label>
                                <select
                                    id="responseStyleSelect"
                                    name="selectedResponseStyle"
                                    value={generationSettings.selectedResponseStyle}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    {Object.entries(styleDesc).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
                                    <option value="__custom__">自定义...</option>
                                </select>
                                {generationSettings.selectedResponseStyle === '__custom__' && (
                                    <input
                                        type="text"
                                        name="customResponseStyle"
                                        value={generationSettings.customResponseStyle}
                                        onChange={handleInputChange}
                                        placeholder="输入自定义回答风格"
                                        className="custom-select-input mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        required // Make required if custom is selected
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="commentLength">
                                    评论长度
                                </label>
                                <select
                                    id="commentLength"
                                    name="commentLength"
                                    value={generationSettings.commentLength}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    {Object.entries(lengthGuide).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="commentCount">
                                    生成数量 (1-10)
                                </label>
                                <input
                                    id="commentCount"
                                    name="commentCount"
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={generationSettings.commentCount}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required
                                />
                            </div>
                        </div>

                        <div className="my-4">
                            <div className="flex items-center mb-2">
                                <input
                                    id="showMantra"
                                    name="showMantra"
                                    type="checkbox"
                                    checked={generationSettings.showMantra}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label className="block text-gray-700 text-sm font-bold ml-2" htmlFor="showMantra">
                                    口语化词语 (可选)
                                </label>
                            </div>

                            {generationSettings.showMantra && (
                                <textarea
                                    id="mantra"
                                    name="mantra"
                                    value={generationSettings.mantra}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    rows={4}
                                    placeholder="yyds"
                                ></textarea>
                            )}
                        </div>

                        <div className="mt-6 flex justify-center">
                            <button
                                type="submit" // Changed to type="submit"
                                disabled={isLoading || !generationSettings.topic} // Removed API key check
                                className="btn btn-primary text-lg px-8 py-3 w-full md:w-1/2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-md transition duration-300 flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                   <FaMagic className="mr-2" />
                                )}
                                {isLoading ? '生成中...' : '生成评论'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Generated Results */}
                <div className="mt-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">生成结果 ({results.length})</h2>

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="flex justify-center items-center py-10 transition-opacity duration-300 ease-in-out">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
                            <span className="ml-3 text-lg text-gray-700">AI 正在努力创作中...</span>
                        </div>
                    )}

                    {/* Error Message */}
                    {errorMessage && !isLoading && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded transition-opacity duration-300 ease-in-out">
                            <p><strong>生成出错：</strong></p>
                            <p className="whitespace-pre-wrap">{errorMessage}</p>
                        </div>
                    )}

                    {/* Results Grid */}
                    {!isLoading && results.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {results.map((comment) => (
                                <div key={comment.id} className="comment-card bg-white rounded-lg p-4 shadow-md flex flex-col border-l-4 border-indigo-600 transition-shadow duration-300 hover:shadow-lg">
                                    {/* Edit Mode */}
                                    {comment.isEditing ? (
                                        <div className="flex-grow">
                                            <input
                                                type="text"
                                                value={comment.editingTitle}
                                                onChange={(e) => setResults(prev => prev.map(c => c.id === comment.id ? { ...c, editingTitle: e.target.value } : c))}
                                                placeholder="评论标题"
                                                className="w-full px-2 py-1 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-lg font-semibold"
                                            />
                                            <textarea
                                                value={comment.editingContent}
                                                onChange={(e) => setResults(prev => prev.map(c => c.id === comment.id ? { ...c, editingContent: e.target.value } : c))}
                                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400 text-sm text-gray-700"
                                                rows={6}
                                            ></textarea>
                                        </div>
                                    ) : (
                                        /* View Mode */
                                        <div className="flex-grow">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2">{comment.title || `评论 ${comment.id}`}</h3>
                                            <p className="text-sm text-gray-700 whitespace-pre-line">{comment.content}</p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="mt-3 pt-3 border-t border-gray-200 text-right space-x-2">
                                        {comment.isEditing ? (
                                            <>
                                                <button onClick={() => saveEdit(comment.id)} className="btn btn-primary btn-sm text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded inline-flex items-center" title="保存">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-3 w-3 mr-1 fill-current">
                                                        {/* Font Awesome Save SVG Path */}
                                                        <path d="M433.9 129.9l-83.9-83.9A48 48 0 00316.1 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V163.9a48 48 0 00-14.1-33.9zM224 416c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64zm96-304.5H96V128h224v-16.5z"/>
                                                    </svg>
                                                    保存
                                                </button>
                                                <button onClick={() => cancelEdit(comment.id)} className="btn btn-secondary btn-sm text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded inline-flex items-center" title="取消">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="h-3 w-3 mr-1 fill-current">
                                                        {/* Font Awesome Times/Close SVG Path */}
                                                        <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
                                                    </svg>
                                                    取消
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => copyComment(comment)} className="btn btn-sm text-xs text-indigo-600 hover:text-indigo-800 px-1 py-1 rounded inline-flex items-center" title="复制">
                                                    <FaCopy />
                                                    <span className="ml-1">复制</span>
                                                </button>
                                                <button onClick={() => editComment(comment.id)} className="btn btn-sm text-xs text-blue-600 hover:text-blue-800 px-1 py-1 rounded inline-flex items-center" title="编辑">
                                                    <FaEdit />
                                                    <span className="ml-1">编辑</span>
                                                </button>
                                                <button onClick={() => deleteComment(comment.id, comment.title)} className="btn btn-sm text-xs text-red-600 hover:text-red-800 px-1 py-1 rounded inline-flex items-center" title="删除">
                                                    <FaTrash />
                                                    <span className="ml-1">删除</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No Results Placeholder */}
                    {!isLoading && results.length === 0 && !errorMessage && (
                        <div className="text-center text-gray-500 py-10">
                            暂无评论，请设置参数后点击生成。
                        </div>
                    )}
                </div>
            </main>

            {/* Notification Area */}
            {notification && (
                 <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-md shadow-lg z-50 transition-opacity duration-300 ease-in-out">
                    {notification}
                </div>
            )}
        </div>
    );
}