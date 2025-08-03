'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    FaFire, FaSpinner, FaRobot, FaRotate, FaArrowUpShortWide,
    FaArrowDownWideShort, FaTag, FaRegClock, FaArrowUpRightFromSquare,
    FaChartBar, FaLightbulb, FaUsers, FaTrophy
} from 'react-icons/fa6';
import { Chart, registerables } from 'chart.js/auto';
import { useApiSettings } from '@/app/components/ApiSettingsContext';
import { generate } from '@/app/lib/api';

// Register Chart.js components
Chart.register(...registerables);

// Types
interface HotTopic {
    id: string | number;
    title: string;
    url: string;
    hot: number | string;
    type: string;
    update_v: string;
    updateFormatted: string;
}
type HotTopicsSortKey = 'update_v' | 'hot';
type SortOrder = 'asc' | 'desc';

interface AiAnalysis {
    trend?: string;
    public_opinion?: string;
    topics?: { title: string; reason: string }[];
    suggestion?: { suggestion: string; reason: string }[];
    error?: string;
}

export default function HotTopics() {
    const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
    const [isHotTopicsLoading, setIsHotTopicsLoading] = useState(false);
    const [hotTopicsError, setHotTopicsError] = useState<string | null>(null);
    const [hotTopicsSortKey, setHotTopicsSortKey] = useState<HotTopicsSortKey>('hot');
    const [hotTopicsSortOrder, setHotTopicsSortOrder] = useState<SortOrder>('desc');
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const { apiConfig } = useApiSettings();

    const formatTimestamp = useCallback((timestamp: string | number | undefined | null): string => {
        if (!timestamp) return 'N/A';
        try {
            let date: Date;
            if (/^\d+$/.test(String(timestamp))) {
                date = new Date(Number(timestamp));
            } else {
                const parsedString = String(timestamp).replace(/-/g, '/').replace(/T/, ' ');
                date = new Date(parsedString);
            }
            if (isNaN(date.getTime())) return String(timestamp);
            return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        } catch (e) {
            return String(timestamp);
        }
    }, []);

    const getSortableHotValue = (value: any): number => {
        return parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0;
    };

    const processHotTopicsData = useCallback((rawTopics: any[]): HotTopic[] => {
        if (!Array.isArray(rawTopics)) return [];
        const flattenedTopics = rawTopics.slice(0, 5).flatMap(group => group.data || group);
        return flattenedTopics.map((item, index) => ({
            id: item.index || item.id || `${item.title}-${index}`,
            title: item.title || '无标题',
            url: item.url || item.mobil_url || '#',
            hot: item.hot || 0,
            type: item.type || '未知类型',
            update_v: item.update_v || item.timestamp || '',
            updateFormatted: formatTimestamp(item.update_v || item.timestamp)
        }));
    }, [formatTimestamp]);

    const sortedHotTopics = useMemo(() => {
        const key = hotTopicsSortKey;
        const order = hotTopicsSortOrder === 'asc' ? 1 : -1;
        const getSortableValue = (value: any): number => {
            if (key === 'hot') return getSortableHotValue(value);
            if (key === 'update_v') {
                try {
                    let date;
                    if (/^\d+$/.test(String(value))) date = new Date(Number(value));
                    else date = new Date(String(value).replace(/-/g, '/').replace(/T/, ' '));
                    return isNaN(date.getTime()) ? 0 : date.getTime();
                } catch { return 0; }
            }
            return 0;
        };
        return [...hotTopics].sort((a, b) => (getSortableValue(a[key]) - getSortableValue(b[key])) * order);
    }, [hotTopics, hotTopicsSortKey, hotTopicsSortOrder]);

    const renderChart = useCallback((topicData: HotTopic[]) => {
        if (!chartCanvasRef.current || topicData.length === 0) return;
        const ctx = chartCanvasRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstanceRef.current) chartInstanceRef.current.destroy();

        const topItems = [...topicData].sort((a, b) => getSortableHotValue(b.hot) - getSortableHotValue(a.hot)).slice(0, 10);

        chartInstanceRef.current = new Chart(ctx, {
            type: "bar",
            data: {
                labels: topItems.map(item => item.title.substring(0, 12) + (item.title.length > 12 ? '...' : '')),
                datasets: [{
                    label: "热度值",
                    data: topItems.map(item => getSortableHotValue(item.hot)),
                    backgroundColor: "rgba(168, 85, 247, 0.7)", // purple-500
                    borderColor: "rgba(168, 85, 247, 1)",
                    borderWidth: 1,
                    borderRadius: 5
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, title: { display: true, text: '热度值' } } },
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `热度: ${context.parsed.y}` } } }
            }
        });
    }, []);

    const analyzeHotTopicsWithAI = useCallback(async (topicArr: HotTopic[]): Promise<AiAnalysis> => {
        setIsAiAnalyzing(true);
        setAiAnalysis(null);

        const dataSnippet = topicArr.slice(0, 20).map(item => ({ title: item.title, hot: item.hot, type: item.type }));
        const prompt = `
作为一名顶级的社交媒体与舆情分析师，请根据以下提供的 "热门话题榜" 数据 (JSON格式)，进行深入分析，并严格按照指定的JSON格式返回结果。

分析要求:
1.  **整体趋势分析 (trend)**: 总结当前热门话题榜单所反映的社会、文化或行业整体趋势。
2.  **主流情绪与观点 (public_opinion)**: 基于话题内容，分析当前网民的主流情绪、核心观点或争论焦点。
3.  **话题解读 (topics)**: 选出榜单中最具影响力或讨论价值的5个话题，深入解读其爆火原因及背后反映的社会心态。请包含 title 和 reason 字段。
4.  **内容创作与营销建议 (suggestion)**: 基于以上分析，为内容创作者或品牌营销人员提出1-3条可操作的选题或营销切入点建议。每条建议包含 suggestion (建议内容) 和 reason (详细理由) 字段。

请确保输出是**纯粹的JSON对象**，不包含任何额外的解释或markdown标记。

榜单数据如下:
${JSON.stringify(dataSnippet, null, 2)}
`;

        try {
            const data = await generate({ 
                ...apiConfig, 
                messages: [{ role: 'user', content: prompt }], 
                temperature: 0.7, 
                response_format: { type: 'json_object' } 
            });
            const parsedResults = JSON.parse(data.content);
            if (typeof parsedResults === 'object' && parsedResults !== null) return parsedResults as AiAnalysis;
            else throw new Error("AI 返回的不是有效的 JSON 对象。");
        } catch (error: any) {
            return { error: error.message };
        } finally {
            setIsAiAnalyzing(false);
        }
    }, [apiConfig]);

    const startHotTopicsAnalysis = useCallback(() => {
        if (!sortedHotTopics.length) {
            setAiAnalysis({ error: '没有可供AI分析的话题数据。' });
            return;
        }
        analyzeHotTopicsWithAI(sortedHotTopics).then(setAiAnalysis);
    }, [sortedHotTopics, analyzeHotTopicsWithAI]);

    const fetchHotTopics = useCallback(async () => {
        if (isHotTopicsLoading) return;
        setIsHotTopicsLoading(true);
        setHotTopicsError(null);
        setAiAnalysis(null);
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();

        const apiUrl = 'https://hot-api.vhan.eu.org/v2?type=all';
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`热点话题API请求失败 (${response.status})`);
            const data = await response.json();
            const rawTopics = data.data || data;
            if (!Array.isArray(rawTopics)) throw new Error('未能从API获取到有效的热点话题列表数据。');
            setHotTopics(processHotTopicsData(rawTopics));
        } catch (error: any) {
            setHotTopicsError(`热点话题加载失败: ${error.message}`);
            setHotTopics([]);
        } finally {
            setIsHotTopicsLoading(false);
        }
    }, [isHotTopicsLoading, processHotTopicsData]);

    const setHotTopicsSort = useCallback((key: HotTopicsSortKey) => {
        setHotTopicsSortKey(prevKey => {
            if (prevKey === key) setHotTopicsSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
            else setHotTopicsSortOrder('desc');
            return key;
        });
    }, []);

    useEffect(() => {
        if (sortedHotTopics.length > 0) {
            renderChart(sortedHotTopics);
        }
    }, [sortedHotTopics, renderChart]);

    return (
        <div>
            <section className="p-5 rounded-lg custom-shadow bg-white flex flex-col mt-6 no-print">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                        <FaFire className="mr-2 text-purple-500" /> 热门话题
                    </h2>
                    <button onClick={fetchHotTopics} disabled={isHotTopicsLoading} className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 disabled:opacity-50">
                        {isHotTopicsLoading ? <FaSpinner className="animate-spin inline mr-1" /> : <FaRotate className="inline mr-1" />}
                        刷新话题
                    </button>
                </div>
                <div className="text-sm space-x-3">
                    <span className="text-gray-500">排序:</span>
                    <button onClick={() => setHotTopicsSort('hot')} className={`hover:text-blue-500 transition ${hotTopicsSortKey === 'hot' ? 'text-blue-600 font-semibold' : ''}`}>
                        热度 {hotTopicsSortKey === 'hot' && (hotTopicsSortOrder === 'asc' ? <FaArrowUpShortWide className="inline ml-1" /> : <FaArrowDownWideShort className="inline ml-1" />)}
                    </button>
                    <button onClick={() => setHotTopicsSort('update_v')} className={`hover:text-blue-500 transition ${hotTopicsSortKey === 'update_v' ? 'text-blue-600 font-semibold' : ''}`}>
                        更新时间 {hotTopicsSortKey === 'update_v' && (hotTopicsSortOrder === 'asc' ? <FaArrowUpShortWide className="inline ml-1" /> : <FaArrowDownWideShort className="inline ml-1" />)}
                    </button>
                </div>
                {isHotTopicsLoading && <div className="my-6 text-center text-lg text-blue-500 font-semibold"><FaSpinner className="animate-spin inline mr-3" /> 正在加载热点话题...</div>}
                {hotTopicsError && <div className="my-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg text-center"><FaRobot className="inline mr-2" /> {hotTopicsError}</div>}
            </section>

            {sortedHotTopics.length > 0 && !isHotTopicsLoading && !hotTopicsError && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-120 overflow-y-auto scrollbar-hide p-1 mt-4">
                        {sortedHotTopics.map((topic, index) => (
                            <div key={index} className="p-3 rounded-lg bg-white custom-shadow info-item-card flex flex-col justify-between space-y-2 border border-gray-100">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start mb-1">
                                        <span className="text-xs font-semibold text-purple-600 mr-2 mt-px">#{index + 1}</span>
                                        <a href={topic.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-800 hover:text-blue-600 leading-snug flex-1" title={topic.title}>
                                            {topic.title} <FaArrowUpRightFromSquare className="inline-block text-xs ml-1 opacity-60" />
                                        </a>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 flex items-center flex-wrap gap-x-3 gap-y-1 border-t border-gray-100 pt-2">
                                    <span className="inline-flex items-center"><FaFire className="mr-1 text-red-400" /> {topic.hot}</span>
                                    <span className="inline-flex items-center"><FaTag className="mr-1 text-gray-400" /> {topic.type}</span>
                                    <span className="inline-flex items-center"><FaRegClock className="mr-1 text-gray-400" /> {topic.updateFormatted}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-xl shadow p-6 my-6">
                        <h2 className="text-xl font-semibold text-green-600 mb-4 flex items-center">
                            <FaRobot className="mr-2" /> AI分析与内容建议 {aiAnalysis && <FaRotate className='ml-3 cursor-pointer' onClick={startHotTopicsAnalysis} />}
                            {isAiAnalyzing && <span className="ml-3 text-sm text-gray-500"><FaSpinner className="animate-spin inline mr-1" /> 正在生成...</span>}
                        </h2>
                        {aiAnalysis ? ( 
                            <div className="space-y-3 text-gray-800 text-sm">
                                {aiAnalysis.trend && <div><span className="font-semibold"><FaFire className="inline text-red-400 mr-1" /> 整体趋势：</span><p className="ml-5 whitespace-pre-line">{aiAnalysis.trend}</p></div>}
                                {aiAnalysis.public_opinion && <div><span className="font-semibold"><FaUsers className="inline text-green-400 mr-1" /> 主流观点：</span><p className="ml-5 whitespace-pre-line">{aiAnalysis.public_opinion}</p></div>}
                                {aiAnalysis.topics && <div><span className="font-semibold"><FaTrophy className="inline text-yellow-400 mr-1" /> TOP5 解读：</span><ol className="list-decimal pl-8 mt-1 space-y-1">{aiAnalysis.topics.map((item, index) => <li key={index}><strong>{item.title}</strong> - {item.reason}</li>)}</ol></div>}
                                {aiAnalysis.suggestion && <div><span className="font-semibold"><FaLightbulb className="inline text-blue-400 mr-1" /> 内容建议：</span><ul className="list-disc pl-8 mt-1 space-y-1">{aiAnalysis.suggestion.map((item, index) => <li key={index}><strong>{item.suggestion}</strong> - {item.reason}</li>)}</ul></div>}
                                {aiAnalysis.error && <div className="text-red-500"><FaRobot className="inline mr-1" /> AI分析出错: {aiAnalysis.error}</div>}
                            </div>
                        ) : (!isAiAnalyzing && <div className="text-gray-400 cursor-pointer" onClick={startHotTopicsAnalysis}>点击生成AI分析结果</div>)}
                    </div>

                    <div className="bg-white rounded-xl shadow p-6 mb-8">
                        <h2 className="text-xl font-semibold text-blue-600 mb-4 flex items-center"><FaChartBar className="mr-2" /> 热度概览 (Top 10)</h2>
                        <div style={{ height: '350px', position: 'relative' }}><canvas ref={chartCanvasRef} className="w-full h-full"></canvas></div>
                    </div>
                </>
            )}
            {!isHotTopicsLoading && !hotTopicsError && sortedHotTopics.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                    未能找到相关热点话题，或 <button onClick={fetchHotTopics} className="text-blue-500 underline">尝试刷新</button>。
                </div>
            )}
        </div>
    );
}
