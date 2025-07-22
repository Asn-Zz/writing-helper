"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { FaFilePdf, FaSpinner, FaSearchPlus, FaColumns } from 'react-icons/fa';
import { ApiConfigProps } from '@/app/components/ApiSettingBlock';

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
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const pdfContainerRef = useRef<HTMLDivElement>(null);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setCurrentPage(1);
        setSelectedPage(null);
    };

    const handleViewChange = (view: number) => {
        setPagesPerView(view);
        setCurrentPage(1);
    };

    const handlePageSelection = (pageNumber: number) => {
        setSelectedPage(prev => (prev === pageNumber ? null : pageNumber));
    };

    const recognizeSelectedPage = useCallback(async () => {
        if (selectedPage === null) return;

        setIsOcrLoading(true);
        setOcrError(null);
        
        try {
            const pageNumber = selectedPage;
            const pageElement = pdfContainerRef.current?.querySelector(`.react-pdf__Page[data-page-number="${pageNumber}"]`);
            if (!pageElement) throw new Error(`Could not find page ${pageNumber} to capture.`);
            
            const canvas = pageElement.querySelector('canvas');
            if (!canvas) throw new Error(`Could not find canvas for page ${pageNumber}.`);

            const imageBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (!imageBlob) throw new Error(`Could not create image from canvas for page ${pageNumber}.`);

            const ocrFile = new File([imageBlob], `page_${pageNumber}.png`, { type: 'image/png' });
            const formData = new FormData();
            formData.append('file', ocrFile);
            formData.append('apiConfig', JSON.stringify(apiConfig));

            const response = await fetch('/api/file-ocr', { method: 'POST', body: formData });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Page ${pageNumber}: ${errorData.error || 'OCR failed'}`);
            }
            const data = await response.json();
            setInputText(prev => prev + (prev ? '\n\n' : '') + `--- Page ${pageNumber} ---\n` + data.text);
            setSelectedPage(null); // Deselect after successful OCR
        } catch (error: any) {
            setOcrError(error.message);
        } finally {
            setIsOcrLoading(false);
        }

    }, [selectedPage, apiConfig, setInputText]);

    const pagesToRender = Array.from(
        { length: Math.min(pagesPerView, numPages - currentPage + 1) },
        (_, i) => currentPage + i
    );

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
                            disabled={numPages < view}
                            className={`px-3 py-1 text-sm rounded-md transition ${pagesPerView === view ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {view} 页
                        </button>
                    ))}
                </div>
            </div>

            <div ref={pdfContainerRef} className="pdf-multipage-container border border-gray-200 rounded-lg overflow-y-auto bg-gray-100 p-4">
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
                            />
                        </div>
                    ))}
                </Document>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 p-2 bg-gray-50 rounded-b-lg">
                <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - pagesPerView))} disabled={currentPage <= 1} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        上一组
                    </button>
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                        第 {currentPage} - {Math.min(currentPage + pagesPerView - 1, numPages)} / {numPages} 页
                    </span>
                    <button onClick={() => setCurrentPage(p => p + pagesPerView)} disabled={currentPage + pagesPerView > numPages} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        下一组
                    </button>
                </div>
                <div className="flex items-center">
                    <button 
                        onClick={recognizeSelectedPage} 
                        disabled={selectedPage === null || isOcrLoading}
                        className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-wait flex items-center justify-center"
                    >
                        {isOcrLoading ? <FaSpinner className="animate-spin mr-2" /> : <FaSearchPlus className="mr-2"/>}
                        {isOcrLoading ? '识别中...' : `识别选中页`}
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