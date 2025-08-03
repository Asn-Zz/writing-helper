"use client";

import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { Thesaurus, Correction } from '../types';

interface ThesaurusModalProps {
    isOpen: boolean;
    onClose: () => void;
    thesauruses: Thesaurus[];
    setThesauruses: (thesauruses: Thesaurus[]) => void;
    resetThesaurus: () => void;
}

export default function ThesaurusModal({ isOpen, onClose, thesauruses, setThesauruses, resetThesaurus }: ThesaurusModalProps) {
    const [newOriginal, setNewOriginal] = useState('');
    const [newSuggestion, setNewSuggestion] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [editingCorrection, setEditingCorrection] = useState<Correction | null>(null);
    const [editingOriginal, setEditingOriginal] = useState('');
    const [editingSuggestion, setEditingSuggestion] = useState('');

    useEffect(() => {
        if (isOpen && thesauruses.length > 0 && !selectedGroupId) {
            setSelectedGroupId(thesauruses[0].id);
        } else if (thesauruses.length === 0) {
            setSelectedGroupId(null);
        }
    }, [isOpen, thesauruses, selectedGroupId]);

    if (!isOpen) return null;

    const handleAddGroup = () => {
        if (newGroupName.trim()) {
            const newGroup: Thesaurus = {
                id: Date.now().toString(),
                name: newGroupName.trim(),
                corrections: [],
                enabled: true,
            };
            const updatedThesauruses = [...thesauruses, newGroup];
            setThesauruses(updatedThesauruses);
            setSelectedGroupId(newGroup.id);
            setNewGroupName('');
        }
    };

    const handleDeleteGroup = (groupId: string) => {
        const updatedThesauruses = thesauruses.filter(t => t.id !== groupId);
        setThesauruses(updatedThesauruses);
        if (selectedGroupId === groupId) {
            setSelectedGroupId(updatedThesauruses.length > 0 ? updatedThesauruses[0].id : null);
        }
    };

    const handleAddCorrection = () => {
        if (newOriginal.trim() && newSuggestion.trim() && selectedGroupId) {
            const updatedThesauruses = thesauruses.map(t => {
                if (t.id === selectedGroupId) {
                    const newCorrection: Correction = { original: newOriginal.trim(), suggestion: newSuggestion.trim() };
                    return { ...t, corrections: [...t.corrections, newCorrection] };
                }
                return t;
            });
            setThesauruses(updatedThesauruses);
            setNewOriginal('');
            setNewSuggestion('');
        }
    };

    const handleDeleteCorrection = (original: string) => {
        if (selectedGroupId) {
            const updatedThesauruses = thesauruses.map(t => {
                if (t.id === selectedGroupId) {
                    return { ...t, corrections: t.corrections.filter(c => c.original !== original) };
                }
                return t;
            });
            setThesauruses(updatedThesauruses);
        }
    };

    const handleStartEdit = (correction: Correction) => {
        setEditingCorrection(correction);
        setEditingOriginal(correction.original);
        setEditingSuggestion(correction.suggestion);
    };

    const handleCancelEdit = () => {
        setEditingCorrection(null);
        setEditingOriginal('');
        setEditingSuggestion('');
    };

    const handleSaveEdit = () => {
        if (editingCorrection && editingOriginal.trim() && editingSuggestion.trim() && selectedGroupId) {
            const updatedThesauruses = thesauruses.map(t => {
                if (t.id === selectedGroupId) {
                    const updatedCorrections = t.corrections.map(c =>
                        c.original === editingCorrection.original ? { original: editingOriginal.trim(), suggestion: editingSuggestion.trim() } : c
                    );
                    return { ...t, corrections: updatedCorrections };
                }
                return t;
            });
            setThesauruses(updatedThesauruses);
            handleCancelEdit();
        }
    };

    const selectedThesaurus = thesauruses.find(t => t.id === selectedGroupId);

    // Common class for inputs for consistency
    const inputClasses = "w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={onClose}>
            <div className="bg-slate-50 rounded-lg shadow-xl w-full max-w-4xl flex flex-col h-[80vh] max-h-[700px]" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-lg flex-shrink-0">
                    <h3 className="text-xl font-semibold text-slate-800">词库管理 <span className="text-base text-red-400 cursor-pointer ml-2" onClick={resetThesaurus}>(重置)</span></h3>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-grow grid grid-cols-12 overflow-hidden">
                    {/* Left Panel: Groups */}
                    <div className="col-span-4 flex flex-col gap-4 border-r border-slate-200 p-6">
                        {/* <h4 className="text-lg font-semibold text-slate-700 flex-shrink-0">词库分组 ({thesauruses.length})</h4> */}
                        <div className="flex gap-2 flex-shrink-0">
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                                placeholder="新分组名"
                                className={inputClasses}
                            />
                            <button onClick={handleAddGroup} className="flex-shrink-0 bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded-md shadow-sm transition-colors"><FaPlus /></button>
                        </div>
                        <ul className="space-y-1 flex-grow overflow-y-auto">
                            {thesauruses.map(t => (
                                <li
                                    key={t.id}
                                    className={`group flex justify-between items-center p-2.5 rounded-md cursor-pointer transition-colors ${selectedGroupId === t.id ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-slate-600 hover:bg-slate-200'}`}
                                    onClick={() => setSelectedGroupId(t.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={t.enabled}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                const updatedThesauruses = thesauruses.map(item =>
                                                    item.id === t.id ? { ...item, enabled: e.target.checked } : item
                                                );
                                                setThesauruses(updatedThesauruses);
                                            }}
                                        />
                                        <span className="flex-grow truncate pr-2">{t.name}({t.corrections.length})</span>
                                    </div>
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteGroup(t.id);
                                    }} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full text-red-500 hover:bg-red-100 hover:text-red-700 transition-all">
                                        <FaTrash />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Right Panel: Corrections */}
                    <div className="col-span-8 flex flex-col gap-4 p-6">
                        {selectedThesaurus ? (
                            <>
                                {/* <h4 className="text-lg font-semibold text-slate-700 flex-shrink-0">{selectedThesaurus.name}({selectedThesaurus.corrections.length})</h4> */}
                                {/* Add Correction Form */}
                                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex-shrink-0">
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <input type="text" value={newOriginal} onChange={(e) => setNewOriginal(e.target.value)} placeholder="原词" className={inputClasses} />
                                        <input type="text" value={newSuggestion} onChange={(e) => setNewSuggestion(e.target.value)} placeholder="建议词" className={inputClasses} onKeyDown={(e) => e.key === 'Enter' && handleAddCorrection()} />
                                    </div>
                                    <button onClick={handleAddCorrection} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium">
                                        <FaPlus /> 添加词对
                                    </button>
                                </div>
                                {/* Corrections List */}
                                <div className="flex-grow overflow-y-auto bg-white rounded-lg border border-slate-200">
                                    <ul className="divide-y divide-slate-100">
                                        {selectedThesaurus.corrections.map((c, index) => (
                                            <li key={index} className="flex items-center justify-between p-3 hover:bg-slate-50">
                                                {editingCorrection?.original === c.original ? (
                                                    <div className="flex items-center gap-2 w-full">
                                                        <input type="text" value={editingOriginal} onChange={e => setEditingOriginal(e.target.value)} className={`${inputClasses} flex-1`} />
                                                        <span className="text-slate-400">{' => '}</span>
                                                        <input type="text" value={editingSuggestion} onChange={e => setEditingSuggestion(e.target.value)} className={`${inputClasses} flex-1`} onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()} />
                                                        <button onClick={handleSaveEdit} className="p-2 rounded-md text-green-600 hover:bg-green-100 transition-colors"><FaSave size={18}/></button>
                                                        <button onClick={handleCancelEdit} className="p-2 rounded-md text-slate-500 hover:bg-slate-200 transition-colors"><FaTimes size={18}/></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-slate-700">原词 <span className="font-medium">{c.original}</span> 建议词 <span className="font-medium">{c.suggestion}</span></span>
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => handleStartEdit(c)} className="p-2 rounded-md text-blue-500 hover:bg-blue-100 transition-colors"><FaEdit /></button>
                                                            <button onClick={() => handleDeleteCorrection(c.original)} className="p-2 rounded-md text-red-500 hover:bg-red-100 transition-colors"><FaTrash /></button>
                                                        </div>
                                                    </>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500 bg-white border-2 border-dashed border-slate-200 rounded-lg">
                                <p>请先在左侧选择或创建一个词库分组。</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                {/* <div className="p-4 bg-white border-t border-slate-200 flex justify-end rounded-b-lg flex-shrink-0">
                    <button onClick={onClose} className="border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 px-5 py-2 rounded-lg transition-colors font-medium">关闭</button>
                </div> */}
            </div>
        </div>
    );
}