'use client';

import React, { useMemo } from 'react';
import { FaChartBar, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { AnalysisData } from '../types';

interface ContentAnalysisPanelProps {
    analysisData: AnalysisData | null;
}

export default function ContentAnalysisPanel({ analysisData }: ContentAnalysisPanelProps) {
    const isAnalysisAvailable = useMemo(() => analysisData !== null, [analysisData]);

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">内容分析与优化</h2>
            {isAnalysisAvailable && analysisData ? (
                <div id="analysis-container">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Readability */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-medium text-blue-700 mb-2">阅读体验</h3>
                            <div className="flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${analysisData.readability.score}%` }}></div>
                                </div>
                                <span className="text-sm">{Math.round(analysisData.readability.score)}%</span>
                            </div>
                            <p className="text-sm mt-2 text-gray-600">{analysisData.readability.comment}</p>
                        </div>
                        {/* Engagement */}
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="font-medium text-green-700 mb-2">吸引力</h3>
                            <div className="flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${analysisData.engagement.score}%` }}></div>
                                </div>
                                <span className="text-sm">{Math.round(analysisData.engagement.score)}%</span>
                            </div>
                            <p className="text-sm mt-2 text-gray-600">{analysisData.engagement.comment}</p>
                        </div>
                        {/* Keywords */}
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <h3 className="font-medium text-yellow-700 mb-2">关键词优化</h3>
                            <div className="flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                    <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${analysisData.keywords.score}%` }}></div>
                                </div>
                                <span className="text-sm">{Math.round(analysisData.keywords.score)}%</span>
                            </div>
                            <p className="text-sm mt-2 text-gray-600">{analysisData.keywords.comment}</p>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                        <h3 className="font-medium text-gray-800 mb-3">改进建议</h3>
                        <ul className="space-y-2 text-sm text-gray-700">
                            {analysisData.suggestions.map((suggestion, index) => (
                                <li key={index} className="flex items-start">
                                    <span className={`mr-2 ${suggestion.type === 'success' ? 'text-green-500' : 'text-yellow-500'}`}>
                                        {suggestion.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
                                    </span>
                                    <span>{suggestion.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ) : (
                <div id="analysis-placeholder" className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <FaChartBar className="text-5xl mb-4" />
                    <p>点击&quot;AI生成/优化&quot;或&quot;AI仿写&quot;按钮获取内容分析</p>
                </div>
            )}
        </div>
    );
}