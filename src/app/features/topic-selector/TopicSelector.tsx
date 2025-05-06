/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'; // Required for hooks and event handlers

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Chart, registerables } from 'chart.js/auto'; // Use auto registration
import {
    FaRobot, FaBook, FaNewspaper, FaFire, FaList, FaSpinner, FaBolt,
    FaChartBar, FaUser, FaBookOpenReader,FaArrowUpRightFromSquare,
    FaTrophy, FaLightbulb, FaUsers, FaArrowUpShortWide,
    FaArrowDownWideShort, FaTag, FaRegClock
} from 'react-icons/fa6'; // Using react-icons (Font Awesome 6)
import ApiSettingBlock, { ApiConfigProps } from '../../components/ApiSettingBlock';
import { generate } from '../../lib/api';

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

interface InfoItem {
    id: string | number;
    title: string;
    url?: string;
    desc?: string;
    hot: number;
    hotFormatted: string;
    source?: string;
}

interface HotTopic {
    id: string | number;
    title: string;
    url: string;
    hot: number | string; // API might return string
    type: string;
    update_v: string; // Original timestamp/string for sorting
    updateFormatted: string; // Formatted for display
}

interface OpenAiConfig {
    url: string;
    key: string;
    model: string;
    temperature: number;
}

type AppMode = 'books' | 'information' | 'topic';
type InfoTimeFrame = 'today' | 'weekly' | 'monthly' | null;
type HotTopicsSortKey = 'update_v' | 'hot';
type SortOrder = 'asc' | 'desc';

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

export default function HomePage() {
    // --- Common State ---
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [appMode, setAppMode] = useState<AppMode>('books');

    // --- Book Analysis State ---
    const [listType, setListType] = useState<string>('rising');
    const [books, setBooks] = useState<Book[]>([]);
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    // API 设置状态
    const [apiConfig, setApiConfig] = useState<ApiConfigProps>({
        apiProvider: 'openai',
        apiUrl: '',
        apiKey: '',
        model: ''
    })
    const [bookPagination, setBookPagination] = useState({ ...BOOK_PAGE_DEFAULTS });

    // --- Information Analysis State ---
    const [infoTimeFrame, setInfoTimeFrame] = useState<InfoTimeFrame>(null);
    const [infoItems, setInfoItems] = useState<InfoItem[]>([]);

    // --- Hot Topics State ---
    const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
    const [isHotTopicsLoading, setIsHotTopicsLoading] = useState(false);
    const [hotTopicsError, setHotTopicsError] = useState<string | null>(null);
    const [hotTopicsSortKey, setHotTopicsSortKey] = useState<HotTopicsSortKey>('update_v');
    const [hotTopicsSortOrder, setHotTopicsSortOrder] = useState<SortOrder>('desc');

    // --- Utility Functions ---
    const formatCount = useCallback((num: number | string | undefined | null): string => {
        const number = Number(num || 0);
        if (typeof number !== 'number' || isNaN(number)) return 'N/A';
        if (number >= 10000) return (number / 10000).toFixed(1) + '万';
        return number.toString();
    }, []);

    const formatTimestamp = useCallback((timestamp: string | number | undefined | null): string => {
        if (!timestamp) return 'N/A';
        try {
            let date: Date;
            if (/^\d+$/.test(String(timestamp))) {
                date = new Date(Number(timestamp)); // Assume ms timestamp if only digits
            } else {
                 // Try parsing various string formats
                 const parsedString = String(timestamp).replace(/-/g, '/').replace(/T/, ' ');
                 date = new Date(parsedString);
            }

            if (isNaN(date.getTime())) return String(timestamp); // Return original if invalid

            return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ` +
                   `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        } catch (e) {
            console.warn("Error formatting timestamp:", timestamp, e);
            return String(timestamp); // Return original on error
        }
    }, []);

    // --- Mode Switching ---
    const handleSetAppMode = useCallback((mode: AppMode) => {
        setAppMode(mode);
        setErrorMessage(null);
        // Optionally reset data or keep cache
        // setBooks([]);
        // setInfoItems([]);
        // setHotTopics([]);
        // setAiAnalysis(null);
        // if (chartInstanceRef.current) {
        //   chartInstanceRef.current.destroy();
        //   chartInstanceRef.current = null;
        // }
    }, []);

    // --- Book Analysis Methods ---
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
        let stars = '';
        for (let i = 0; i < 5; ++i) {
            // Using text characters for simplicity, replace with SVG later if preferred
            stars += i < ratingStar ? '★' : '☆';
        }
        // Or using react-icons directly (more complex state update needed)
        // For simplicity, stick to HTML string for dangerouslySetInnerHTML
        let starsHtml = '';
         for (let i = 0; i < 5; ++i) {
             starsHtml += `<span class="${i < ratingStar ? 'text-yellow-400' : 'text-gray-300'}">${i < ratingStar ? '★' : '☆'}</span>`;
         }

        return { html: starsHtml, score: ratingScore.toFixed(2) };
    }, []);

    const processBookData = useCallback((rawBooks: any[]): Book[] => {
        if (!Array.isArray(rawBooks)) return [];
        return rawBooks.map((b, index) => {
            const imgUrl = b.img_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%23cccccc' d='M352 0H160C71.6 0 0 71.6 0 160v192c0 88.4 71.6 160 160 160h192c88.4 0 160-71.6 160-160V160C512 71.6 440.4 0 352 0zM160 64h192c17.7 0 32 14.3 32 32s-14.3 32-32 32H160c-17.7 0-32-14.3-32-32s14.3-32 32-32zm192 384H160c-53 0-96-43-96-96V192h384v160c0 53-43 96-96 96z'/%3E%3C/svg%3E";
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

        const dataSnippet = bookArr.slice(0, 15).map(b => ({ // Send relevant fields
            title: b.title,
            author: b.author,
            ratingScore: b.ratingScore,
            readingCount: b.reading_count,
            desc: b.desc.substring(0, 100) + (b.desc.length > 100 ? '...' : '') // Limit desc length
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
              // response_format: { type: "json_object" }
            })
            const parsedResults = JSON.parse(data.content);

            if (typeof parsedResults === 'object' && parsedResults !== null) {
              return parsedResults as AiAnalysis;
            } else {
              throw new Error("AI 返回的不是有效的 JSON 对象。");
            }
        } catch (error: any) {
            console.error("OpenAI Analysis Error:", error);
            return { error: error };
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
        setLoadingMessage('正在获取图书榜单数据...');
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
            setLoadingMessage('');
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


    // --- Information Analysis Methods ---
    const buildInfoAPIUrl = useCallback((timeFrame: InfoTimeFrame) => {
        if (!timeFrame) return null;
        // Assuming page=1 for simplicity
        return `https://api.rebang.today/v1/items?tab=top&sub_tab=${encodeURIComponent(timeFrame)}&page=1&version=1`;
    }, []);

    const processInfoData = useCallback((rawItems: any[]): InfoItem[] => {
        if (!Array.isArray(rawItems)) return [];
        return rawItems.map((item, index) => {
            const hot = Number(item.heat_num || item.hot_num || item.hot || 0); // Check multiple possible keys
            return {
                id: item.id || item.url || `${item.title}-${index}`, // Ensure unique ID
                title: item.title || '无标题',
                url: item.url || item.mobile_url || item.www_url,
                desc: item.desc || item.description || '',
                hot: hot,
                hotFormatted: formatCount(hot),
                source: item.tab_key || item.site_name || item.source || '' // Check multiple keys
            };
        });
    }, [formatCount]);

    const fetchInformationData = useCallback(async (timeFrame: InfoTimeFrame) => {
        if (isLoading || !timeFrame) return;
        setInfoTimeFrame(timeFrame);

        setIsLoading(true);
        setLoadingMessage('正在获取热榜资讯...');
        setErrorMessage(null);
        setInfoItems([]); // Clear previous items

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
            // Adapt based on actual API response structure
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

        } catch (error: any) {
            console.error("Information Fetch/Process Error:", error);
            setErrorMessage(`资讯数据加载失败: ${error.message}`);
            setInfoItems([]);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [isLoading, buildInfoAPIUrl, processInfoData]); // Add dependencies

    // --- Hot Topics Methods ---
     const processHotTopicsData = useCallback((rawTopics: any[]): HotTopic[] => {
        if (!Array.isArray(rawTopics)) return [];

        // Flatten data if nested (like in the original example)
        const flattenedTopics = rawTopics.slice(0, 5).flatMap(group => group.data || group); // Adjust based on actual API structure

        return flattenedTopics.map((item, index) => ({
            id: item.index || item.id || `${item.title}-${index}`, // Ensure unique ID
            title: item.title || '无标题',
            url: item.url || item.mobil_url || '#',
            hot: item.hot || 0,
            type: item.type || '未知类型',
            update_v: item.update_v || item.timestamp || '', // Store original for sorting
            updateFormatted: formatTimestamp(item.update_v || item.timestamp) // Format for display
        }));
    }, [formatTimestamp]); // Depends on formatTimestamp

    const fetchHotTopics = useCallback(async () => {
        if (isHotTopicsLoading) return;
        setIsHotTopicsLoading(true);
        setHotTopicsError(null);
        // const apiUrl = '/api/hot-topics'; // Use a Next.js API route proxy
        const apiUrl = 'https://hot-api.vhan.eu.org/v2?type=all'; // Original API

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`热点话题API请求失败 (${response.status})`);
            const data = await response.json();

            // Adjust based on the actual structure returned by your proxy or the original API
            const rawTopics = data.data || data; // Common patterns

            if (!Array.isArray(rawTopics)) {
                throw new Error('未能从API获取到有效的热点话题列表数据。');
            }
            setHotTopics(processHotTopicsData(rawTopics));
        } catch (error: any) {
            console.error("Hot Topics Fetch/Process Error:", error);
            setHotTopicsError(`热点话题加载失败: ${error.message}`);
            setHotTopics([]);
        } finally {
            setIsHotTopicsLoading(false);
        }
    }, [isHotTopicsLoading, processHotTopicsData]); // Depends on processHotTopicsData

    // Method to change sorting for Hot Topics
    const setHotTopicsSort = useCallback((key: HotTopicsSortKey) => {
        setHotTopicsSortKey(prevKey => {
            if (prevKey === key) {
                // Toggle order if clicking the same key
                setHotTopicsSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
            } else {
                // Set new key, default to desc
                setHotTopicsSortOrder('desc');
            }
            return key; // Return the new key
        });
    }, []); // No dependencies

    // Computed property for sorted Hot Topics using useMemo
    const sortedHotTopics = useMemo(() => {
        const key = hotTopicsSortKey;
        const order = hotTopicsSortOrder === 'asc' ? 1 : -1;

        // Helper to safely convert potential string numbers/timestamps to numbers for sorting
        const getSortableValue = (value: any): number => {
             if (key === 'hot') {
                 // Remove non-numeric characters (like '万') and convert
                 return parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0;
             }
             if (key === 'update_v') {
                 // Try converting timestamp string/number to Date object time
                 try {
                     let date;
                     if (/^\d+$/.test(String(value))) {
                         date = new Date(Number(value));
                     } else {
                         const parsedString = String(value).replace(/-/g, '/').replace(/T/, ' ');
                         date = new Date(parsedString);
                     }
                     return isNaN(date.getTime()) ? 0 : date.getTime();
                 } catch {
                     return 0; // Fallback for unparseable dates
                 }
             }
             return 0; // Default fallback
        };

        return [...hotTopics].sort((a, b) => {
            const valA = getSortableValue(a[key]);
            const valB = getSortableValue(b[key]);
            return (valA - valB) * order;
        });
    }, [hotTopics, hotTopicsSortKey, hotTopicsSortOrder]); // Recalculate when these change


    // --- Lifecycle Hooks ---
    // useEffect(() => {
    //     // Load settings on initial mount
    //     loadSettings();
    //     // Optionally fetch initial data for the default mode
    //     // fetchBookDataAndAnalyze(true); // Fetch books on mount
    //     // fetchHotTopics(); // Fetch hot topics on mount
    // }, [loadSettings, fetchHotTopics]); // Add fetchBookDataAndAnalyze if called here

    // Effect to render chart when books data changes (and it's the first load)
    // Note: renderChart is now called within fetchBookDataAndAnalyze on first load.
    // This effect might be redundant or could be used for updates if needed.
    // useEffect(() => {
    //     if (appMode === 'books' && books.length > 0 && bookPagination.currentPage === 1) {
    //         renderChart(books);
    //     }
    // }, [books, appMode, bookPagination.currentPage, renderChart]);


    // --- Render ---
    return (
        <div className="min-h-screen flex flex-col">
            <main className="mx-auto flex-grow w-full">
                {/* API 设置部分 */}
                <ApiSettingBlock setApiConfig={setApiConfig} />

                {/* Mode Selection Tabs */}
                <nav className="flex border-b border-gray-200 mb-6 no-print mt-2">
                    <button
                        onClick={() => handleSetAppMode('books')}
                        className={`py-3 px-5 text-center border-b-2 focus:outline-none hover:bg-gray-100 transition duration-150 ease-in-out ${appMode === 'books' ? 'border-blue-500 text-blue-500 font-semibold' : 'border-transparent text-gray-500'}`}
                    >
                        <FaBook className="inline mr-2" /> 图书榜单
                    </button>
                    <button
                        onClick={() => handleSetAppMode('information')}
                        className={`py-3 px-5 text-center border-b-2 focus:outline-none hover:bg-gray-100 transition duration-150 ease-in-out ${appMode === 'information' ? 'border-blue-500 text-blue-500 font-semibold' : 'border-transparent text-gray-500'}`}
                    >
                        <FaNewspaper className="inline mr-2" /> 热榜资讯
                    </button>
                     <button
                        onClick={() => handleSetAppMode('topic')}
                        className={`py-3 px-5 text-center border-b-2 focus:outline-none hover:bg-gray-100 transition duration-150 ease-in-out ${appMode === 'topic' ? 'border-blue-500 text-blue-500 font-semibold' : 'border-transparent text-gray-500'}`}
                    >
                        <FaFire className="inline mr-2" /> 热门话题
                    </button>
                </nav>

                {errorMessage && (
                    <div className="my-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg text-center">
                        <FaRobot className="inline mr-2" /> {errorMessage}
                    </div>
                )}

                {/* == Book Analysis Section == */}
                {appMode === 'books' && (
                    <div>
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
                                        <FaRobot className="mr-2" /> AI分析与选题建议
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
                                        {isLoading && bookPagination.currentPage > 1 ? <FaSpinner className="animate-spin mr-2" /> : <FaRobot className="mr-2" />}
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
                                    <div className="mt-3 text-gray-700 text-sm book-desc border-t pt-2 border-gray-100">
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
                )}

                {/* == Information Analysis Section == */}
                {appMode === 'information' && (
                    <div>
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
                                        {frame === 'today' ? '今日热榜' : frame === 'weekly' ? '本周热榜' : '本月热榜'}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Information List */}
                        {infoItems.length > 0 && !isLoading && !errorMessage && (
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {infoItems.map((item, index) => (
                                    <div key={item.id} className="p-4 rounded-lg bg-white custom-shadow info-item-card flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start mb-2"> {/* Changed to items-start */}
                                                <span className="text-sm font-bold text-blue-600 mr-2 mt-px">#{index + 1}</span> {/* Added mt-px for alignment */}
                                                <h3 className="text-base font-semibold text-gray-800 leading-snug flex-1">{item.title}</h3>
                                            </div>
                                            {item.desc && (
                                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.desc}</p>
                                            )}
                                            <div className="text-xs text-gray-400 mb-2 flex flex-wrap gap-x-3">
                                                {item.source && (
                                                    <span className="inline-flex items-center"><FaRobot className="mr-1" /> {item.source}</span>
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

                        {/* Placeholder when no info items */}
                        {!isLoading && !errorMessage && infoItems.length === 0 && (
                            <div className="text-center text-gray-500 py-10">
                                请选择时间范围以加载热榜资讯。
                            </div>
                        )}
                    </div>
                )}

                 {/* == Hot Topics Section == */}
                {appMode === 'topic' && (
                    <div>
                        <section className="p-5 rounded-lg custom-shadow bg-white flex flex-col mt-6 no-print print-shadow-none print-bg-white">
                             <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                                    <FaFire className="mr-2 text-purple-500" /> 热门话题
                                </h2>
                                <button
                                    onClick={fetchHotTopics}
                                    disabled={isHotTopicsLoading}
                                    className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 disabled:opacity-50"
                                >
                                    {isHotTopicsLoading ? <FaSpinner className="animate-spin inline mr-1" /> : <FaRobot className="inline mr-1" />}
                                    刷新话题
                                </button>
                            </div>

                            {/* Sorting Controls */}
                            <div className="text-sm space-x-3 mb-4 border-b pb-3 border-gray-200">
                                <span className="text-gray-500">排序:</span>
                                <button
                                    onClick={() => setHotTopicsSort('update_v')}
                                    className={`hover:text-blue-500 transition ${hotTopicsSortKey === 'update_v' ? 'text-blue-600 font-semibold' : ''}`}
                                >
                                    更新时间
                                    {hotTopicsSortKey === 'update_v' && (
                                        hotTopicsSortOrder === 'asc' ? <FaArrowUpShortWide className="inline ml-1" /> : <FaArrowDownWideShort className="inline ml-1" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setHotTopicsSort('hot')}
                                    className={`hover:text-blue-500 transition ${hotTopicsSortKey === 'hot' ? 'text-blue-600 font-semibold' : ''}`}
                                >
                                    热度
                                    {hotTopicsSortKey === 'hot' && (
                                        hotTopicsSortOrder === 'asc' ? <FaArrowUpShortWide className="inline ml-1" /> : <FaArrowDownWideShort className="inline ml-1" />
                                    )}
                                </button>
                            </div>

                            {/* Loading State for Hot Topics */}
                            {isHotTopicsLoading && (
                                <div className="my-6 text-center text-lg text-blue-500 font-semibold">
                                    <FaSpinner className="animate-spin inline mr-3" /> 正在加载热点话题...
                                </div>
                            )}
                            {/* Error State for Hot Topics */}
                            {hotTopicsError && (
                                <div className="my-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg text-center">
                                    <FaRobot className="inline mr-2" /> {hotTopicsError}
                                </div>
                            )}

                            {/* Hot Topics List */}
                            {!isHotTopicsLoading && !hotTopicsError && sortedHotTopics.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-120 overflow-y-auto scrollbar-hide p-1"> {/* Added max-h and overflow */}
                                    {sortedHotTopics.map((topic, index) => (
                                        <div key={topic.url} className="p-3 rounded-lg bg-white custom-shadow info-item-card flex flex-col justify-between space-y-2 border border-gray-100">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start mb-1">
                                                    <span className="text-xs font-semibold text-purple-600 mr-2 mt-px">#{index + 1}</span>
                                                    <a
                                                        href={topic.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-medium text-gray-800 hover:text-blue-600 leading-snug flex-1"
                                                        title={topic.title}
                                                    >
                                                        {topic.title}
                                                        <FaArrowUpRightFromSquare className="inline-block text-xs ml-1 opacity-60" />
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
                            )}
                            {/* Placeholder when no hot topics found */}
                            {!isHotTopicsLoading && !hotTopicsError && sortedHotTopics.length === 0 && (
                                <div className="text-center text-gray-400 py-8">
                                    未能找到相关热点话题，或 <button onClick={fetchHotTopics} className="text-blue-500 underline">尝试刷新</button>。
                                </div>
                            )}
                        </section>
                    </div>
                )}

            </main>

            {/* Footer */}
            {/* <footer className="w-full text-center text-gray-400 text-xs py-4 mt-8 no-print">
                &copy; {new Date().getFullYear()} 选题情报员 | 数据源:
                <a href="https://rebang.today" target="_blank" rel="noopener noreferrer" className="mx-1">热榜API</a>+
                <a href="https://hot.vvhan.com" target="_blank" rel="noopener noreferrer" className="mx-1">vvhanAPI</a>
            </footer> */}
        </div>
    );
}
