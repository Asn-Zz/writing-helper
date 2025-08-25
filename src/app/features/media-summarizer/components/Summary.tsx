import { useState } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { AiSummary } from '../types';
import { formatTime } from '../utils';

interface SummaryProps {
    aiSummaryJson: AiSummary;
    splitByChapters: () => void;
}

export default function Summary({ aiSummaryJson, splitByChapters }: SummaryProps) {
    const [showJsonView, setShowJsonView] = useState(false);

    const copySummaryToClipboard = () => {
        if (aiSummaryJson) {
            navigator.clipboard.writeText(JSON.stringify(aiSummaryJson, null, 2))
            .then(() => alert('AI 摘要 (JSON) 已复制到剪贴板!'))
            .catch(err => alert('复制失败: ' + err));
        }
    };
    
    return (
        <div className="mt-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="text-md font-semibold text-gray-700 mb-2">摘要结果</h3>
                {aiSummaryJson.podcastTitle ? (
                    <div className="mb-4">
                        <div className="mb-3 bg-white p-3 rounded-md border border-gray-200">
                            <h4 className="text-lg font-bold text-purple-700">{aiSummaryJson.podcastTitle}</h4>
                            <h5 className="text-md font-semibold text-gray-800 mt-1">{aiSummaryJson.episodeTitle}</h5>
                            <p className="text-sm text-gray-600 mt-2">{aiSummaryJson.overallSummary}</p>
                        </div>
                        <div className="mt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-md font-semibold text-gray-700 mb-2">章节信息:</h3>
                                <span className="text-sm text-yellow-500 cursor-pointer" onClick={splitByChapters}>自动分割</span>
                            </div>
                            {aiSummaryJson.chapters?.map((chapter, index) => (
                                <div key={index} className="flex mb-2 bg-white p-2 rounded border border-gray-200">
                                    <span className="font-mono text-sm text-blue-600">[{formatTime(chapter.start)} - {formatTime(chapter.end)}]</span>
                                    <span className="ml-2 text-sm font-medium">{chapter.title}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4">
                            <h4 className="font-semibold text-gray-700 mb-2">关键要点:</h4>
                            <ul className="list-disc pl-5">
                                {aiSummaryJson.keyTakeaways?.map((point, index) => <li key={index} className="text-sm mb-1">{point}</li>)}
                            </ul>
                        </div>
                        <div className="mt-4">
                            <h4 className="font-semibold text-gray-700 mb-2">标签:</h4>
                            <div className="flex flex-wrap gap-2">
                                {aiSummaryJson.tags?.map((tag, index) => <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">#{tag}</span>)}
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-red-500">{aiSummaryJson.error || "摘要格式无效"}</p>
                )}
                <div className="mt-3">
                    <button onClick={() => setShowJsonView(!showJsonView)} className="text-sm text-blue-600 hover:text-blue-800 mb-2 flex items-center">
                        {showJsonView ? <FaChevronDown className="h-4 w-4 mr-1" /> : <FaChevronRight className="h-4 w-4 mr-1" />}
                        {showJsonView ? '隐藏JSON格式' : '显示JSON格式'}
                    </button>
                    {showJsonView && <pre className="text-sm whitespace-pre-wrap break-all overflow-x-auto max-h-96 bg-gray-100 p-2 rounded">{JSON.stringify(aiSummaryJson, null, 2)}</pre>}
                    <button onClick={copySummaryToClipboard} className="mt-3 py-1 px-3 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-md transition duration-200">复制 JSON</button>
                </div>
            </div>
        </div>
    );
}