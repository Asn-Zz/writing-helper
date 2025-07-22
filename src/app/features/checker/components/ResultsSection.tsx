"use client";

import React, { useMemo, useCallback } from 'react';
import {
    FaCheck, FaMagic, FaLightbulb, FaCheckCircle, FaListUl, FaArrowRight
} from 'react-icons/fa';
import { Issue, ResultSegment } from '../types';

interface ResultsSectionProps {
    showResults: boolean;
    isLoading: boolean;
    issues: Issue[];
    setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
    inputText: string;
    setInputText: (text: string) => void;
    originalTextForIssues: string;
}

export default function ResultsSection({
    showResults,
    isLoading,
    issues,
    setIssues,
    inputText,
    setInputText,
    originalTextForIssues,
}: ResultsSectionProps) {
    const unfixedIssuesCount = useMemo(() => issues.filter(i => !i.fixed).length, [issues]);

    const resultSegments = useMemo((): ResultSegment[] => {
        if (!showResults || issues.length === 0) {
            return [{ type: 'text', content: originalTextForIssues }];
        }

        const sortedIssues = [...issues].sort((a, b) => a.start - b.start);
        const segments: ResultSegment[] = [];
        let lastIndex = 0;

        sortedIssues.forEach(issue => {
            if (issue.start > lastIndex) {
                segments.push({
                    type: 'text',
                    content: originalTextForIssues.substring(lastIndex, issue.start)
                });
            }
            segments.push({
                type: 'highlight',
                content: originalTextForIssues.substring(issue.start, issue.end),
                issue: issue
            });
            lastIndex = issue.end;
        });

        if (lastIndex < originalTextForIssues.length) {
            segments.push({
                type: 'text',
                content: originalTextForIssues.substring(lastIndex)
            });
        }

        return segments;
    }, [showResults, issues, originalTextForIssues]);

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

    if (!showResults || isLoading) {
        return null;
    }

    return (
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

                <div id="result-text-area" className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 min-h-[150px] mb-6">
                    {resultSegments.map((segment, index) => (
                        segment.type === 'text' ? (
                            <span key={index}>{segment.content}</span>
                        ) : (
                            <span
                                key={index}
                                className={`highlighted ${segment.issue!.fixed ? 'fixed-issue' : ''}`}
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
                </div>

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
    );
}
