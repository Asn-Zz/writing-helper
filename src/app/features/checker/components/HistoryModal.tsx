"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { FaHistory, FaTrash } from 'react-icons/fa';
import eventBus from '@/app/lib/eventBus';
import { useLocalStorage } from '@/app/hooks/useLocalStorage';
import { Issue, HistoryEntry } from '../types';

interface HistoryModalProps {
    onRestore: (entry: HistoryEntry) => void;
}   

export default function HistoryModal({ onRestore }: HistoryModalProps) {
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useLocalStorage<HistoryEntry[]>('checkerHistory', []);

    const addToHistory = useCallback((text: string, issues: Issue[]) => {
        if (!text.trim()) return;
        const newEntry: HistoryEntry = {
            text,
            issues,
            timestamp: new Date().toISOString(),
        };
        const updatedHistory = [newEntry, ...history].slice(0, 10);

        setHistory(updatedHistory);
    }, []);

    useEffect(() => {
        eventBus.on('history-added', addToHistory);
    }, [addToHistory]);

    const deleteHistory = useCallback((entry?: HistoryEntry) => {
        if (entry) {
            const updatedHistory = history.filter(h => h !== entry);
            
            setHistory(updatedHistory);
        } else {
            if (window.confirm("确定要清空历史记录吗？")) {
                setHistory([]);
                setShowHistory(false);
            }
        }
    }, [history, setHistory]);

    const onRestoreHistory = useCallback((entry: HistoryEntry) => {
        onRestore(entry);
        setShowHistory(false);
    }, [onRestore]);

    return (
        <>
            <div className="fixed bottom-10 right-10 z-50">
                <button
                    onClick={() => setShowHistory(true)}
                    className="bg-gray-600 text-white rounded-full p-3 shadow-lg hover:bg-gray-700 transition-all duration-300 cursor-pointer"
                    aria-label="查看历史记录"
                >
                    <FaHistory />
                </button>
            </div>

            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowHistory(false)} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                <div
                    className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800">
                            检查历史
                            <span
                                onClick={() => deleteHistory()}
                                className="text-base ml-2 text-red-600 cursor-pointer hover:text-red-800 transition-colors duration-200"
                            >
                                清空
                            </span>
                        </h3>
                    </div>
                    <div className="p-6 max-h-100 overflow-y-auto">
                        {history.length === 0 ? (
                            <p className="text-gray-500">暂无历史记录</p>
                        ) : (
                            <ul className="space-y-4">
                                {history.map((entry, index) => (
                                    <li key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"  onClick={() => onRestoreHistory(entry)}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="flex space-x-2 text-sm text-gray-500">
                                                        <span>{new Date(entry.timestamp).toLocaleString()} </span>
                                                        <span>字数：{entry.text.length} </span>
                                                        <span>问题：{entry.issues.filter(i => !i.ignored).length}</span>
                                                    </p>

                                                    <FaTrash className="text-red-600 cursor-pointer hover:text-red-800 transition-colors duration-200" onClick={(e) => {e.stopPropagation(); deleteHistory(entry)}} />
                                                </div>
                                                <p className="text-gray-700 line-clamp-2">{entry.text}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="p-4 bg-gray-50 border-t border-gray-200 text-right">
                        <button
                            onClick={() => setShowHistory(false)}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all duration-200"
                        >
                            关闭
                        </button>
                    </div>
                </div>
            </div>)}
        </>
    );
}
