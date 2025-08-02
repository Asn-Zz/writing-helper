'use client'; // Required for hooks and event handlers

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Chart, registerables } from 'chart.js/auto'; // Use auto registration
import {
    FaRobot, FaList, FaSpinner, FaBolt,
    FaChartBar, FaUser, FaBookOpenReader,FaArrowUpRightFromSquare,
    FaTrophy, FaLightbulb, FaUsers, FaFire, FaRotate, FaRotateRight
} from 'react-icons/fa6'; // Using react-icons (Font Awesome 6)
import { useApiSettings } from '@/app/components/ApiSettingsContext';
import { generate } from '@/app/lib/api';

// Register Chart.js components
Chart.register(...registerables);

// Define types for better code quality
interface Book {
    id: string | number;
    title: string;
    desc: string;
    author: string;
    newRating: number;
    reading_count: number;
    imgUrl: string;
    www_url?: string;
    rating_title?: string;
    starsHtml: string; // Keep as string for dangerouslySetInnerHTML
    ratingScore: string; // Keep as string (e.g., "4.50")
    readingCountFormatted: string;
}

interface AiAnalysis {
    trend?: string;
    preference?: string;
    top5?: { title: string; reason: string }[];
    suggestion?: { suggestion: string; reason: string }[];
    error?: string;
}

const BOOK_PAGE_DEFAULTS = { currentPage: 1, startPage: 1, endPage: 20, pageSize: 20 };

const bookTabMap: Record<string, { name: string; query: string }> = {
    'rising': { name: '飙升榜', query: 'rising' },
    'newbook': { name: '新书榜', query: 'newbook' },
    'general_novel_rising': { name: '小说榜', query: 'general_novel_rising' },
    'all': { name: '总榜', query: 'all' },
    'newrating_publish': { name: '神作榜', query: 'newrating_publish' },
    'newrating_potential_publish': { name: '神作潜力榜', query: 'newrating_potential_publish' },
    'hot_search': { name: '热搜榜', query: 'hot_search' },
    'dang_bestsell': { name: '当当图书畅销榜(7天)', query: 'bestsell' }
};

export default function BookAnalysis() {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [listType, setListType] = useState<string>('rising');
    const [books, setBooks] = useState<Book[]>([]);
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const { apiConfig } = useApiSettings();
    const [bookPagination, setBookPagination] = useState({ ...BOOK_PAGE_DEFAULTS });

    const formatCount = useCallback((num: number | string | undefined | null): string => {
        const number = Number(num || 0);
        if (typeof number !== 'number' || isNaN(number)) return 'N/A';
        if (number >= 10000) return (number / 10000).toFixed(1) + '万';
        return number.toString();
    }, []);

    const buildBookAPIUrl = useCallback((tabKey: string, page: number) => {
        const tabQuery = bookTabMap[tabKey]?.query;
        if (!tabQuery) return null;

        if (tabQuery === 'bestsell') {
            // Note: This Dangdang URL might expire or change. Consider a more stable proxy/backend if possible.
            return `https://api.dangdang.com/mapi/mina/index.php?action=bang_tushu&user_client=mina&client_version=1.0&time_code=1be79c8e40b195426d05597896044340&timestamp=1745416946&udid=f041743f64c89ea6b92d7f28fbddb170&permanent_id=20250423220036181526790323274410829&mini_cv=3.114.2&ua=mac%20os%20x%2013.3.1&global_province_id=111&is_support_ebook_buy=0&cat_path=01.00.00.00.00.00&catpath=01.00.00.00.00.00&cat_path_text=%E6%80%BB%E6%A6%9C&bang_name=bestsell&bang_name_text=%E5%9B%BE%E4%B9%A6%E7%95%85%E9%94%80%E6%A6%9C&bang_name_show_text=%E5%9B%BE%E4%B9%A6%E7%95%85%E9%94%80%E6%A6%9C&time_region=recent7&time_region_text=%E8%BF%917%E5%A4%A9&page=${page}&img_size=b&pagesize=20`;
        } else {
            return `https://api.rebang.today/v1/items?tab=weread&sub_tab=${encodeURIComponent(tabQuery)}&page=${page}&version=1`;
        }
    }, []);

    const generateStars = useCallback((rating: number | string | undefined | null): { html: string; score: string } => {
        const numericRating = Number(rating) || 0;
        const ratingScore = numericRating / 200; // Assuming scale is 0-1000 like WeRead
        const ratingStar = Math.round(ratingScore); // Round to nearest half or full star if needed, here full star
        let starsHtml = '';
         for (let i = 0; i < 5; ++i) {
             starsHtml += `<span class="${i < ratingStar ? 'text-yellow-400' : 'text-gray-300'}">${i < ratingStar ? '★' : '☆'}</span>`;
         }

        return { html: starsHtml, score: ratingScore.toFixed(2) };
    }, []);

    const processBookData = useCallback((rawBooks: any[]): Book[] => {
        if (!Array.isArray(rawBooks)) return [];
        return rawBooks.map((b, index) => {
            const rawImgUrl = b.img ? 'https://img.rebang.today/' + b.img : '';
            const imgUrl = rawImgUrl ? '/api/proxy?url=' + encodeURIComponent(rawImgUrl) : b.img_url;
            const starsInfo = generateStars(b.newRating || b.score);
            const readingCount = Number(b.reading_count || b.review_total) || 0;
            return {
                id: b.id || b.product_id || `${b.title}-${index}`, // Ensure unique ID
                title: b.title || b.product_name || '无标题',
                desc: (b.desc || b.publisher || '').replace(/\\n/g, '\n').trim(),
                author: b.author || '佚名',
                newRating: Number(b.newRating) || 0,
                reading_count: readingCount,
                imgUrl: imgUrl,
                www_url: b.www_url || '',
                rating_title: b.rating_title || '',
                starsHtml: starsInfo.html,
                ratingScore: starsInfo.score,
                readingCountFormatted: formatCount(readingCount)
            };
        });
    }, [generateStars, formatCount]);

    const renderChart = useCallback((bookData: Book[]) => {
        if (!chartCanvasRef.current || bookData.length === 0) return;
        const ctx = chartCanvasRef.current.getContext('2d');
        if (!ctx) return;

        // Destroy previous chart instance if it exists
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }

        const topBooks = bookData.slice(0, 10);

        chartInstanceRef.current = new Chart(ctx, {
            type: "bar",
            data: {
                labels: topBooks.map(b => b.title.substring(0, 10) + (b.title.length > 10 ? '...' : '')),
                datasets: [
                    {
                        label: "评分 (最高5)",
                        data: topBooks.map(b => parseFloat(b.ratingScore)), // Ensure numeric
                        backgroundColor: "rgba(59, 130, 246, 0.7)", // blue-500
                        borderColor: "rgba(59, 130, 246, 1)",
                        borderWidth: 1,
                        yAxisID: 'yRating',
                        borderRadius: 5
                    },
                    {
                        label: "阅读量 (万)",
                        data: topBooks.map(b => parseFloat((b.reading_count / 10000).toFixed(1))), // Ensure numeric
                        backgroundColor: "rgba(245, 158, 11, 0.6)", // amber-500
                        borderColor: "rgba(245, 158, 11, 1)",
                        borderWidth: 1,
                        yAxisID: 'yReading',
                        borderRadius: 5
                    }
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: {
                        ticks: { font: { size: 10 } }
                    },
                    yRating: {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: '评分' },
                        min: 0,
                        suggestedMax: 5,
                        grid: { drawOnChartArea: true, color: '#e5e7eb' } // gray-200
                    },
                    yReading: {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: '阅读量 (万)' },
                        min: 0,
                        grid: { drawOnChartArea: false },
                        ticks: { callback: value => `${value}万` }
                    }
                },
                plugins: {
                    title: { display: false },
                    legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                    if (context.datasetIndex === 1) label += '万';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }, []); // No dependencies needed if it only uses the passed bookData

    const analyzeWithOpenAI = useCallback(async (bookArr: Book[], tabName: string): Promise<AiAnalysis> => {
        setIsAiAnalyzing(true);
        setAiAnalysis(null); // Clear previous analysis

        const dataSnippet = bookArr.map(b => ({ // Send relevant fields
            title: b.title,
            author: b.author,
            ratingScore: b.ratingScore,
            readingCount: b.reading_count,
            desc: b.desc
        }));

        const prompt = `
你是资深的图书编辑和市场分析师AI。请基于以下提供的 "${tabName}" 图书榜单数据 (JSON格式)，进行深入分析并严格按照指定的JSON格式返回结果。

分析要求:
1.  **榜单热榜趋势 (trend)**: 总结当前榜单反映出的主要内容热榜、题材或类型趋势。
2.  **读者偏好分析 (preference)**: 基于数据推断当前读者的阅读偏好，例如喜欢的风格、主题领域等。
3.  **Top 5 书籍点评 (top5)**: 选择榜单中综合表现（评分、阅读量等）最突出的前5本书，为每本书提供详细的入选理由或亮点分析。请包含 title 和 reason 字段。
4.  **选题策划建议 (suggestion)**: 基于以上分析，提出1-3条具有可行性的新书选题方向或出版策略建议。每条建议包含 suggestion (建议内容) 和 reason (详细理由) 字段。

请确保输出是**纯粹的JSON对象**，不包含任何额外的解释、注释或markdown标记 (如 \`\`\`json ... \`\`\`)。

榜单数据如下:
${JSON.stringify(dataSnippet, null, 2)}
`;

        try {
            const data = await generate({
              ...apiConfig,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              response_format: { type: "json_object" }
            })
            const parsedResults = JSON.parse(data.content);

            if (typeof parsedResults === 'object' && parsedResults !== null) {
              return parsedResults as AiAnalysis;
            } else {
              throw new Error("AI 返回的不是有效的 JSON 对象。");
            }
        } catch (error: any) {
            console.error("OpenAI Analysis Error:", error);
            return { error: error.message };
        } finally {
            setIsAiAnalyzing(false);
        }
    }, [apiConfig]); // Depends on openaiConfig

    const fetchBookDataAndAnalyze = useCallback(async (isNewSearch: boolean = true) => {
        if (isLoading) return;

        let currentPage = bookPagination.currentPage;
        if (isNewSearch) {
            setBookPagination({ ...BOOK_PAGE_DEFAULTS }); // Reset pagination
            currentPage = BOOK_PAGE_DEFAULTS.currentPage;
            setBooks([]); // Clear previous books immediately for new search
            setAiAnalysis(null);
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        } else {
            // Increment page for "next batch"
            currentPage = bookPagination.currentPage + 1;
            setBookPagination(prev => ({
                ...prev,
                currentPage: prev.currentPage + 1,
                startPage: prev.endPage + 1,
                endPage: (prev.currentPage + 1) * prev.pageSize
            }));
        }


        setIsLoading(true);
        setErrorMessage(null);

        const apiUrl = buildBookAPIUrl(listType, currentPage);
        if (!apiUrl) {
            setErrorMessage('无效的图书榜单类型选择。');
            setIsLoading(false);
            return;
        }

        try {
            // Use a proxy if CORS issues arise with dangdang or other APIs
            // const proxyUrl = `/api/proxy?url=${encodeURIComponent(apiUrl)}`;
            // const response = await fetch(proxyUrl);
            const response = await fetch(apiUrl);

            if (!response.ok) throw new Error(`图书API请求失败 (${response.status})`);
            const data = await response.json();

            let rawBooksData: any[] = [];
            // Adapt parsing based on different API structures
            if (listType === 'dang_bestsell' && Array.isArray(data?.data?.saleList?.[0]?.product_list)) {
                 rawBooksData = data.data.saleList[0].product_list;
            } else if (Array.isArray(data?.products)) {
                 rawBooksData = data.products;
            } else if (typeof data.data?.list === 'string') {
                 try { rawBooksData = JSON.parse(data.data.list); } catch (e) { console.error("Failed to parse data.data.list string:", e); }
            } else if (Array.isArray(data.list)) {
                 rawBooksData = data.list;
            } else if (typeof data.list === 'string') {
                 try { rawBooksData = JSON.parse(data.list); } catch (e) { console.error("Failed to parse data.list string:", e); }
            } else if (Array.isArray(data.data)) { // Another common pattern
                 rawBooksData = data.data;
            }


            if (!Array.isArray(rawBooksData) || rawBooksData.length === 0) {
                 // Don't throw error if it's just an empty page result for pagination
                 if (isNewSearch) throw new Error('未能从API获取到有效的图书列表数据。');
                 else console.log("No more books found for this page."); // Or set a state to indicate end of results
            }

            const newBooks = processBookData(rawBooksData);

            if (newBooks.length > 0) {
                // Append books if paginating, replace if new search
                // setBooks(prevBooks => isNewSearch ? newBooks : [...prevBooks, ...newBooks]);
                // Only render chart/start AI on the first batch (new search)

                setBooks(newBooks)

                setTimeout(() => {
                  renderChart(newBooks);
                }, 500);
            } else if (isNewSearch) {
                // Throw error only if the *first* fetch yields nothing
                throw new Error('处理后的图书列表为空。');
            }

        } catch (error: any) {
            console.error("Book Fetch/Process Error:", error);
            setErrorMessage(`图书数据加载失败: ${error.message}`);
            if (isNewSearch) setBooks([]); // Clear books on error for new search
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, bookPagination, listType, buildBookAPIUrl, processBookData, renderChart]); // Add dependencies

    const handleBookFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        fetchBookDataAndAnalyze(true); // True indicates a new search
    };

    const handleChangeBookBatch = () => {
        fetchBookDataAndAnalyze(false); // False indicates fetching next batch
    };

    const startBookAnalyzeWithOpenAIHandler = useCallback(() => {
        if (!books.length) {
            setAiAnalysis({ error: '没有可供AI分析的图书数据。' });
            return;
        }
        const currentTabName = bookTabMap[listType]?.name || '当前榜单';
        analyzeWithOpenAI(books, currentTabName)
            .then(setAiAnalysis) // Directly set the result
            .catch(err => { // Should be caught within analyzeWithOpenAI, but just in case
                console.error("AI Analysis background task failed:", err);
                setAiAnalysis({ error: `执行AI分析时出错: ${err.message}` });
            });
    }, [books, listType, analyzeWithOpenAI]);

    useEffect(() => {
        if (books.length > 0) {
            renderChart(books);
        }
    }, [books, renderChart]);

    return (
        <div>
            {errorMessage && (
                <div className="my-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg text-center">
                    <FaRobot className="inline mr-2" /> {errorMessage}
                </div>
            )}
            {/* Query Form */}
            <section className="p-5 rounded-lg custom-shadow bg-white flex flex-col mb-6 no-print print-shadow-none print-bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                        <FaList className="mr-2 text-blue-400" /> 选择榜单 & 触发分析
                    </h2>
                </div>
                <form onSubmit={handleBookFormSubmit} className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-3 md:space-y-0">
                    <div className="flex-1">
                        <label htmlFor="listType" className="block font-medium text-gray-600 mb-1">榜单类型</label>
                        <select
                            id="listType"
                            value={listType}
                            onChange={(e) => setListType(e.target.value)}
                            className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" // Added bg-white for consistency
                        >
                            {Object.entries(bookTabMap).map(([key, tab]) => (
                                <option key={key} value={key}>{tab.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end h-full">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-500 flex items-center justify-center px-5 py-2 rounded-lg text-white font-semibold hover:bg-blue-600 shadow transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                        >
                            {isLoading && bookPagination.currentPage === 1 ? <FaSpinner className="animate-spin mr-2" /> : <FaBolt className="mr-2" />}
                            {isLoading && bookPagination.currentPage === 1 ? '分析中...' : '开始分析'}
                        </button>
                    </div>
                </form>
            </section>

            {/* Analysis & Chart Section (only shown if book data exists and not loading initial data) */}
            {books.length > 0 && !isLoading && !errorMessage && (
                <>
                    {/* AI Analysis */}
                    <div className="bg-white rounded-xl shadow p-6 mb-6 print-shadow-none print-bg-white">
                        <h2 className="text-xl font-semibold text-green-600 mb-4 flex items-center">
                            <FaRobot className="mr-2" /> AI分析与选题建议 {aiAnalysis && <FaRotate className='ml-3' onClick={startBookAnalyzeWithOpenAIHandler} />}
                            {isAiAnalyzing && (
                                <span className="ml-3 text-sm text-gray-500">
                                    <FaSpinner className="animate-spin inline mr-1" /> 正在生成...
                                </span>
                            )}
                        </h2>
                        {aiAnalysis ? (
                            <div className="space-y-3 text-gray-800 text-sm md:text-base">
                                {aiAnalysis.trend && (
                                    <div>
                                        <span className="font-semibold text-gray-700"><FaFire className="inline text-red-400 mr-1" /> 热榜趋势：</span>
                                        <p className="ml-5 whitespace-pre-line">{aiAnalysis.trend}</p>
                                    </div>
                                )}
                                {aiAnalysis.preference && (
                                    <div>
                                        <span className="font-semibold text-gray-700"><FaUsers className="inline text-green-400 mr-1" /> 读者偏好：</span>
                                        <p className="ml-5 whitespace-pre-line">{aiAnalysis.preference}</p>
                                    </div>
                                )}
                                {aiAnalysis.top5 && aiAnalysis.top5.length > 0 && (
                                    <div>
                                        <span className="font-semibold text-gray-700"><FaTrophy className="inline text-yellow-400 mr-1" /> TOP5 书籍点评：</span>
                                        <ol className="list-decimal pl-8 mt-1 space-y-1">
                                            {aiAnalysis.top5.map((item, index) => (
                                                <li key={index}>
                                                    <strong className="text-gray-700">{item.title}</strong> - {item.reason}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}
                                {aiAnalysis.suggestion && aiAnalysis.suggestion.length > 0 && (
                                    <div>
                                        <span className="font-semibold text-gray-700"><FaLightbulb className="inline text-blue-400 mr-1" /> 选题建议：</span>
                                        <ul className="list-disc pl-8 mt-1 space-y-1">
                                            {aiAnalysis.suggestion.map((item, index) => (
                                                <li key={index}>
                                                    <strong>{item.suggestion}</strong> - {item.reason}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {aiAnalysis.error && (
                                    <div className="text-red-500">
                                        <FaRobot className="inline mr-1" /> AI分析出错: {aiAnalysis.error}
                                    </div>
                                )}
                                {!aiAnalysis.trend && !aiAnalysis.preference && !aiAnalysis.top5?.length && !aiAnalysis.suggestion?.length && !aiAnalysis.error && (
                                    <div className="text-gray-500">
                                        AI未能生成有效分析，请检查AI设置或稍后重试。
                                    </div>
                                )}
                            </div>
                        ) : (
                            !isAiAnalyzing && (
                                <div className="text-gray-400 cursor-pointer" onClick={startBookAnalyzeWithOpenAIHandler}>
                                    点击生成AI分析结果
                                </div>
                            )
                        )}
                    </div>

                    {/* Data Visualization */}
                    <div className="bg-white rounded-xl shadow p-6 mb-8 print-shadow-none print-bg-white">
                        <h2 className="text-xl font-semibold text-blue-600 mb-4 flex items-center">
                            <FaChartBar className="mr-2" /> {bookTabMap[listType]?.name} - 图书数据概览 (Top 10)
                        </h2>
                        <div style={{ height: '350px', position: 'relative' }}>
                            <canvas ref={chartCanvasRef} className="w-full h-full"></canvas>
                        </div>
                    </div>

                    {/* Pagination Button */}
                    <div className="flex items-center justify-center mb-8 no-print">
                        <button
                            onClick={handleChangeBookBatch}
                            disabled={isLoading}
                            className="bg-blue-500 flex items-center justify-center px-5 py-2 rounded-lg text-white font-semibold hover:bg-blue-600 shadow transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                        >
                            {isLoading && bookPagination.currentPage > 1 ? <FaSpinner className="animate-spin mr-2" /> : <FaRotateRight className="mr-2" />}
                            {isLoading && bookPagination.currentPage > 1 ? '加载中...' : `下一批(${bookPagination.endPage + 1}-${bookPagination.endPage + bookPagination.pageSize})`}
                        </button>
                    </div>
                </>
            )}

            {/* Book List */}
            <section id="booksPanel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {books.map((book, index) => (
                    <div key={book.id} className="p-4 rounded-lg flex flex-col bg-white custom-shadow print-shadow-none print-bg-white book-card">
                        <div className="flex items-start space-x-4">
                            <div className="flex-none w-20 h-28 bg-gray-100 flex items-center justify-center overflow-hidden rounded border border-gray-200">
                                {/* Consider using Next/Image for optimization */}
                                <img src={book.imgUrl} alt={`${book.title} cover`} className="w-full h-full object-cover" loading="lazy" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center mb-1">
                                    <span className="text-base font-bold text-blue-600 mr-2">#{bookPagination.startPage + index}</span>
                                    <span className="text-base font-semibold truncate" title={book.title}>{book.title}</span>
                                </div>
                                <div className="text-xs text-gray-500 mb-1">
                                    <FaUser className="inline mr-1" /> {book.author}
                                </div>
                                <div className="text-xs text-gray-500 mb-1 flex items-center flex-wrap">
                                    {/* Use dangerouslySetInnerHTML for pre-generated star HTML */}
                                    <span className="mr-1 flex items-center" dangerouslySetInnerHTML={{ __html: book.starsHtml }}></span>
                                    <span>({book.ratingScore})</span>
                                    <span className="mx-1">|</span>
                                    <FaBookOpenReader className="inline ml-1 mr-1" /> {book.readingCountFormatted}
                                </div>
                                {book.www_url && (
                                    <a href={book.www_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700 inline-flex items-center mt-1">
                                        微信读书 <FaArrowUpRightFromSquare className="ml-1" />
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className="mt-3 text-gray-700 text-sm book-desc border-t pt-2 border-gray-100 line-clamp-4">
                            {book.desc || '暂无描述'}
                        </div>
                    </div>
                ))}
            </section>

            {/* Placeholder when no books */}
            {!isLoading && !errorMessage && books.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                    请选择榜单并点击“开始分析”以查看图书数据。
                </div>
            )}
        </div>
    );
}
