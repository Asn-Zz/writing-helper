import React from 'react';
import { FaEdit, FaFileExport, FaLink, FaTrash, FaUpload } from 'react-icons/fa';
import { useLocalStorage } from '@/app/lib/store';

export interface ArticleItem {
    id: string;
    title: string;
    content: string;
}

interface ArticleListProps {
    setArticles: (articles: string[]) => void;
    exportArticle: (article: ArticleItem) => void;
}

function ArticleList({ setArticles: setArticlesProp, exportArticle }: ArticleListProps) {
    const [articles, setArticles] = useLocalStorage<ArticleItem[]>('writing_articles', []);
    const [selectedArticles, setSelectedArticles] = React.useState<ArticleItem[]>([]);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editTitle, setEditTitle] = React.useState('');
    const [editContent, setEditContent] = React.useState('');

    const selectArticle = (article: ArticleItem) => {
        const newSelectedArticles = selectedArticles.includes(article) ? selectedArticles.filter(a => a.id !== article.id) : [...selectedArticles, article];
        setSelectedArticles(newSelectedArticles);
        setArticlesProp([...newSelectedArticles.map(a => a.title + '\n' + a.content)]);
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files?.length) return;

        const newArticles: ArticleItem[] = [];
        const handleFile = async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/file-upload', {
                method: 'POST',
                body: formData,
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'File upload failed');
            }
            
            const data = await response.json();
            newArticles.push({ id: Date.now().toString() + Math.random().toString(36).substr(2, 9), title: file.name, content: data.text });
        }

        await Promise.all([...files].map(handleFile));
        setArticles([...articles, ...newArticles]);
    };

    const handleDeleteArticle = (id: string) => {
        setArticles(articles.filter(article => article.id !== id));
    };

    const startEditing = (article: ArticleItem) => {
        setEditingId(article.id);
        setEditTitle(article.title);
        setEditContent(article.content);
    };

    const saveEdit = () => {
        if (editingId && editContent.trim()) {
            const handle = (a: ArticleItem) => a.id === editingId ? { ...a, title: editTitle.trim() || a.title, content: editContent.trim() } : a
            setArticles(articles.map(handle));
            setEditingId(null);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const handleEditArticle = (article: ArticleItem) => {
        startEditing(article);
    };

    return (
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center">
                <div className="text-lg font-semibold text-gray-800">
                    参考文章
                </div>
                <div className="flex gap-2">
                    <a href="https://changfengbox.top/wechat" target="_blank" className="flex gap-2">
                        <button
                            className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 py-1 px-2 rounded-md hover:bg-blue-200 disabled:opacity-50"
                        >
                            <FaLink size={12} />
                            文章下载
                        </button>
                    </a>

                    <div className="flex gap-2">
                        <button
                            className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 py-1 px-2 rounded-md hover:bg-blue-200 disabled:opacity-50"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FaUpload size={12} />
                            上传
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                    </div>
                </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-70 overflow-y-auto py-2">
                {articles.map((article) => (
                    <div
                        key={article.id}
                        className={`border border-gray-200 rounded-md p-3 hover:border-blue-300 hover:shadow-sm transition-all relative group ${selectedArticles.includes(article) ? 'bg-blue-50' : ''}`}
                        onClick={() => editingId !== article.id && selectArticle(article)}
                    >
                        {editingId === article.id ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="标题"
                                    className="w-full p-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    placeholder="文章内容"
                                    className="w-full p-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    rows={3}
                                />
                                <div className="flex justify-end gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            saveEdit();
                                        }}
                                        className="text-xs bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600"
                                    >
                                        保存
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            cancelEdit();
                                        }}
                                        className="text-xs bg-gray-500 text-white py-1 px-2 rounded hover:bg-gray-600"
                                    >
                                        取消
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-start">
                                    <h4 className="font-medium text-gray-900 text-sm mb-1 truncate" title={article.title}>
                                        {article.title}
                                    </h4>
                                </div>
                                <p
                                    className="text-sm text-gray-700 cursor-pointer line-clamp-2"
                                    onClick={() => selectArticle(article)}
                                    title={article.content}
                                >
                                    {article.content}
                                </p>

                                <div className="absolute z-10 bottom-1 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditArticle(article);
                                        }}
                                        className="text-blue-500 hover:text-blue-700"
                                        title="编辑"
                                    >
                                        <FaEdit size={12} />
                                    </button>

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            exportArticle(article);
                                        }}
                                        className="text-blue-500 hover:text-blue-700"
                                        title="导出"
                                    >
                                        <FaFileExport size={12} />
                                    </button>

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteArticle(article.id);
                                        }}
                                        className="text-red-500 hover:text-red-700"
                                        title="删除"
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ArticleList;
