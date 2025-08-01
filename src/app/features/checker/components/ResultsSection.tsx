"use client";

import React, { useMemo, useCallback, useState } from 'react';
import { toPng } from 'html-to-image';
import {
    FaCheck, FaMagic, FaLightbulb, FaCheckCircle, FaListUl, FaArrowRight, FaTimes, 
    FaEyeSlash, FaEye, FaUndo, FaImage, FaSearch, FaBookOpen, FaBook
} from 'react-icons/fa';
import eventBus from '@/app/lib/eventBus';
import { Issue, ResultSegment, IssueCategory } from '../types';

interface ResultsSectionProps {
    showResults: boolean;
    isLoading: boolean;
    issues: Issue[];
    setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
    inputText: string;
    setInputText: (text: string) => void;
    originalTextForIssues: string;
}

type FilterCategory = 'all' | IssueCategory;

const categoryConfig: Record<IssueCategory, { name: string; color: string; borderColor: string; bgColor: string; textColor: string; }> = {
    '错别字': { name: '错别字', color: 'red', borderColor: 'border-red-400', bgColor: 'bg-red-50', textColor: 'text-red-700' },
    '语法错误': { name: '语法错误', color: 'yellow', borderColor: 'border-yellow-400', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
    '标点符号': { name: '标点符号', color: 'blue', borderColor: 'border-blue-400', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    '表达优化': { name: '表达优化', color: 'purple', borderColor: 'border-purple-400', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
};

const issueCategories: FilterCategory[] = ['all', '错别字', '语法错误', '标点符号', '表达优化'];

export default function ResultsSection({
    showResults,
    isLoading,
    issues,
    setIssues,
    inputText,
    setInputText,
    originalTextForIssues,
}: ResultsSectionProps) {
    const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
    const [showIgnored, setShowIgnored] = useState(true);
    const [searchPopup, setSearchPopup] = useState<{ visible: boolean; x: number; y: number; text: string } | null>(null);

    const handleTextSelection = useCallback(() => {                                                                
        const selection = window.getSelection();                                                                   
        const selectedText = selection?.toString().trim();                                                         
        const resultArea = document.getElementById('result-text-area');   
        
        if (selectedText && selection && resultArea) {                                                             
            const range = selection.getRangeAt(0);                                                                 
            const rect = range.getBoundingClientRect();                                                            
            const containerRect = resultArea.getBoundingClientRect();                                             
            setSearchPopup({                                                                                      
                visible: true,                                                                                     
                x: rect.left - containerRect.left + rect.width / 2 - 75, // Adjust for icon size                   
                y: rect.top - containerRect.top - 40, // Position above selection                                  
                text: selectedText,                                                                                
            });                                                                                                    
        } else {                                                                                                   
            setSearchPopup(null);                                                                                  
        }                                                                                                          
    }, []);

    const getSafeCategory = useCallback((category: string | undefined | null): IssueCategory => {
        if (category && Object.prototype.hasOwnProperty.call(categoryConfig, category)) {
            return category as IssueCategory;
        }
        return '表达优化';
    }, []);

    const activeIssues = useMemo(() => issues.filter(i => !i.ignored), [issues]);
    const unfixedIssuesCount = useMemo(() => activeIssues.filter(i => !i.fixed).length, [activeIssues]);

    const issuesForDisplay = useMemo(() => {
        return showIgnored ? issues : issues.filter(i => !i.ignored);
    }, [issues, showIgnored]);

    const groupedIssues = useMemo(() => {
        const groups: Record<FilterCategory, Issue[]> = {
            all: [], '错别字': [], '语法错误': [], '标点符号': [], '表达优化': [],
        };
        issuesForDisplay.forEach(issue => {
            groups.all.push(issue);
            const safeCategory = getSafeCategory(issue.category);
            groups[safeCategory].push(issue);
        });
        return groups;
    }, [issuesForDisplay, getSafeCategory]);

    const filteredIssues = useMemo(() => {
        return groupedIssues[activeCategory] || [];
    }, [activeCategory, groupedIssues]);

    const unfixedInCategoryCount = useMemo(() => {
        return filteredIssues.filter(i => !i.fixed && !i.ignored).length;
    }, [filteredIssues]);

    const unignoredInCategoryCount = useMemo(() => {
        return filteredIssues.filter(i => i.ignored).length;    
    }, [filteredIssues]);

    const getHighlightClass = useCallback((issue: Issue) => {
        if (issue.fixed) return 'fixed-issue';
        if (issue.ignored) return 'ignored-issue'; // Style this class with opacity/gray background
        
        const category = getSafeCategory(issue.category);
        const isActive = activeCategory === 'all' || activeCategory === category;
        
        return `highlighted-${categoryConfig[category].color}${isActive ? '' : '-inactive'}`;
    }, [activeCategory, getSafeCategory]);

    const resultSegments = useMemo((): ResultSegment[] => {
        if (!showResults || issues.length === 0) {
            return [{ type: 'text', content: originalTextForIssues }];
        }

        const sortedIssues = [...issuesForDisplay].sort((a, b) => a.start - b.start);
        const segments: ResultSegment[] = [];
        let lastIndex = 0;

        sortedIssues.forEach(issue => {
            if (issue.start > lastIndex) {
                segments.push({ type: 'text', content: originalTextForIssues.substring(lastIndex, issue.start) });
            }
            segments.push({ type: 'highlight', content: originalTextForIssues.substring(issue.start, issue.end), issue: issue });
            lastIndex = issue.end;
        });

        if (lastIndex < originalTextForIssues.length) {
            segments.push({ type: 'text', content: originalTextForIssues.substring(lastIndex) });
        }

        return segments;
    }, [showResults, issues, issuesForDisplay, originalTextForIssues]);

    const applyFixesToInputText = useCallback((fixesToApply: Issue[]) => {
        const sortedFixes = [...fixesToApply].sort((a, b) => b.start - a.start);
        let currentText = inputText;

        sortedFixes.forEach(fix => {
            if (currentText.substring(fix.start, fix.end) === fix.original) {
                currentText = currentText.substring(0, fix.start) + fix.suggestion + currentText.substring(fix.end);
            }
        });

        setInputText(currentText);
        setIssues((prevIssues) =>
            prevIssues.map(issue =>
                fixesToApply.some(fix => fix.id === issue.id) ? { ...issue, fixed: true } : issue
            )
        );
    }, [inputText, setInputText, setIssues]);

    const acceptSuggestion = useCallback((issueId: number) => {
        const issueToFix = issues.find(i => i.id === issueId && !i.fixed);
        if (issueToFix) applyFixesToInputText([issueToFix]);
    }, [issues, applyFixesToInputText]);

    const ignoreSuggestion = useCallback((issueId: number) => {
        setIssues(prev => prev.map(i => i.id === issueId ? { ...i, ignored: true } : i));
    }, [setIssues]);

    const unignoreSuggestion = useCallback((issueId: number) => {
        setIssues(prev => prev.map(i => i.id === issueId ? { ...i, ignored: false } : i));
    }, [setIssues]);

    const fixCurrentSelection = useCallback(() => {
        const issuesToFix = filteredIssues.filter(i => !i.fixed && !i.ignored);
        if (issuesToFix.length > 0) applyFixesToInputText(issuesToFix);
    }, [filteredIssues, applyFixesToInputText]);

    const ignoreCurrentSelection = useCallback(() => {
        const issuesToIgnore = filteredIssues.filter(i => !i.fixed && !i.ignored);
        const idsToIgnore = new Set(issuesToIgnore.map(i => i.id));
        setIssues(prev => prev.map(i => idsToIgnore.has(i.id) ? { ...i, ignored: true } : i));
    }, [filteredIssues, setIssues]);

    const [isScrollable, setIsScrollable] = useState(true);
    const handleExportImage = useCallback(() => {
        const node = document.getElementById('result-list-area');
        if (!node) return;

        toPng(node, {
            cacheBust: true,
            pixelRatio: 3,
            backgroundColor: '#fff',
        })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = inputText.substring(0, 10) + '.png';
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error('oops, something went wrong!', err);
            })
    }, [inputText]);

    if (!showResults || isLoading) return null;

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <FaCheck className="text-green-500" />
                </div>
                <h2 className="text-xl font-semibold">校对结果</h2>
                <div className="ml-auto flex items-center gap-2">
                    {unfixedIssuesCount > 0 && (
                        <>
                            {unignoredInCategoryCount > 0 && <button
                                onClick={() => setShowIgnored(prev => !prev)}
                                title={showIgnored ? '隐藏已忽略的问题' : '显示已忽略的问题'}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition flex items-center"
                            >
                                {showIgnored ? <FaEyeSlash className="mr-2" /> : <FaEye className="mr-2" />}
                                {showIgnored ? '隐藏' : '显示'}
                            </button>}
                            {activeCategory !== 'all' && unignoredInCategoryCount > 0 && <button
                                onClick={ignoreCurrentSelection}
                                disabled={unfixedInCategoryCount === 0}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition flex items-center disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                <FaEyeSlash className="mr-2" />
                                忽略此分类
                            </button>}
                            <button
                                onClick={fixCurrentSelection}
                                disabled={unfixedInCategoryCount === 0}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                <FaMagic className="mr-2" />
                                {activeCategory === 'all' ? `修复全部 (${unfixedInCategoryCount})` : `修复分类 (${unfixedInCategoryCount})`}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div>
                {activeIssues.length > 0 ? (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0"><FaLightbulb className="text-yellow-500" /></div>
                            <div className="ml-3">
                                {unfixedIssuesCount > 0 ? (
                                    <p className="text-sm text-yellow-700">
                                        共发现 <span className="font-medium">{activeIssues.length}</span> 个问题，还有 <span className="font-medium">{unfixedIssuesCount}</span> 个待处理。
                                        将鼠标悬停在下方高亮文本上查看并接受修改建议。
                                    </p>
                                ) : (
                                    <p className="text-sm text-green-700">
                                        <FaCheckCircle className="inline-block mr-1" /> 太棒了！所有问题都已修复。最终文本已更新到上方输入框。您现在可以进行语音合成或封面生成
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0"><FaCheckCircle className="text-green-500" /></div>
                            <div className="ml-3"><p className="text-sm text-green-700">未发现明显问题。</p></div>
                        </div>
                    </div>
                )}

                <div id="result-text-area" onMouseUp={handleTextSelection} className="relative p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 min-h-[150px] mb-6">
                    {searchPopup?.visible && (
                        <div 
                            className='absolute z-10 flex bg-white rounded-lg shadow-lg' 
                            style={{ left: searchPopup.x, top: searchPopup.y }} 
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            <a 
                                href={`https://www.shenyandayi.com/wantWordsResult?query=${encodeURIComponent(searchPopup.text)}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="px-4 py-2 border-r border-gray-100 hover:bg-gray-100"  
                                title="近义词查询"
                            >
                                <FaBookOpen className="text-green-500" /> 
                            </a>

                            <a 
                                href={`https://cn.bing.com/search?q=${encodeURIComponent(searchPopup.text)}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="px-4 py-2 border-r border-gray-100 hover:bg-gray-100"  
                                title="网页搜索"
                            >
                                <FaSearch className="text-blue-500" />
                            </a>

                            <button 
                                onClick={() => eventBus.emit('openThesaurusModal')}
                                className="px-4 py-2 hover:bg-gray-100"
                                title="打开词库"
                            >
                                <FaBook className="text-blue-500" />
                            </button>
                        </div>
                    )}
                    {resultSegments.map((segment, index) =>
                        segment.type === 'text' ? (
                            <span key={index}>{segment.content}</span>
                        ) : (
                            <span key={index} className={getHighlightClass(segment.issue!)}>
                                {segment.content}
                                {!segment.issue!.fixed && !segment.issue!.ignored && (
                                    <div className="suggestion-popup">
                                        <div className="font-medium text-red-600 mb-1">问题：{segment.issue!.reason}</div>
                                        <div className="mb-2">建议修改为：<span className="font-medium text-green-600">{segment.issue!.suggestion}</span></div>
                                        <div className="flex justify-between items-center">
                                            <button
                                                onClick={() => acceptSuggestion(segment.issue!.id)}
                                                className="accept-suggestion bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
                                            >
                                                接受建议
                                            </button>
                                            <button
                                                onClick={() => ignoreSuggestion(segment.issue!.id)}
                                                className="ignore-suggestion bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-sm"
                                                title="忽略此建议"
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </span>
                        )
                    )}
                </div>

                {issuesForDisplay.length > 0 && (
                    <details className="mt-6" open>
                        <summary className="cursor-pointer text-gray-600 hover:text-blue-600">
                            <FaListUl className="inline-block mr-1" /> 查看/隐藏 问题列表 ({issuesForDisplay.length})
                        </summary>
                        <div className="mt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    {issueCategories.map(category => {
                                        const count = groupedIssues[category]?.length || 0;
                                        if (count === 0 && category !== 'all') return null;
                                        const categoryName = category === 'all' ? '全部' : categoryConfig[category as IssueCategory]?.name || '全部';
                                        return (
                                            <button
                                                key={category}
                                                onClick={() => setActiveCategory(category)}
                                                className={`px-4 py-2 text-sm font-medium ${activeCategory === category ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {categoryName} ({count})
                                            </button>   
                                        );
                                    })}
                                </div>

                                <div className='flex items-center gap-2'>
                                    <button
                                        onClick={() => setIsScrollable(!isScrollable)}
                                        className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                                    >
                                        {isScrollable ? '展开全部' : '收起'}
                                    </button>

                                    <button
                                        onClick={handleExportImage}
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition flex items-center"
                                        title="导出修改建议为图片"
                                    >
                                        <FaImage className="mr-2" />
                                        导出
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div id="result-list-area" className="mt-3 border border-gray-200 rounded-lg divide-y divide-gray-200 overflow-y-auto" style={{ height: isScrollable ? '500px' : 'auto' }}>
                            {filteredIssues.map((issue) => {
                                const category = getSafeCategory(issue.category);
                                const config = categoryConfig[category];
                                return (
                                <div key={issue.id} className={`p-3 hover:bg-gray-50 ${issue.fixed ? 'bg-green-50' : issue.ignored ? 'bg-gray-100' : ''}`}>
                                    <div className="flex items-start">
                                        {!issue.fixed && !issue.ignored ? (
                                            <span className={`font-medium text-xs px-2 py-0.5 rounded-full mr-2 whitespace-nowrap ${config.bgColor} ${config.textColor} w-[65px] text-center`}>
                                                {config.name}
                                            </span>
                                        ) : (
                                            <span className={`font-medium text-xs px-2 py-0.5 rounded-full mr-2 whitespace-nowrap ${issue.fixed ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'}`}>
                                                {issue.fixed ? '已修复' : '已忽略'}
                                            </span>
                                        )}
                                        <div className="flex-1">
                                            <p className={`mb-1 text-sm ${issue.fixed || issue.ignored ? 'text-gray-500' : 'text-red-600'}`}>{issue.reason}</p>
                                            <div className="flex items-center text-xs">
                                                <span className={`line-through mr-2 ${issue.fixed || issue.ignored ? 'text-gray-400' : 'text-gray-500'}`}>{issue.original}</span>
                                                <FaArrowRight className="text-gray-400 mr-2" />
                                                <span className="font-medium text-green-600">{issue.suggestion}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                            {issue.fixed ? (
                                                <FaCheckCircle className="text-green-500" />
                                            ) : issue.ignored ? (
                                                <button
                                                    onClick={() => unignoreSuggestion(issue.id)}
                                                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs flex items-center"
                                                    title="撤销忽略"
                                                >
                                                    <FaUndo className="mr-1" />
                                                    撤销
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => acceptSuggestion(issue.id)}
                                                        className="accept-suggestion-list bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                                                    >
                                                        <FaCheck />
                                                    </button>
                                                    <button
                                                        onClick={() => ignoreSuggestion(issue.id)}
                                                        className="ignore-suggestion-list bg-gray-200 hover:bg-gray-300 text-gray-600 px-2 py-1 rounded text-xs"
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
}
