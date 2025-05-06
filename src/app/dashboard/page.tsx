// app/page.tsx
'use client'; // Needed for useState, useEffect, and event handlers

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link'; // Use Next.js Link for internal navigation if needed
import Image from 'next/image'; // Optional: Use Next.js Image for optimization
import {
    FaRocket, FaSpellCheck, FaImage, FaRobot, FaEdit, FaPenFancy,
    FaComments, FaEye, FaTimes, FaBolt, FaMagic, FaLayerGroup
} from 'react-icons/fa'; // Import icons from react-icons
import './style.css'; // Import your CSS file for styling

// Define the type for a tool item
interface Tool {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType; // Use React.ElementType for component type
    iconColor: string;
    tagText: string;
    tagBg: string;
    tagTextCol: string;
    url: string;
    snapshotImage: string; // Keep as string for URL or data URI
}

// Tool data (moved outside the component for clarity)
const toolsData: Tool[] = [
    {
      id: 'topic-office',
      title: '选题情报员',
      description: '多维图书数据分析与选题推荐',
      icon: FaRobot,
      iconColor: 'text-blue-500',
      tagText: '数据分析',
      tagBg: 'bg-blue-100',
      tagTextCol: 'text-blue-600',
      url: '/features/topic-selector', // Assuming these are in the public folder
      snapshotImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlZmY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzRmNDZlNSI+5paw5aqS5L2T57yW6L6TPC90ZXh0Pjwvc3ZnPg==' // Placeholder SVG
    },
    {
      id: 'writing',
      title: '写作助手',
      description: '由先进的大语言模型驱动的智能写作助手',
      icon: FaPenFancy,
      iconColor: 'text-green-500', // Changed color for variety
      tagText: '文章写作',
      tagBg: 'bg-green-100',
      tagTextCol: 'text-green-600',
      url: '/',
      snapshotImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTNmMWVjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzM0ZDMyMyI+5paH56ug5qCh5a+G5LiO55Sf5oiQ5Yqp5omLPC90ZXh0Pjwvc3ZnPg==' // Placeholder SVG
    },
    {
      id: 'ai-rewrite',
      title: 'AI文本优化',
      description: '去除AI文本特征，使内容更自然、更人性化',
      icon: FaMagic,
      iconColor: 'text-indigo-500',
      tagText: '文本优化',
      tagBg: 'bg-indigo-100',
      tagTextCol: 'text-indigo-600',
      url: '/features/ai-rewrite',
      snapshotImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlYmY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzYzNmRmYiI+6K+E6K665biD6L6TPC90ZXh0Pjwvc3ZnPg==' // Placeholder SVG
    },
    {
      id: 'proofread-generate',
      title: '文章校对与生成助手',
      description: '智能校对、文本转语音、封面图生成，全方位提升您的文章质量。',
      icon: FaSpellCheck,
      iconColor: 'text-green-500', // Changed color for variety
      tagText: '多功能',
      tagBg: 'bg-green-100',
      tagTextCol: 'text-green-600',
      url: '/features/checker',
      snapshotImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTNmMWVjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzM0ZDMyMyI+5paH56ug5qCh5a+G5LiO55Sf5oiQ5Yqp5omLPC90ZXh0Pjwvc3ZnPg==' // Placeholder SVG
    },
    {
      id: 'new-media',
      title: '新媒体编辑',
      description: '全渠道社交媒体文案创建工具，帮助您快速生成适合不同平台的高质量内容。',
      icon: FaEdit,
      iconColor: 'text-purple-500',
      tagText: '文案创作',
      tagBg: 'bg-purple-100', // Adjusted tag color for consistency
      tagTextCol: 'text-purple-600',
      url: '/features/media-editor',
      snapshotImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNlOGZmIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzhiNWNmNiI+5paw5aqS5L2T57yW6L6TPC90ZXh0Pjwvc3ZnPg==' // Placeholder SVG
    },
    {
      id: 'comment-edit',
      title: '评论编辑',
      description: '一次生成多条评论，快速创建不同风格和类型的评论内容。',
      icon: FaComments,
      iconColor: 'text-indigo-500',
      tagText: '评论生成',
      tagBg: 'bg-indigo-100',
      tagTextCol: 'text-indigo-600',
      url: '/features/comment-editor',
      snapshotImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlYmY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzYzNmRmYiI+6K+E6K665biD6L6TPC90ZXh0Pjwvc3ZnPg==' // Placeholder SVG
    },
   // Add more tools here as needed
];


export default function HomePage() {
    const [displayMode, setDisplayMode] = useState<'card' | 'snapshot'>('card');
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');
    const [tools, setTools] = useState<Tool[]>(toolsData); // Use state if tools might change, otherwise const is fine

    const openPreview = useCallback((tool: Tool) => {
        if (!tool || !tool.url) {
            console.error("Invalid tool data for preview:", tool);
            return;
        }
        setPreviewUrl(tool.url);
        setPreviewTitle(`${tool.title} - 预览模式`);
        setShowPreview(true);
        document.body.style.overflow = 'hidden'; // Prevent body scroll
    }, []); // Empty dependency array as it doesn't depend on component state/props

    const closePreview = useCallback(() => {
        setShowPreview(false);
        setPreviewUrl('');
        setPreviewTitle('');
        document.body.style.overflow = ''; // Restore body scroll
    }, []); // Empty dependency array

    // Effect for Escape key listener
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closePreview();
            }
        };

        if (showPreview) {
            window.addEventListener('keydown', handleEscKey);
        }

        // Cleanup function
        return () => {
            window.removeEventListener('keydown', handleEscKey);
            // Ensure body scroll is restored if component unmounts while modal is open
             if (document.body.style.overflow === 'hidden') {
                 document.body.style.overflow = '';
             }
        };
    }, [showPreview, closePreview]); // Re-run effect if showPreview or closePreview changes

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            {/* Banner 区域 */}
            <div className="banner w-full">
                <div className="container mx-auto px-4 banner-content text-left">
                    <h1 className="banner-title">AI编辑工作室</h1>
                    <p className="banner-subtitle">利用人工智能技术，提升内容创作效率，让您的创作更加高效、专业</p>
                    <div className="mt-8 inline-flex justify-center">
                        {/* If 总工作台.html becomes a Next.js route e.g., /dashboard, use Link */}
                        {/* <Link href="/dashboard" legacyBehavior> */}
                        <Link href="/" className="bg-white text-indigo-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-bold shadow-lg transition-all duration-300 flex items-center gap-2">
                            <FaRocket aria-hidden="true" />
                            <span>立即开始使用</span>
                        </Link>
                        {/* </Link> */}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="container mx-auto px-4 py-12 flex-grow">
                <header className="text-center mb-10">
                    <p className="text-xl text-gray-600">智能编辑与内容创作工具集</p>
                </header>

                {/* 展示模式选择器 */}
                {/* <div className="display-mode-selector">
                    <button
                        onClick={() => setDisplayMode('card')}
                        className={`mode-btn ${displayMode === 'card' ? 'active' : ''}`}
                    >
                        <FaThLarge aria-hidden="true" />
                        <span>卡片展示</span>
                    </button>
                    <button
                        onClick={() => setDisplayMode('snapshot')}
                        className={`mode-btn ${displayMode === 'snapshot' ? 'active' : ''}`}
                    >
                        <FaImage aria-hidden="true" />
                        <span>快照预览</span>
                    </button>
                </div> */}

                {/* Tools Container */}
                <div className={`tools-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${displayMode}`}>
                    {tools.map((tool) => {
                        const ToolIcon = tool.icon; // Assign component to a variable starting with uppercase
                        return (
                            <div key={tool.id} className="card bg-white shadow-md hover:shadow-xl flex flex-col transition-transform duration-300 hover:-translate-y-1">

                                {displayMode === 'card' ? (
                                    <>
                                        {/* Card Mode Content */}
                                        <Link href={tool.url} className="block flex-grow flex flex-col">
                                            <div className="p-8 flex flex-col items-center text-center flex-grow">
                                                <div className={`card-icon ${tool.iconColor}`}>
                                                    <ToolIcon aria-hidden="true" />
                                                </div>
                                                <h2 className="text-2xl font-bold text-gray-800 mb-3">{tool.title}</h2>
                                                <p className="text-gray-600 mb-4 flex-grow">{tool.description}</p> {/* Added flex-grow here */}
                                                <div className="mt-auto pt-4">
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${tool.tagBg} ${tool.tagTextCol}`}>{tool.tagText}</span>
                                                </div>
                                            </div>
                                        </Link>
                                        <div className="px-8 pb-4 flex justify-center border-t border-gray-100 pt-4">
                                            <button onClick={() => openPreview(tool)} className="btn-preview text-sm">
                                                <FaEye aria-hidden="true" />
                                                <span>预览</span>
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Snapshot Mode Content */}
                                        <Link href={tool.url} className="block relative group"> {/* Added group for potential hover effects */}
                                            {/* Image container for aspect ratio */}
                                            <div className="relative w-full pt-[56.25%]"> {/* 16:9 Aspect Ratio */}
                                                {/* Using standard img tag for simplicity with data URI / external URL */}
                                                <img
                                                    src={tool.snapshotImage}
                                                    alt={`${tool.title} 快照`}
                                                    className="absolute top-0 left-0 w-full h-full object-cover"
                                                    loading="lazy" // Add lazy loading
                                                />
                                                {/* Optional: Add overlay on hover */}
                                                {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300"></div> */}
                                            </div>
                                            <div className="card-content absolute bottom-0 left-0 right-0 p-4 bg-white bg-opacity-90 backdrop-blur-sm">
                                                <h2 className="text-xl font-bold text-gray-800 truncate">{tool.title}</h2>
                                                <div className="mt-2">
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${tool.tagBg} ${tool.tagTextCol}`}>{tool.tagText}</span>
                                                </div>
                                            </div>
                                        </Link>
                                        {/* Optional Preview Button for Snapshot Mode (uncomment if needed) */}
                                        {/*
                                        <div className="p-4 flex justify-center border-t border-gray-100">
                                            <button onClick={() => openPreview(tool)} className="btn-preview text-sm">
                                                <FaEye aria-hidden="true" />
                                                <span>预览</span>
                                            </button>
                                        </div>
                                        */}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* 详细介绍部分 */}
                <section className="mt-16">
                    <h2 className="section-title">关于AI编辑工作室</h2>
                    <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                        <p className="text-gray-700 leading-relaxed mb-4">
                            AI编辑工作室是一套专为内容创作者设计的智能工具集，旨在帮助用户快速生成高质量的文案、文章和评论内容。
                            我们利用先进的人工智能技术，为您提供全方位的内容创作支持，让您的工作更加高效、专业。
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            无论您是社交媒体运营者、内容编辑、自媒体创作者还是市场营销人员，AI编辑工作室都能满足您的多样化需求，
                            帮助您在竞争激烈的内容领域中脱颖而出。
                        </p>
                    </div>
                </section>

                {/* 功能特点部分 */}
                <section className="mt-16">
                    <h2 className="section-title">核心功能特点</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        {/* Feature 1 */}
                        <div className="feature-card bg-white shadow-md transition-transform duration-300 hover:-translate-y-1">
                            <div className="feature-icon bg-blue-100 text-blue-600">
                                <FaBolt aria-hidden="true" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">高效创作</h3>
                            <p className="text-gray-600">快速生成多种类型的内容，节省时间和精力，提高工作效率。</p>
                        </div>
                        {/* Feature 2 */}
                        <div className="feature-card bg-white shadow-md transition-transform duration-300 hover:-translate-y-1">
                            <div className="feature-icon bg-purple-100 text-purple-600">
                                <FaMagic aria-hidden="true" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">智能优化</h3>
                            <p className="text-gray-600">自动校对文章，优化语言表达，提升内容质量和专业度。</p>
                        </div>
                        {/* Feature 3 */}
                        <div className="feature-card bg-white shadow-md transition-transform duration-300 hover:-translate-y-1">
                            <div className="feature-icon bg-indigo-100 text-indigo-600">
                                <FaLayerGroup aria-hidden="true" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">多样化输出</h3>
                            <p className="text-gray-600">支持多种平台和风格的内容生成，满足不同场景的需求。</p>
                        </div>
                    </div>
                </section>

                {/* 开发说明部分 */}
                <section className="mt-16">
                    <h2 className="section-title">开发说明</h2>
                    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                        <div className="border-l-4 border-indigo-500 pl-4 py-2 mb-4">
                            <h3 className="text-lg font-bold text-gray-800 mb-1">技术栈</h3>
                            <p className="text-gray-600">本项目使用 Next.js 15 (React), TypeScript, Tailwind CSS 构建。</p>
                        </div>
                        <div className="border-l-4 border-indigo-500 pl-4 py-2 mb-4">
                            <h3 className="text-lg font-bold text-gray-800 mb-1">使用方法</h3>
                            <p className="text-gray-600">运行 `npm run dev` (或 yarn/pnpm) 启动开发服务器。</p>
                        </div>
                        <div className="border-l-4 border-indigo-500 pl-4 py-2">
                            <h3 className="text-lg font-bold text-gray-800 mb-1">版本</h3>
                            <p className="text-gray-600">基于 V1.0.0 HTML 版本迁移。</p>
                        </div>
                    </div>
                </section>
            </main>

            {/* <footer className="footer bg-gray-800 text-white py-6 mt-12">
                <div className="container mx-auto px-4 text-center">
                    <p>&copy; {new Date().getFullYear()} AI编辑工作室 - 智能编辑与内容创作工具集</p>
                    <p className="text-gray-400 text-sm mt-2">使用先进AI技术，提升您的内容创作效率</p>
                </div>
            </footer> */}

            {/* 预览模式弹窗 */}
            {showPreview && (
                <div
                    className="preview-overlay"
                    onClick={(e) => {
                        // Close only if clicking the overlay itself, not the content
                        if (e.target === e.currentTarget) {
                            closePreview();
                        }
                    }}
                >
                    <div className="preview-container">
                        <div className="preview-header">
                            <h2 className="text-xl font-bold">{previewTitle}</h2>
                            <button
                                onClick={closePreview}
                                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition-colors"
                                aria-label="关闭预览"
                            >
                                <FaTimes className="text-xl" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="preview-content">
                            {previewUrl ? (
                                <iframe
                                    src={previewUrl}
                                    className="preview-iframe"
                                    title="页面预览"
                                    // Consider adding sandbox attributes for security if loading external/untrusted content
                                    // sandbox="allow-scripts allow-same-origin"
                                ></iframe>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    加载预览中...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// // Optional: Add metadata for SEO (App Router)
// export const metadata = {
//   title: 'AI编辑工作室 - 导航页面',
//   description: '利用人工智能技术，提升内容创作效率，让您的创作更加高效、专业。智能编辑与内容创作工具集。',
// };