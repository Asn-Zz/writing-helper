/**
 * AI 写作助手 - Markdown 编辑器组件
 * 
 * @license MIT
 * Copyright (c) 2024
 */

"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';

interface MarkdownEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
}

export default function MarkdownEditor({ initialContent, onContentChange }: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);

  // Update local content when prop changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onContentChange(newContent);
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden h-full">
      <div className="flex justify-between items-center bg-gray-50 p-2">
        <h3 className="text-sm font-medium">文章内容</h3>
        <button
          type="button"
          onClick={toggleEdit}
          className="text-blue-600 hover:underline text-sm flex items-center"
        >
          {isEditing ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              预览
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              编辑
            </>
          )}
        </button>
      </div>
      
      {isEditing ? (
        <textarea
          className="w-full p-4 h-full font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={content}
          onChange={handleChange}
          placeholder="在此输入Markdown内容..."
        />
      ) : (
        <div className="prose prose-sm px-4 pb-10 h-full overflow-scroll bg-white">
          {content ? (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: (props) => <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b" {...props} />,
                h2: (props) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                h3: (props) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                p: (props) => <p className="my-3" {...props} />,
                ul: (props) => <ul className="list-disc pl-5 my-3" {...props} />,
                ol: (props) => <ol className="list-decimal pl-5 my-3" {...props} />,
                li: (props) => <li className="my-1" {...props} />,
                blockquote: (props) => <blockquote className="border-l-4 border-gray-200 pl-4 py-2 my-3 text-gray-700 italic" {...props} />,
                code: (props) => {
                  const { inline, children, ...rest } = props as { inline?: boolean, children: React.ReactNode };
                  return inline 
                    ? <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...rest}>{children}</code>
                    : <code className="block bg-gray-100 p-3 rounded-md text-sm font-mono overflow-x-auto my-3" {...rest}>{children}</code>;
                },
                a: (props) => <a className="text-blue-600 hover:underline" {...props} />,
                img: (props) => {
                  const { src, alt } = props as { src?: string; alt?: string };
                  if (!src) return null;
                  return (
                    <div className="relative w-full h-64 my-4">
                      <Image
                        src={src}
                        alt={alt || 'Generated content image'}
                        fill
                        className="object-contain rounded-md"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  );
                },
                table: (props) => <div className="overflow-x-auto my-4"><table className="min-w-full border-collapse border border-gray-300" {...props} /></div>,
                th: (props) => <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-medium" {...props} />,
                td: (props) => <td className="border border-gray-300 px-4 py-2" {...props} />,
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400">无内容，点击&ldquo;编辑&rdquo;开始写作</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 