
import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

export default function AboutSection() {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-1">
            <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                    <FaInfoCircle className="text-gray-500" />
                </div>
                <h2 className="text-xl font-semibold">关于助手</h2>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700">
                <p className="mb-3">本工具集成了文章校对、文本转语音 (TTS) 和封面图生成功能，旨在帮助内容创作者提高效率。</p>
                <ul className="list-disc pl-5 mb-4 space-y-1">
                    <li><strong>校对:</strong> 检查错别字、语法、标点等，提供修改建议。</li>
                    <li><strong>文本转语音:</strong> 将校对后的文本转换为语音，支持选择不同音色。</li>
                    <li><strong>封面图:</strong> 根据文章内容（或摘要）生成匹配的封面图片。</li>
                </ul>
            </div>
        </div>
    );
}
