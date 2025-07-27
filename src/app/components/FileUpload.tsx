"use client";

import React, { useState, useRef, useCallback } from 'react';
import { FaFileAlt, FaCloudUploadAlt, FaTimes } from 'react-icons/fa';
import { ApiConfigProps } from '@/app/components/ApiSettingBlock';
import { generateOcr } from '@/app/lib/api';

interface FileUploadProps {
    apiConfig: ApiConfigProps;
    onTextExtracted: (text: string) => void;
    setApiError: (error: string | null) => void;
    setPdfPreviewUrl: (url: string | null) => void;
    clearInput: () => void;
}

export default function FileUpload({
    apiConfig,
    onTextExtracted,
    setApiError,
    setPdfPreviewUrl,
    clearInput,
}: FileUploadProps) {
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const removeUploadedFile = useCallback(() => {
        setUploadedFileName(null);
        setPdfPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [setPdfPreviewUrl]);

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        clearInput();
        setUploadedFileName(file.name);

        if (file.type === 'application/pdf') {
            const url = URL.createObjectURL(file);
            setPdfPreviewUrl(url);
            onTextExtracted('');
            return;
        }

        setIsProcessingFile(true);
        setApiError(null);
        onTextExtracted('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const ocrTypes = ['image', 'audio'];

            if (ocrTypes.includes(file.type.split('/')[0])) {
                const { text, error } = await generateOcr({ file, ...apiConfig });
                if (!text && error) { throw new Error(error) }
                onTextExtracted(text);
            } else {
                const response = await fetch('/api/file-upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'File upload failed');
                }

                const data = await response.json();
                onTextExtracted(data.text);
            }
        } catch (error: any) {
            setApiError(`文件处理失败: ${error.message || '无法读取文件内容'}`);
            removeUploadedFile();
        } finally {
            setIsProcessingFile(false);
        }
    }, [clearInput, apiConfig, onTextExtracted, setApiError, removeUploadedFile, setPdfPreviewUrl]);

    const handleFileSelect = useCallback(() => fileInputRef.current?.click(), []);

    return (
        <div>
            <div
                className="flex items-center border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors cursor-pointer"
                onClick={handleFileSelect}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="*"
                    className="hidden"
                />
                {!uploadedFileName && !isProcessingFile && (
                    <div className="text-gray-500 w-full">
                        <FaCloudUploadAlt className="text-2xl mb-2 mx-auto" />
                        <p>点击或拖拽文件到此处</p>
                        <p className="text-xs mt-1">支持 TXT, DOCX, MD, PNG, JPG, MP3, PDF 等</p>
                    </div>
                )}
                {uploadedFileName && !isProcessingFile && (
                    <div className="relative w-full">
                        <div className="bg-gray-100 p-3 rounded max-h-32 mx-auto overflow-hidden flex items-center justify-center">
                            <FaFileAlt className="text-purple-500 text-2xl mr-2 flex-shrink-0" />
                            <span className="text-gray-700 text-sm truncate flex-grow text-left">{uploadedFileName}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeUploadedFile(); }}
                                className="ml-3 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0"
                                title="移除文件"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    </div>
                )}
                {isProcessingFile && (
                    <div className="relative w-full">
                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                            <div className="loading-spinner mr-2"></div>
                            <span className="text-sm text-gray-600">处理中...</span>
                        </div>
                        <div className="bg-gray-100 p-3 rounded max-h-32 mx-auto overflow-hidden flex items-center justify-center opacity-50">
                            <FaFileAlt className="text-purple-500 text-2xl mr-2" />
                            <span className="text-gray-700 text-sm truncate">{uploadedFileName || '...'}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
