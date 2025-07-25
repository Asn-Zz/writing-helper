"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { FaFilePdf, FaSpinner, FaSearchPlus, FaColumns } from 'react-icons/fa';
import { ApiConfigProps } from '@/app/components/ApiSettingBlock';
import { generateOcr } from '@/app/lib/api'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    pdfPreviewUrl: string;
    setInputText: (text: string | ((prev: string) => string)) => void;
    apiConfig: ApiConfigProps;
}

export default function PdfViewer({
    pdfPreviewUrl,
    setInputText,
    apiConfig,
}: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pagesPerView, setPagesPerView] = useState<number>(2);
    const [selectedPage, setSelectedPage] = useState<number | null>(null);
    const [isPageLoading, setIsPageLoading] = useState(false);
    const [isOcrLoading, setIsOcrLoading] = useState(false);
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

    const recognizeContent = useCallback(async () => {
        setIsOcrLoading(true);
        setOcrError(null);

        try {
            const pagesToRecognize = selectedPage ? [selectedPage] : pagesToRender;
            if (pagesToRecognize.length === 0) {
                throw new Error("No pages found to recognize.");
            }

            const canvases = pagesToRecognize.map(pageNumber => {
                const pageElement = pdfContainerRef.current?.querySelector(`.react-pdf__Page[data-page-number="${pageNumber}"]`);
                return pageElement?.querySelector('canvas');
            }).filter((c): c is HTMLCanvasElement => !!c);

            if (canvases.length !== pagesToRecognize.length) {
                throw new Error("Could not find canvas for all pages to be recognized.");
            }

            let imageBlob: Blob | null;
            if (canvases.length > 1) {
                const mergedCanvas = document.createElement('canvas');
                // Simple vertical merge
                const totalWidth = Math.max(...canvases.map(c => c.width));
                const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);
                mergedCanvas.width = totalWidth;
                mergedCanvas.height = totalHeight;
                
                const ctx = mergedCanvas.getContext('2d');
                if (!ctx) throw new Error("Could not create merged canvas context.");

                let currentY = 0;
                for (const canvas of canvases) {
                    ctx.drawImage(canvas, 0, currentY);
                    currentY += canvas.height;
                }
                imageBlob = await new Promise<Blob | null>((resolve) => mergedCanvas.toBlob(resolve, 'image/png'));
            } else {
                imageBlob = await new Promise<Blob | null>((resolve) => canvases[0].toBlob(resolve, 'image/png'));
            }

            if (!imageBlob) throw new Error(`Could not create image from canvas.`);

            const pageRange = pagesToRecognize.length > 1 
                ? `${pagesToRecognize[0]}-${pagesToRecognize[pagesToRecognize.length - 1]}` 
                : `${pagesToRecognize[0]}`;
            
            const ocrFile = new File([imageBlob], `page_${pageRange}.png`, { type: 'image/png' });
            const description = `--- Page(s) ${pageRange} ---`;

            const { text } = await generateOcr({ file: ocrFile, ...apiConfig });
            if (!text) throw new Error(`Could not generate text from image.`);

            setInputText(prev => prev + (prev ? '\n\n' : '') + description + '\n' + text);
            setSelectedPage(null); // Deselect after successful OCR
        } catch (error: any) {
            setOcrError(error.message);
        } finally {
            setIsOcrLoading(false);
        }
    }, [selectedPage, apiConfig, setInputText, pagesToRender]);

    const gridClass = pagesPerView > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';

    return (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
                    <FaFilePdf className="mr-2 text-red-500" />
                    PDF 预览
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 mr-2"><FaColumns className="inline-block mr-1"/>显示:</span>
                    {[1, 2, 4].map(view => (
                        <button
                            key={view}
                            onClick={() => handleViewChange(view)}
                            disabled={numPages < view || isPageLoading}
                            className={`px-3 py-1 text-sm rounded-md transition ${pagesPerView === view ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {view} 页
                        </button>
                    ))}
                </div>
            </div>

            <div ref={pdfContainerRef} className="relative pdf-multipage-container border border-gray-200 rounded-lg overflow-y-auto bg-gray-100 p-4">
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
                                scale={0.8}
                                onRenderSuccess={onPageRenderSuccess}
                            />
                        </div>
                    ))}
                </Document>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 p-2 bg-gray-50 rounded-b-lg">
                <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                    <button onClick={() => handlePageGroupChange('prev')} disabled={currentPage <= 1 || isPageLoading} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        上一组
                    </button>
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                        第 {currentPage} - {Math.min(currentPage + pagesPerView - 1, numPages)} / {numPages} 页
                    </span>
                    <button onClick={() => handlePageGroupChange('next')} disabled={currentPage + pagesPerView > numPages || isPageLoading} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        下一组
                    </button>
                </div>
                <div className="flex items-center">
                    <button 
                        onClick={recognizeContent} 
                        disabled={numPages === 0 || isOcrLoading}
                        className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-wait flex items-center justify-center"
                    >
                        {isOcrLoading ? <FaSpinner className="animate-spin mr-2" /> : <FaSearchPlus className="mr-2"/>}
                        {isOcrLoading ? '识别中...' : (selectedPage !== null ? '识别选中页' : '识别当前组')}
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