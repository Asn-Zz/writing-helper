import React, { useState } from 'react';
import { FaEdit, FaFileExport, FaLink, FaTrash, FaUpload, FaFolder, FaPlus, FaAngleUp, FaAngleDown, FaSpinner } from 'react-icons/fa';
import { useLocalStorage } from '@/app/lib/store';
import { getIsAuthed } from '@/app/lib/auth';

export interface ArticleItem {
    id: string;
    title: string;
    content: string;
    groupId: string;
}

export interface GroupItem {
    id: string;
    name: string;
}

interface ArticleListProps {
    setArticles: (articles: string[]) => void;
    exportArticle: (article: ArticleItem) => void;
}

function ArticleList({ setArticles: setArticlesProp, exportArticle }: ArticleListProps) {
    const [isShow, setIsShow] = React.useState(false);
    const [articles, setArticles] = useLocalStorage<ArticleItem[]>('writing_articles', []);
    const [groups, setGroups] = useLocalStorage<GroupItem[]>('writing_groups', [{ id: '', name: '默认' }]);
    const [selectedArticles, setSelectedArticles] = React.useState<ArticleItem[]>([]);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editTitle, setEditTitle] = React.useState('');
    const [editContent, setEditContent] = React.useState('');
    const [draggedItem, setDraggedItem] = React.useState<{id: string, type: 'article' | 'group'} | null>(null);

    const selectArticle = (article: ArticleItem) => {
        const newSelectedArticles = selectedArticles.includes(article) ? selectedArticles.filter(a => a.id !== article.id) : [...selectedArticles, article];
        setSelectedArticles(newSelectedArticles);
        setArticlesProp([...newSelectedArticles.map(a => a.title + '\n' + a.content)]);
    };

    const selectGroup = (group: GroupItem, styleArticle: ArticleItem) => {        
        const newSelectedArticles = articles.filter(a => a.groupId === group.id && a.id !== styleArticle.id);
        setSelectedArticles(newSelectedArticles);
        setArticlesProp([...newSelectedArticles.map(a => a.title + '\n' + a.content)]);

        exportArticle(styleArticle);
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
            const item = { id: Date.now().toString(), groupId: '', title: file.name, content: data.text };
            newArticles.push(item);
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

    const handleDragStart = (e: React.DragEvent, id: string, type: 'article' | 'group') => {
        e.dataTransfer.setData('text/plain', id);
        setDraggedItem({ id, type });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetId: string, targetType: 'article' | 'group') => {
        e.preventDefault();

        if (!draggedItem) return;

        if (draggedItem.type === 'article' && targetType === 'article') {
            const draggedArticle = articles.find(a => a.id === draggedItem.id);
            const targetArticle = articles.find(a => a.id === targetId);
            
            if (draggedArticle && targetArticle) {
                if (draggedArticle.groupId !== targetArticle.groupId) {
                    const updatedArticles = articles.map(article => 
                        article.id === draggedItem.id ? {...article, groupId: targetArticle.groupId} : article
                    );
                    setArticles(updatedArticles);
                } 
                else {
                    // Create a copy of the articles array
                    const newArticles = [...articles];
                    const draggedIndex = newArticles.findIndex(a => a.id === draggedItem.id);
                    const targetIndex = newArticles.findIndex(a => a.id === targetId);
                    
                    if (draggedIndex !== -1 && targetIndex !== -1) {
                        const [movedArticle] = newArticles.splice(draggedIndex, 1);
                        const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
                        
                        newArticles.splice(adjustedTargetIndex, 0, movedArticle);                        
                        setArticles(newArticles);
                    }
                }
            }
        }
        else if (draggedItem.type === 'article' && targetType === 'group') {
            const updatedArticles = articles.map(article => 
                article.id === draggedItem.id ? {...article, groupId: targetId} : article
            );
            setArticles(updatedArticles);
        }
        
        setDraggedItem(null);
    };

    // Group functions
    const [editingGroupId, setEditingGroupId] = React.useState<string | null>(null);
    const [editGroupName, setEditGroupName] = React.useState('');

    const addGroup = () => {
        const newGroup: GroupItem = {
            id: 'group_' + Date.now().toString(),
            name: `分组 ${groups.length + 1}`
        };
        setGroups([...groups, newGroup]);
    };

    const deleteGroup = (id: string) => {
        setGroups(groups.filter(group => group.id !== id));
        setArticles(articles.map(article => 
            article.groupId === id ? {...article, groupId: ''} : article
        ));
    };

    const startEditingGroup = (group: GroupItem) => {
        setEditingGroupId(group.id);
        setEditGroupName(group.name);
    };

    const saveEditGroup = () => {
        if (editingGroupId && editGroupName.trim()) {
            setGroups(groups.map(group => 
                group.id === editingGroupId ? {...group, name: editGroupName.trim()} : group
            ));
            setEditingGroupId(null);
        }
    };

    const cancelEditGroup = () => {
        setEditingGroupId(null);
    };

    const clearArticles = () => {
        if (window.confirm('确定要清空参考文章吗？')) {
            setArticles([]);
            setGroups([{ id: '', name: '默认' }]);
        }
    };

    const pathJson = 'tmp/articles.json';
    const [loading, setLoading] = useState(false);  
    const syncArticles = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_CDN_URL}/${pathJson}`);
            const data = await response.json();
            setArticles(data);

            const groupNames = new Set(data.map((article: ArticleItem) => article.groupId));
            const groups = Array.from(groupNames).sort().map((id, index) => ({ id, name: id ? `分组 ${index}` : '默认' })) as GroupItem[];
            setGroups(groups);
        } catch (error) {
            console.error('Failed to sync articles:', error);
        }

        setLoading(false);
    }

    const uploadArticles = async () => {
        if (getIsAuthed() && window.confirm('确定要上传参考文章吗？')) {
            const formData = new FormData();
            const file = new File([JSON.stringify(articles)], pathJson.split('/').pop() || '', { type: 'application/json' });
            formData.append('file', file);
            const response = await fetch(`/api/cos-upload/${pathJson}`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error(`Failed to upload json: ${response.status} ${response.statusText}`);
            }
    
            syncArticles();
        }
    };

    return (
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center">
                <div className="text-lg font-semibold text-gray-800">
                    参考文章
                    {isShow && articles.length > 0 ? (
                        <div className="inline-flex gap-2 ml-2">
                            <span className="text-xs text-red-500 cursor-pointer" onClick={clearArticles}>(清空)</span>
                            <span className="text-xs text-blue-500 cursor-pointer" onClick={syncArticles}>(同步)</span>
                            <span className="text-xs text-blue-500 cursor-pointer" onClick={uploadArticles}>(上传)</span>
                        </div>
                    ): (
                        <div className="inline-flex gap-2 ml-2">
                            <span className="text-xs text-blue-500 cursor-pointer">({articles.length})</span>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {isShow ? (
                        <>
                            <button
                                className="flex items-center gap-1 text-sm bg-purple-100 text-purple-700 py-1 px-2 rounded-md hover:bg-purple-200 disabled:opacity-50"
                                onClick={addGroup}
                            >
                                <FaPlus size={12} />新建分组
                            </button>

                            <button
                                className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 py-1 px-2 rounded-md hover:bg-blue-200 disabled:opacity-50"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FaUpload size={12} />上传文章
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                        </>
                    ) : (
                        <a href="https://changfengbox.top/wechat" target="_blank" className="flex gap-2">
                            <button className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 py-1 px-2 rounded-md hover:bg-blue-200 disabled:opacity-50">
                                <FaLink size={12} />下载文章
                            </button>
                        </a>
                    )}

                    <button
                        onClick={() => setIsShow(!isShow)}
                        className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 py-1 px-2 rounded-md hover:bg-blue-200"
                    >
                        {isShow ? <FaAngleUp size={14} /> : <FaAngleDown size={14} />}
                        {isShow ? '收起' : '展开'}
                    </button>
                </div>
            </div>

            {loading && (
                <div className="flex justify-center items-center gap-2 h-50 text-blue-500 text-sm border border-gray-200 rounded-md my-3">
                    <FaSpinner className="animate-spin" size={20} />加载中...
                </div>
            )}

            {/* Render groups first */}
            {isShow && groups.map((group) => {
                const groupArticles = articles.filter(article => article.groupId === group.id);
                const styleArticle = groupArticles.find(article => article.title.startsWith(group.name));

                return (
                    <div 
                        key={group.id} 
                        className="mt-4 border border-gray-200 rounded-md p-3"
                    >
                        <div 
                            className="flex justify-between items-center mb-2"
                            draggable
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, group.id, 'group')}
                        >
                            <div className="flex items-center">
                                <FaFolder className="text-yellow-500 mr-2" />
                                {editingGroupId === group.id ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={editGroupName}
                                            onChange={(e) => setEditGroupName(e.target.value)}
                                            className="text-sm border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            autoFocus
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                saveEditGroup();
                                            }}
                                            className="text-xs bg-blue-500 text-white py-0.5 px-1.5 rounded hover:bg-blue-600"
                                        >
                                            保存
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                cancelEditGroup();
                                            }}
                                            className="text-xs bg-gray-500 text-white py-0.5 px-1.5 rounded hover:bg-gray-600"
                                        >
                                            取消
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h3 
                                            className="font-medium text-gray-800 cursor-pointer"
                                            onClick={() => startEditingGroup(group)}
                                        >
                                            {group.name}
                                        </h3>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEditingGroup(group);
                                            }}
                                            className="text-blue-500 hover:text-blue-700 text-xs"
                                        >
                                            编辑
                                        </button>
                                        {styleArticle && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                selectGroup(group, styleArticle);
                                            }}
                                            className="text-blue-500 hover:text-blue-700 text-xs"
                                        >
                                            仿写
                                        </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => deleteGroup(group.id)}
                                className="text-red-500 hover:text-red-700 text-sm"
                            >
                                删除分组
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-70 overflow-y-auto py-1">
                            {groupArticles.map((article) => (
                                <div
                                    key={article.id}
                                    className={`border border-gray-200 rounded-md p-3 hover:border-blue-300 hover:shadow-sm transition-all relative group ${selectedArticles.includes(article) ? 'bg-blue-50' : ''}`}
                                    onClick={() => editingId !== article.id && selectArticle(article)}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, article.id, 'article')}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, article.id, 'article')}
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
            })}
{/* 
            <p onClick={() => setIsShow(!isShow)} className='text-xs cursor-pointer text-gray-500 text-center'>
                {isShow ? '隐藏' : '展开'}
            </p> */}

            {articles.length === 0 && groups.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                    暂无文章或分组，可以上传文件或创建新分组
                </div>
            )}
        </div>
    );
}

export default ArticleList;
