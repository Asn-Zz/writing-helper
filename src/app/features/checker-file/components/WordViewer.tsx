"use client";

import mammoth from 'mammoth';
import { useState, useEffect } from 'react';
import { FaSpinner } from 'react-icons/fa';

interface WordViewerProps {
    wordPreviewUrl: string;
    setWordText: (content: string) => void;
}

export default function WordViewer({
    wordPreviewUrl,
    setWordText,
}: WordViewerProps) {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {   
        const fetchContent = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(wordPreviewUrl);
                const arrayBuffer = await response.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                const content = result.value.replace(/((\r\n|\r|\n)){2,}/g, '\n\n');

                setContent(content);
                setWordText(content);
            } catch (error) {
                setError('Failed to load Word document');
            } finally {
                setIsLoading(false);
            }
        };

        fetchContent();
    }, [wordPreviewUrl]);

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden relative">
            <div className="pdf-multipage-container border border-gray-200 rounded-lg overflow-y-auto bg-gray-100 p-4">
                {isLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex justify-center items-center z-10">
                        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
                    </div>
                )}
                {error ? (
                    <p>Error: {error}</p>
                ) : (
                    <div className='text-xs whitespace-pre-wrap' dangerouslySetInnerHTML={{ __html: content }} />
                )}
            </div>
        </div>
    );
}
