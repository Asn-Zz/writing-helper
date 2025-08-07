'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { FaBilibili, FaWeibo, FaZhihu, FaRegNewspaper, FaCat, FaSpinner, FaArrowUpRightFromSquare, FaTriangleExclamation, FaVideo, FaList, FaGrip } from 'react-icons/fa6';

// Types
interface HotListItem {
    title: string;
    hot: string;
    link: string;
}

const fetchHotList = async (source: string): Promise<HotListItem[]> => {
    const response = await fetch(`https://api.vvhan.com/api/hotlist/${source}`);
    if (!response.ok) {
        throw new Error(`请求'${source}'热榜失败 (状态码: ${response.status})`);
    }
    const result = await response.json();
    if (!result.success || !Array.isArray(result.data)) {
        throw new Error(`API返回无效数据: ${result.msg || '未知错误'}`);
    }
    return result.data.map((item: any) => ({
        title: item.title,
        hot: item.hot,
        link: item.url || item.link || '#',
    }));
};

export default function HotLists() {
    const [activeSource, setActiveSource] = useState('bili');
    const [listData, setListData] = useState<HotListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid' | ''>('');
    const [allListsData, setAllListsData] = useState<Record<string, HotListItem[]>>({});
    const [isGridLoading, setIsGridLoading] = useState(false);
    const [gridError, setGridError] = useState<string | null>(null);

    const sources = useMemo(() => [
        { id: 'bili', name: 'Bilibili', icon: <FaBilibili /> },
        { id: 'wbHot', name: '微博', icon: <FaWeibo /> },
        { id: 'zhihuHot', name: '知乎', icon: <FaZhihu /> },
        { id: 'douyinHot', name: '抖音', icon: <FaVideo /> },
        { id: 'toutiao', name: '头条', icon: <FaRegNewspaper /> },
        { id: 'baiduRD', name: '百度', icon: <FaCat /> },
    ], []);

    const loadData = useCallback(async (source: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchHotList(source);
            setListData(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadAllData = useCallback(async () => {
        setIsGridLoading(true);
        setGridError(null);
        try {
            const results = await Promise.all(sources.map(async (source) => {
                try {
                    const data = await fetchHotList(source.id);
                    return { id: source.id, data, status: 'fulfilled' as const };
                } catch (error) {
                    return { id: source.id, error, status: 'rejected' as const };
                }
            }));
    
            const newData: Record<string, HotListItem[]> = {};
            
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    newData[result.id] = result.data;
                } else {
                    console.error(`Failed to load list for ${result.id}:`, result.error);
                }
            });
    
            if (Object.keys(newData).length === 0 && sources.length > 0) {
                setGridError('所有榜单都加载失败了。');
            }
    
            setAllListsData(newData);
        } catch (e: any) {
            setGridError(e.message);
        } finally {
            setIsGridLoading(false);
        }
    }, [sources]);

    useEffect(() => {
        if (viewMode === 'list') {
            loadData(activeSource);
        } else if (viewMode === 'grid') {
            if (Object.keys(allListsData).length === 0 && !gridError) {
                loadAllData();
            }
        }
    }, [viewMode, activeSource, loadData, loadAllData, allListsData, gridError]);

    return (
        <section className="p-5 rounded-lg custom-shadow bg-white flex flex-col mt-6 no-print">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                    各大平台热门榜单
                </h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-blue-100'}`}>
                        <FaGrip />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-500 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-blue-100'}`}>
                        <FaList />
                    </button>
                </div>
            </div>

            {viewMode === 'list' && (
                <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-3">
                    {sources.map(source => (
                        <button
                            key={source.id}
                            onClick={() => setActiveSource(source.id)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors duration-150 ${
                                activeSource === source.id
                                    ? 'bg-blue-500 text-white shadow'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <span className="mr-1.5 text-lg">{source.icon}</span>
                            {source.name}
                        </button>
                    ))}
                </div>
            )}

            <div className={`overflow-y-auto scrollbar-hide ${viewMode === 'list' ? 'h-[41rem]' : ''}`}>
                {viewMode === '' && (
                    <div className="flex flex-col gap-2 justify-center items-center h-full">
                        <span className="ml-3 text-gray-500">点击列表或网格按钮选择查看更多</span>
                        <img src="https://60s.viki.moe/v2/60s?encoding=image-proxy" alt="" className="w-1/2 max-h-[60rem] object-contain" />
                    </div>
                )}

                {viewMode === 'list' && (
                    <>
                        {isLoading && (
                             <div className="flex justify-center items-center h-full">
                                <FaSpinner className="animate-spin text-2xl text-blue-500" />
                                <span className="ml-3 text-gray-500">正在加载 {sources.find(s=>s.id === activeSource)?.name} 热榜...</span>
                             </div>
                        )}
                        {error && (
                            <div className="flex flex-col justify-center items-center h-full text-red-500">
                                <FaTriangleExclamation className="text-3xl mb-2" />
                                <p className="font-semibold">加载失败</p>
                                <p className="text-sm">{error}</p>
                                <button
                                    onClick={() => loadData(activeSource)}
                                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    重试
                                </button>
                            </div>
                        )}
                        {!isLoading && !error && (
                             <ul className="space-y-1">
                                {listData.map((item, index) => (
                                    <li key={index} className="p-2.5 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                                        <a
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-start text-sm text-gray-800 hover:text-blue-600"
                                        >
                                            <span className="text-blue-500 font-semibold w-8 text-center">{index + 1}.</span>
                                            <span className="flex-1">{item.title}</span>
                                            <FaArrowUpRightFromSquare className="text-xs ml-2 opacity-50" />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                         {!isLoading && listData.length === 0 && !error && (
                            <div className="text-center py-8 text-gray-400">
                                未能找到相关榜单数据。
                            </div>
                        )}
                    </>
                )}

                {viewMode === 'grid' && (
                    <>
                        {isGridLoading && (
                             <div className="flex justify-center items-center h-full">
                                <FaSpinner className="animate-spin text-2xl text-blue-500" />
                                <span className="ml-3 text-gray-500">正在加载所有榜单...</span>
                             </div>
                        )}
                        {gridError && (
                            <div className="flex flex-col justify-center items-center h-full text-red-500">
                                <FaTriangleExclamation className="text-3xl mb-2" />
                                <p className="font-semibold">加载失败</p>
                                <p className="text-sm">{gridError}</p>
                                <button
                                    onClick={() => loadAllData()}
                                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    重试
                                </button>
                            </div>
                        )}
                        {!isGridLoading && !gridError && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {sources.map(source => (
                                    <div key={source.id} className="bg-white border border-gray-200/80 rounded-xl p-5 flex flex-col transition-all duration-300 ease-in-out hover:shadow-lg hover:border-blue-300">
                                        <h3 className="text-lg font-bold text-gray-800 flex items-center mb-4 pb-3 border-b border-gray-200/80">
                                            <span className="mr-3 text-2xl text-blue-500">{source.icon}</span>
                                            {source.name}
                                        </h3>
                                        {allListsData[source.id] && allListsData[source.id].length > 0 ? (
                                            <ul className="space-y-1 text-sm flex-grow -my-1">
                                                {allListsData[source.id].slice(0, 10).map((item, index) => (
                                                     <li key={index} className="truncate py-1.5 rounded-md hover:bg-blue-50">
                                                         <a href={item.link} target="_blank" rel="noopener noreferrer" title={item.title} className="flex items-center text-gray-700 hover:text-blue-600 transition-colors">
                                                             <span className="font-bold text-sm w-7 text-center text-blue-500/80">{index + 1}</span>
                                                             <span className="flex-1 truncate">{item.title}</span>
                                                         </a>
                                                     </li>
                                                ))}
                                            </ul>
                                        ) : (
                                             <div className="text-gray-400 text-sm flex-grow flex items-center justify-center">未能加载此榜单</div>
                                        )}
                                        {allListsData[source.id] && allListsData[source.id].length > 10 && (
                                            <button 
                                                onClick={() => {
                                                    setActiveSource(source.id);
                                                    setViewMode('list');
                                                }} 
                                                className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs rounded-full px-4 py-1.5 self-center mt-3 transition-all duration-200 ease-in-out"
                                            >
                                                查看全部
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
