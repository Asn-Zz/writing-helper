"use client";

import React, { useState, useEffect } from 'react';
import { FaTrash, FaCopy, FaPlus, FaAngleDown, FaAngleUp, FaEdit } from 'react-icons/fa';

interface PromptItem {
  id: string;
  title: string;
  content: string;
}

interface PromptListProps {
  onSelectPrompt: (prompt: string) => void;
  currentPrompt: string;
}

export default function PromptList({ onSelectPrompt, currentPrompt }: PromptListProps) {
  const [isShow, setIsShow] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [prompts, setPrompts] = useState<PromptItem[]>([]);

  // Load prompts from localStorage on component mount
  useEffect(() => {
    try {
      const storedPrompts = localStorage.getItem('imageEditorPrompts');
      if (storedPrompts) {
        const parsedPrompts = JSON.parse(storedPrompts);
        // Handle legacy format (array of strings)
        if (Array.isArray(parsedPrompts) && parsedPrompts.length > 0 && typeof parsedPrompts[0] === 'string') {
          const upgradedPrompts = parsedPrompts.map((prompt: string, index: number) => ({
            id: Date.now().toString() + index,
            title: `提示词 ${index + 1}`,
            content: prompt
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

  // Save prompts to localStorage whenever prompts change
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
          content: newPrompt.trim()
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

  const handleAddCurrentPrompt = () => {
    if (currentPrompt.trim()) {
      const isDuplicate = prompts.some(p => p.content === currentPrompt.trim());
      if (!isDuplicate) {
        const newPromptItem: PromptItem = {
          id: Date.now().toString(),
          title: `提示词 ${prompts.length + 1}`,
          content: currentPrompt.trim()
        };
        setPrompts(prev => [newPromptItem, ...prev]);
      }
    }
  };

  let loading = false;
  const handleAddPromptListBySync = () => {
    if (loading) return;
    loading = true;
    fetch(`${process.env.NEXT_PUBLIC_CDN_URL}/tmp/prompt.json`)
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
        loading = false;
      });
  }

  const startEditing = (prompt: PromptItem) => {
    setEditingId(prompt.id);
    setEditTitle(prompt.title);
    setEditContent(prompt.content);
  };

  const saveEdit = () => {
    if (editingId && editContent.trim()) {
      setPrompts(prev => 
        prev.map(p => 
          p.id === editingId 
            ? { ...p, title: editTitle.trim() || p.title, content: editContent.trim() } 
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

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          提示词列表
          {prompts.length > 0 && <span className="text-xs text-red-500 ml-2 cursor-pointer" onClick={clearPrompts}>(清空)</span>}
        </h3>
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
        <div className="flex gap-2 my-3">
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

        {prompts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
            {prompts.map((prompt) => (
              <div 
                key={prompt.id} 
                className="border border-gray-200 rounded-md p-3 hover:border-blue-300 hover:shadow-sm transition-all relative group"
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
                    <h4 className="font-medium text-gray-900 text-sm mb-1 truncate" title={prompt.title}>
                      {prompt.title}
                    </h4>
                    <p 
                      className="text-sm text-gray-700 cursor-pointer line-clamp-2"
                      onClick={() => handleUsePrompt(prompt.content)}
                      title={prompt.content}
                    >
                      {prompt.content}
                    </p>
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          handleUsePrompt(prompt.content);
                        }}
                        className="text-blue-500 hover:text-blue-700"
                        title="使用此提示词"
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