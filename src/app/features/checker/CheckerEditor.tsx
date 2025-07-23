"use client"; 

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ApiSettingBlock, { ApiConfigProps } from '../../components/ApiSettingBlock';
import InputSection from './components/InputSection';
import ResultsSection from './components/ResultsSection';
import OutputSection from './components/OutputSection';
import AboutSection from './components/AboutSection';
import { Issue } from './types';
import './style.css';

const PdfViewer = dynamic(() => import('./components/PdfViewer'), { ssr: false });

export default function CheckerEditor() {
    const [apiConfig, setApiConfig] = useState<ApiConfigProps>({
      apiProvider: 'openai',
      apiUrl: '',
      apiKey: '',
      model: ''
    });
    const [inputText, setInputText] = useState('');
    const [issues, setIssues] = useState<Issue[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [originalTextForIssues, setOriginalTextForIssues] = useState('');
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) {
                URL.revokeObjectURL(pdfPreviewUrl);
            }
        };
    }, [pdfPreviewUrl]);

    return (
        <div className="container mx-auto">
            <ApiSettingBlock setApiConfig={setApiConfig} />

            <InputSection
                apiConfig={apiConfig}
                inputText={inputText}
                isLoading={isLoading}
                setInputText={setInputText}
                setIssues={setIssues}
                setShowResults={setShowResults}
                setIsLoading={setIsLoading}
                setApiError={setApiError}
                setOriginalTextForIssues={setOriginalTextForIssues}
                setPdfPreviewUrl={setPdfPreviewUrl}
            />

            {pdfPreviewUrl && (
                <PdfViewer
                    pdfPreviewUrl={pdfPreviewUrl}
                    setInputText={setInputText}
                    apiConfig={apiConfig}
                />
            )}

            {isLoading && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <div className="flex items-center justify-center py-12">
                        <div className="loading-spinner mr-3"></div>
                        <span className="text-gray-600">正在校对中，请稍候...</span>
                    </div>
                </div>
            )}

            {apiError && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded-lg shadow-md" role="alert">
                    <p className="font-bold">校对出错</p>
                    <p>{apiError}</p>
                </div>
            )}

            <ResultsSection
                showResults={showResults}
                isLoading={isLoading}
                issues={issues}
                setIssues={setIssues}
                inputText={inputText}
                setInputText={setInputText}
                originalTextForIssues={originalTextForIssues}
            />

            <OutputSection
                isLoading={isLoading}
                inputText={inputText}
                showResults={showResults}
                apiConfig={apiConfig}
            />

            <AboutSection />
        </div>
    );
}
