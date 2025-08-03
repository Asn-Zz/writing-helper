'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    FaNewspaper, FaRobot, FaFire, FaArrowUpRightFromSquare, FaSpinner,
    FaChartBar, FaLightbulb, FaUsers, FaTrophy, FaRotate
} from 'react-icons/fa6';
import { Chart, registerables } from 'chart.js/auto';
import { useApiSettings } from '@/app/components/ApiSettingsContext';
import { generate } from '@/app/lib/api';

// Register Chart.js components
Chart.register(...registerables);

// Types
type InfoTimeFrame = 'today' | 'weekly' | 'monthly' | null;

interface InfoItem {
    id: string | number;
    title: string;
    url?: string;
    desc?: string;
    hot: number;
    hotFormatted: string;
    source?: string;
}

interface AiAnalysis {
    trend?: string;
    user_interest?: string;
    topics?: { title: string; reason: string }[];
    suggestion?: { suggestion: string; reason: string }[];
    error?: string;
}

export default function InformationAnalysis() {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [infoTimeFrame, setInfoTimeFrame] = useState<InfoTimeFrame>(null);
    const [infoItems, setInfoItems] = useState<InfoItem[]>([]);
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const { apiConfig } = useApiSettings();

    const sourceList = [
        { id: 'zhihu', name: '知乎' },
        { id: 'ithome', name: 'IT之家' },
        { id: 'weibo', name: '微博' },
        { id: 'baidu-tieba', name: '百度贴吧' },
        { id: '36kr', name: '36氪' },
    ];

    const formatCount = useCallback((num: number | string | undefined | null): string => {
        const number = Number(num || 0);
        if (typeof number !== 'number' || isNaN(number)) return 'N/A';
        if (number >= 10000) return (number / 10000).toFixed(1) + '万';
        return number.toString();
    }, []);

    const buildInfoAPIUrl = useCallback((timeFrame: InfoTimeFrame) => {
        if (!timeFrame) return null;
        return `https://api.rebang.today/v1/items?tab=top&sub_tab=${encodeURIComponent(timeFrame)}&page=1&version=1`;
    }, []);

    const processInfoData = useCallback((rawItems: any[]): InfoItem[] => {
        if (!Array.isArray(rawItems)) return [];
        return rawItems.map((item, index) => {
            const hot = Number(item.heat_num || item.hot_num || item.hot || 0);
            return {
                id: item.id || item.url || `${item.title}-${index}`,
                title: item.title || '无标题',
                url: item.url || item.mobile_url || item.www_url,
                desc: item.desc || item.description || '',
                hot: hot,
                hotFormatted: formatCount(hot),
                source: item.tab_key || item.site_name || item.source || ''
            };
        });
    }, [formatCount]);

    const renderChart = useCallback((infoData: InfoItem[]) => {
        if (!chartCanvasRef.current || infoData.length === 0) return;
        const ctx = chartCanvasRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const topItems = infoData.slice(0, 10);

        chartInstanceRef.current = new Chart(ctx, {
            type: "bar",
            data: {
                labels: topItems.map(item => item.title.substring(0, 12) + (item.title.length > 12 ? '...' : '')),
                datasets: [{
                    label: "热度值",
                    data: topItems.map(item => item.hot),
                    backgroundColor: "rgba(239, 68, 68, 0.7)", // red-500
                    borderColor: "rgba(239, 68, 68, 1)",
                    borderWidth: 1,
                    borderRadius: 5
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: '热度值' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `热度: ${context.parsed.y}`
                        }
                    }
                }
            }
        });
    }, []);

    const analyzeInfoWithAI = useCallback(async (infoArr: InfoItem[], timeFrame: InfoTimeFrame): Promise<AiAnalysis> => {
        setIsAiAnalyzing(true);
        setAiAnalysis(null);

        const dataSnippet = infoArr.slice(0, 20).map(item => ({
            title: item.title,
            hot: item.hot,
            source: item.source,
            desc: item.desc
        }));

        const timeFrameText = timeFrame === 'today' ? '今日' : timeFrame === 'weekly' ? '本周' : '本月';
        const prompt = `
作为一名资深的新媒体分析师和内容策略师，请根据以下提供的 "${timeFrameText}热榜资讯" 数据 (JSON格式)，进行深入分析，并严格按照指定的JSON格式返回结果。

分析要求:
1.  **当前热点趋势 (trend)**: 总结当前资讯榜单反映出的核心热点事件、话题或领域。
2.  **用户兴趣洞察 (user_interest)**: 基于数据推断当前用户的关注点和兴趣方向。
3.  **资讯点评 (topics)**: 选出榜单中最具代表性的5条资讯，为每条提供上榜理由或看点分析。请包含 title 和 reason 字段。
4.  **内容创作建议 (suggestion)**: 基于以上分析，提出1-3条具体的内容创作方向或选题建议。每条建议包含 suggestion (建议内容) 和 reason (详细理由) 字段。

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
            if (typeof parsedResults === 'object' && parsedResults !== null) {
                return parsedResults as AiAnalysis;
            } else {
                throw new Error("AI 返回的不是有效的 JSON 对象。");
            }
        } catch (error: any) {
            console.error("AI Analysis Error:", error);
            return { error: error.message };
        } finally {
            setIsAiAnalyzing(false);
        }
    }, [apiConfig]);

    const startInfoAnalysis = useCallback(() => {
        if (!infoItems.length || !infoTimeFrame) {
            setAiAnalysis({ error: '没有可供AI分析的资讯数据或未选择时间范围。' });
            return;
        }
        analyzeInfoWithAI(infoItems, infoTimeFrame)
            .then(setAiAnalysis)
            .catch(err => {
                console.error("AI Analysis background task failed:", err);
                setAiAnalysis({ error: `执行AI分析时出错: ${err.message}` });
            });
    }, [infoItems, infoTimeFrame, analyzeInfoWithAI]);

    const fetchInformationData = useCallback(async (timeFrame: InfoTimeFrame) => {
        if (isLoading || !timeFrame) return;
        setInfoTimeFrame(timeFrame);
        setIsLoading(true);
        setErrorMessage(null);
        setInfoItems([]);
        setAiAnalysis(null);
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }

        const apiUrl = buildInfoAPIUrl(timeFrame);
        if (!apiUrl) {
            setErrorMessage('无效的时间范围。');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`资讯API请求失败 (${response.status})`);
            const data = await response.json();

            let rawInfoData: any[] = [];
            if (data.data?.list && typeof data.data.list === 'string') {
                try { rawInfoData = JSON.parse(data.data.list); } catch (e) { console.error("Failed to parse info list string:", e); }
            } else if (Array.isArray(data.data?.list)) {
                rawInfoData = data.data.list;
            } else if (Array.isArray(data.data)) {
                rawInfoData = data.data;
            } else if (Array.isArray(data.list)) {
                rawInfoData = data.list;
            } else if (Array.isArray(data.items)) {
                rawInfoData = data.items;
            }

            if (!Array.isArray(rawInfoData) || rawInfoData.length === 0) {
                throw new Error('未能从API获取到有效的资讯列表数据。');
            }

            const processedItems = processInfoData(rawInfoData);
            if (processedItems.length === 0) {
                throw new Error('处理后的资讯列表为空。');
            }
            setInfoItems(processedItems);
            setTimeout(() => renderChart(processedItems), 300);

        } catch (error: any) {
            console.error("Information Fetch/Process Error:", error);
            setErrorMessage(`资讯数据加载失败: ${error.message}`);
            setInfoItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, buildInfoAPIUrl, processInfoData, renderChart]);

    useEffect(() => {
        if (infoItems.length > 0) {
            renderChart(infoItems);
        }
    }, [infoItems, renderChart]);

    return (
        <div>
            {errorMessage && (
                <div className="my-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg text-center">
                    <FaRobot className="inline mr-2" /> {errorMessage}
                </div>
            )}
            <section className="p-5 rounded-lg custom-shadow bg-white flex flex-col mb-6 no-print">
                <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                    <FaNewspaper className="mr-2 text-red-400" /> 选择热榜资讯范围
                </h2>
                <div className="flex flex-wrap gap-3">
                    {(['today', 'weekly', 'monthly'] as const).map((frame) => (
                        <button
                            key={frame}
                            onClick={() => fetchInformationData(frame)}
                            disabled={isLoading}
                            className={`px-4 py-2 rounded-lg font-semibold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${infoTimeFrame === frame ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            {isLoading && infoTimeFrame === frame ? <FaSpinner className="animate-spin mr-2" /> : null}
                            {frame === 'today' ? '今日热榜' : frame === 'weekly' ? '本周热榜' : '本月热榜'}
                        </button>
                    ))}
                </div>
            </section>

            {infoItems.length > 0 && !isLoading && !errorMessage && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4 h-150 overflow-y-auto scrollbar-hide">
                    {infoItems.map((item, index) => (
                        <div key={item.id} className="p-4 rounded-lg bg-white custom-shadow info-item-card flex flex-col justify-between">
                            <div>
                                <div className="flex items-start mb-2">
                                    <span className="text-sm font-bold text-blue-600 mr-2 mt-px">#{index + 1}</span>
                                    <h3 className="text-base font-semibold text-gray-800 leading-snug flex-1">{item.title}</h3>
                                </div>
                                {item.desc && (
                                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.desc}</p>
                                )}
                                <div className="text-xs text-gray-400 mb-2 flex flex-wrap gap-x-3">
                                    {item.source && (
                                        <span className="inline-flex items-center"><FaRobot className="mr-1" /> {sourceList.find(s => s.id === item.source)?.name || item.source}</span>
                                    )}
                                    {item.hot > 0 && (
                                        <span className="inline-flex items-center"><FaFire className="mr-1 text-red-500" /> {item.hotFormatted} 热度</span>
                                    )}
                                </div>
                            </div>
                            <div className="mt-auto pt-2 border-t border-gray-100">
                                {item.url ? (
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700 inline-flex items-center">
                                        查看详情 <FaArrowUpRightFromSquare className="ml-1" />
                                    </a>
                                ) : (
                                    <span className="text-xs text-gray-400">无链接</span>
                                )}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {infoItems.length > 0 && !isLoading && !errorMessage && (
                <>
                    <div className="bg-white rounded-xl shadow p-6 my-6">
                        <h2 className="text-xl font-semibold text-green-600 mb-4 flex items-center">
                            <FaRobot className="mr-2" /> AI分析与内容建议 {aiAnalysis && <FaRotate className='ml-3 cursor-pointer' onClick={startInfoAnalysis} />}
                            {isAiAnalyzing && (
                                <span className="ml-3 text-sm text-gray-500">
                                    <FaSpinner className="animate-spin inline mr-1" /> 正在生成...
                                </span>
                            )}
                        </h2>
                        {aiAnalysis ? (
                            <div className="space-y-3 text-gray-800 text-sm">
                                {aiAnalysis.trend && (
                                    <div>
                                        <span className="font-semibold"><FaFire className="inline text-red-400 mr-1" /> 热点趋势：</span>
                                        <p className="ml-5 whitespace-pre-line">{aiAnalysis.trend}</p>
                                    </div>
                                )}
                                {aiAnalysis.user_interest && (
                                    <div>
                                        <span className="font-semibold"><FaUsers className="inline text-green-400 mr-1" /> 用户兴趣：</span>
                                        <p className="ml-5 whitespace-pre-line">{aiAnalysis.user_interest}</p>
                                    </div>
                                )}
                                {aiAnalysis.topics && (
                                    <div>
                                        <span className="font-semibold"><FaTrophy className="inline text-yellow-400 mr-1" /> TOP5 点评：</span>
                                        <ol className="list-decimal pl-8 mt-1 space-y-1">
                                            {aiAnalysis.topics.map((item, index) => (
                                                <li key={index}><strong>{item.title}</strong> - {item.reason}</li>
                                            ))}
                                        </ol>
                                    </div>
                                )}
                                {aiAnalysis.suggestion && (
                                    <div>
                                        <span className="font-semibold"><FaLightbulb className="inline text-blue-400 mr-1" /> 内容建议：</span>
                                        <ul className="list-disc pl-8 mt-1 space-y-1">
                                            {aiAnalysis.suggestion.map((item, index) => (
                                                <li key={index}><strong>{item.suggestion}</strong> - {item.reason}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {aiAnalysis.error && <div className="text-red-500"><FaRobot className="inline mr-1" /> AI分析出错: {aiAnalysis.error}</div>}
                            </div>
                        ) : (
                            !isAiAnalyzing && (
                                <div className="text-gray-400 cursor-pointer" onClick={startInfoAnalysis}>
                                    点击生成AI分析结果
                                </div>
                            )
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow p-6">
                        <h2 className="text-xl font-semibold text-blue-600 mb-4 flex items-center">
                            <FaChartBar className="mr-2" /> 热度概览 (Top 10)
                        </h2>
                        <div style={{ height: '350px', position: 'relative' }}>
                            <canvas ref={chartCanvasRef} className="w-full h-full"></canvas>
                        </div>
                    </div>
                </>
            )}

            {!isLoading && !errorMessage && infoItems.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                    请选择时间范围以加载热榜资讯。
                </div>
            )}
        </div>
    );
}

