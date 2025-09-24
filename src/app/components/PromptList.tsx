"use client";

import { getIsAuthed } from '@/app/lib/auth';
import React, { useState, useEffect } from 'react';
import { FaTrash, FaCopy, FaPlus, FaAngleDown, FaAngleUp, FaEdit, FaSpinner } from 'react-icons/fa';

interface PromptItem {
  id: string;
  title: string;
  content: string;
  group?: string;
}

interface PromptListProps {
  onSelectPrompt?: (prompt: string) => void;
  currentPrompt?: string;
  group?: string;
}

export default function PromptList({ onSelectPrompt = () => {}, currentPrompt = '', group = '全部' }: PromptListProps) {
  const [isShow, setIsShow] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState(group);
  const pathJson = 'tmp/prompt.json';

  const getGroups = () => {
    const groups = [...new Set(prompts.map(p => p.group))];
    const allGroup = [{ label: '全部', value: prompts.length }];
    return allGroup.concat(groups.map((label = '') => ({ label, value: prompts.filter(p => p.group === label).length })));
  };

  const filteredPrompts = selectedGroup === '全部' ? prompts : prompts.filter(p => p.group === selectedGroup);

  useEffect(() => {
    try {
      const storedPrompts = localStorage.getItem('imageEditorPrompts');
      if (storedPrompts) {
        const parsedPrompts = JSON.parse(storedPrompts);
        if (Array.isArray(parsedPrompts) && parsedPrompts.length > 0 && typeof parsedPrompts[0] === 'string') {
          const upgradedPrompts = parsedPrompts.map((prompt: string, index: number) => ({
            id: Date.now().toString() + index,
            title: `提示词 ${index + 1}`,
            content: prompt,
            group: '默认'
          }));
          setPrompts(upgradedPrompts);
          localStorage.setItem('imageEditorPrompts', JSON.stringify(upgradedPrompts));
        } else {
          setPrompts(parsedPrompts);
        }
      }
    } catch (error) {
      console.error("Failed to load prompts from localStorage", error);
    }
  }, []);

  useEffect(() => {
    if (!prompts.length) return;
    try {
      localStorage.setItem('imageEditorPrompts', JSON.stringify(prompts));
    } catch (error) {
      console.error("Failed to save prompts to localStorage", error);
    }
  }, [prompts]);

  const handleAddPrompt = () => {
    if (newPrompt.trim()) {
      const isDuplicate = prompts.some(p => p.content === newPrompt.trim());
      if (!isDuplicate) {
        const newPromptItem: PromptItem = {
          id: Date.now().toString(),
          title: newTitle.trim() || `提示词 ${prompts.length + 1}`,
          content: newPrompt.trim(),
          group: selectedGroup.trim().replace('全部', '')
        };
        setPrompts(prev => [newPromptItem, ...prev]);
        setNewPrompt('');
        setNewTitle('');
      }
    }
  };

  const handleDeletePrompt = (id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
  };

  const handleUsePrompt = (content: string) => {
    onSelectPrompt(content);
  };

  const handleCopyPrompt = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleAddCurrentPrompt = () => {
    if (currentPrompt.trim()) {
      const isDuplicate = prompts.some(p => p.content === currentPrompt.trim());
      if (!isDuplicate) {
        const newPromptItem: PromptItem = {
          id: Date.now().toString(),
          title: `提示词 ${prompts.length + 1}`,
          content: currentPrompt.trim(),
          group: '默认'
        };
        setPrompts(prev => [newPromptItem, ...prev]);
      }
    }
  };

  const [loading, setLoading] = useState(false);
  const handleAddPromptListBySync = () => {
    if (loading) return;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_CDN_URL}/${pathJson}`)
      .then(response => response.json())
      .then(data => {
        if (data.length > 0) {
          setPrompts(data);
        }
      })
      .catch(error => {
        console.error('Failed to fetch prompt sync:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const startEditing = (prompt: PromptItem) => {
    setEditingId(prompt.id);
    setEditTitle(prompt.title);
    setEditContent(prompt.content);
    setEditGroup(prompt.group || '');
  };

  const saveEdit = () => {
    if (editingId && editContent.trim()) {
      setPrompts(prev => 
        prev.map(p => 
          p.id === editingId 
            ? { 
                ...p, 
                title: editTitle.trim() || p.title, 
                content: editContent.trim(),
                group: editGroup.trim() || undefined
              } 
            : p
        )
      );
      setEditingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const clearPrompts = () => {
    if (window.confirm('确定要清空提示词列表吗？')) {
      setPrompts([]);
      localStorage.removeItem('imageEditorPrompts');
    }
  };

  const syncPrompts = () => {
    if (window.confirm('确定要同步提示词列表吗？')) {
      handleAddPromptListBySync();
    }
  };

  const uploadPrompts = async () => {
    if (getIsAuthed() && window.confirm('确定要上传提示词列表吗？')) {
      const formData = new FormData();
      const file = new File([JSON.stringify(prompts)], pathJson.split('/').pop() || '', { type: 'application/json' });
      formData.append('file', file);
      const response = await fetch(`/api/cos-upload/${pathJson}`, {
          method: 'POST',
          body: formData,
      });
      if (!response.ok) {
        throw new Error(`Failed to upload json: ${response.status} ${response.statusText}`);
      }

      handleAddPromptListBySync();
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData("promptId", id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("promptId");
    
    if (draggedId !== targetId) {
      const draggedIndex = prompts.findIndex(p => p.id === draggedId);
      const targetIndex = prompts.findIndex(p => p.id === targetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newPrompts = [...prompts];
        const [draggedItem] = newPrompts.splice(draggedIndex, 1);
        newPrompts.splice(targetIndex, 0, draggedItem);
        setPrompts(newPrompts);
      }
    }
  };

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold text-gray-800">
          提示词列表
          {isShow && prompts.length > 0 ? (
            <div className="inline-flex gap-2 ml-2">
              <span className="text-xs text-red-500 cursor-pointer" onClick={clearPrompts}>(清空)</span>
              <span className="text-xs text-blue-500 cursor-pointer" onClick={syncPrompts}>(同步)</span>
              <span className="text-xs text-blue-500 cursor-pointer" onClick={uploadPrompts}>(上传)</span>
            </div>
          ): (
            <div className="inline-flex gap-2 ml-2">
              <span className="text-xs text-blue-500 cursor-pointer">({prompts.length})</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddCurrentPrompt}
            disabled={!currentPrompt.trim() || prompts.some(p => p.content === currentPrompt.trim())}
            className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 py-1 px-2 rounded-md hover:bg-blue-200 disabled:opacity-50"
          >
            <FaPlus size={12} />
            添加当前
          </button>
          <button
            onClick={() => setIsShow(!isShow)}
            className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 py-1 px-2 rounded-md hover:bg-blue-200"
          >
            {isShow ? <FaAngleUp size={14} /> : <FaAngleDown size={14} />}
            {isShow ? '收起' : '展开'}
          </button>
        </div>
      </div>

      {isShow && <div>
        <div className="flex flex-col md:flex-row gap-2 my-3">
          <select 
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            {getGroups().map((group) => (
              <option key={group.label} value={group.label}>{group.label || '未分组'}({group.value})</option>
            ))}
          </select>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="标题（可选）"
            className="flex-grow p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <input
            type="text"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="添加新提示词..."
            className="flex-grow p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPrompt()}
          />
          <button
            onClick={handleAddPrompt}
            disabled={!newPrompt.trim()}
            className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            添加
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center gap-2 h-50 text-blue-500 text-sm">
            <FaSpinner className="animate-spin" size={20} />加载中...
          </div>
        ) : filteredPrompts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-70 overflow-y-auto">
            {filteredPrompts.map((prompt) => (
              <div 
                key={prompt.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, prompt.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, prompt.id)}
                className="border border-gray-200 rounded-md p-3 hover:border-blue-300 hover:shadow-sm transition-all relative group cursor-move"
              >
                {editingId === prompt.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="标题"
                      className="w-full p-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={editGroup}
                      onChange={(e) => setEditGroup(e.target.value)}
                      placeholder="分组"
                      className="w-full p-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="提示词内容"
                      className="w-full p-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={saveEdit}
                        className="text-xs bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600"
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs bg-gray-500 text-white py-1 px-2 rounded hover:bg-gray-600"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-gray-900 text-sm mb-1 truncate" title={prompt.title}>
                        {prompt.title}
                      </h4>
                      {prompt.group && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          {prompt.group}
                        </span>
                      )}
                    </div>
                    <p 
                      className="text-sm text-gray-700 cursor-pointer line-clamp-2"
                      onClick={() => handleUsePrompt(prompt.content)}
                      title={prompt.content}
                    >
                      {prompt.content}
                    </p>
                    <div className="absolute bottom-1 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(prompt);
                        }}
                        className="text-gray-500 hover:text-gray-700"
                        title="编辑"
                      >
                        <FaEdit size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPrompt(prompt.content);
                        }}
                        className="text-blue-500 hover:text-blue-700"
                        title="复制此提示词"
                      >
                        <FaCopy size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePrompt(prompt.id);
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
        ) : (
          <p className="text-gray-500 text-center py-4">暂无提示词，<span className="text-blue-500 hover:text-blue-700 cursor-pointer" onClick={handleAddPromptListBySync}>添加</span>一些常用的提示词吧</p>
        )}
      </div>}
    </div>
  );
}