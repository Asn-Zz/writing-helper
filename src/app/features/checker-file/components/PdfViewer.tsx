"use client";

import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { FaSpinner } from 'react-icons/fa';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    pdfPreviewUrl: string;
}

export default function PdfViewer({
    pdfPreviewUrl,
}: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pagesPerView, setPagesPerView] = useState<number>(1);
    const [selectedPage, setSelectedPage] = useState<number | null>(null);
    const [isPageLoading, setIsPageLoading] = useState(false);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const pdfContainerRef = useRef<HTMLDivElement>(null);
    const renderedPagesCount = useRef(0);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setCurrentPage(1);
        setSelectedPage(null);
        renderedPagesCount.current = 0;
        setIsPageLoading(true);
    };

    const handleViewChange = (view: number) => {
        if (pagesPerView === view) return;
        renderedPagesCount.current = 0;
        setIsPageLoading(true);
        setPagesPerView(view);
        setCurrentPage(1);
    };

    const handlePageGroupChange = (direction: 'prev' | 'next') => {
        renderedPagesCount.current = 0;
        setIsPageLoading(true);
        setCurrentPage(p => direction === 'prev' ? Math.max(1, p - pagesPerView) : p + pagesPerView);
    };

    const onPageRenderSuccess = () => {
        renderedPagesCount.current += 1;
        if (renderedPagesCount.current >= pagesToRender.length) {
            setIsPageLoading(false);
        }
    };

    const handlePageSelection = (pageNumber: number) => {
        setSelectedPage(prev => (prev === pageNumber ? null : pageNumber));
    };

    const pagesToRender = Array.from(
        { length: Math.min(pagesPerView, numPages - currentPage + 1) },
        (_, i) => currentPage + i
    );

    const gridClass = pagesPerView > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden relative">
            <div ref={pdfContainerRef} className="pdf-multipage-container border border-gray-200 overflow-y-auto bg-gray-100 p-4">
                {isPageLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex justify-center items-center z-10">
                        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
                    </div>
                )}
                <Document
                    file={pdfPreviewUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(error) => setOcrError(`加载PDF失败: ${error.message}`)}
                    loading={<div className="p-4 text-center col-span-full">正在加载 PDF...</div>}
                    error={<div className="p-4 text-red-600 text-center col-span-full">加载PDF失败。</div>}
                    className={`grid ${gridClass} gap-4`}
                >
                    {pagesToRender.map(pageNumber => (
                        <div 
                            key={`page_${pageNumber}`} 
                            onClick={() => handlePageSelection(pageNumber)}
                            className={`pdf-page-wrapper ${selectedPage === pageNumber ? 'selected' : ''}`}
                        >
                            <Page
                                pageNumber={pageNumber}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="flex justify-center"
                                scale={0.65}
                                onRenderSuccess={onPageRenderSuccess}
                            />
                        </div>
                    ))}
                </Document>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center p-2 bg-white">
                <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                    <button onClick={() => handlePageGroupChange('prev')} disabled={currentPage <= 1 || isPageLoading} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        上一页
                    </button>
                    <span className="text-sm text-gray-600 whitespace-nowrap px-6">
                        第 {currentPage} / {numPages} 页
                    </span>
                    <button onClick={() => handlePageGroupChange('next')} disabled={currentPage + pagesPerView > numPages || isPageLoading} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        下一页
                    </button>
                </div>
            </div>
             {ocrError && (
                 <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mt-4 rounded-md text-sm" role="alert">
                    <p className="font-bold">OCR 错误</p>
                    <p>{ocrError}</p>
                </div>
            )}
        </div>
    );
}