"use client";

import Script from 'next/script';
import dynamic from 'next/dynamic';
import { asBlob } from 'html-docx-js-typescript';
import React, { useState, useEffect } from 'react';
import { FaCloudUploadAlt, FaSpinner, FaCopy, FaDownload } from 'react-icons/fa';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';
import FeatureLayout from '@/app/components/FeatureLayout';
import { useApiSettings } from '@/app/components/ApiSettingsContext';
import { generate } from '@/app/lib/api';
import './style.css';

const PdfViewer = dynamic(() => import('./components/PdfViewer'), { ssr: false });
const WordViewer = dynamic(() => import('./components/WordViewer'), { ssr: false });
const RadarChart = dynamic(() => import('./components/RadarChart'), { ssr: false });

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
  });
};

// 评分类型定义
interface Scores {
  contentQuality: number;
  structure: number;
  language: number;
  ideology: number;
  market: number;
}

export default function CheckerFile() {
  const { apiConfig } = useApiSettings();

  const [fileInfo, setFileInfo] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parseUrl, setParseUrl] = useState('');
  const [blobUrl, setBlobUrl] = useState('');
  const [isPdf, setIsPdf] = useState(false);
  const [wordText, setWordText] = useState('');

  // 评分状态
  const [scores, setScores] = useState<Scores | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [summary, setSummary] = useState('');

  const processFile = (file : File) => {
    const currentFileInfo = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    const currentBlobUrl = URL.createObjectURL(file);
    
    setFileInfo(currentFileInfo);
    setBlobUrl(currentBlobUrl);
    setIsPdf(file.type === 'application/pdf');
    setScores(null);
    setSummary('');
  };
  const handleFileUpload = (event: any) => {
    const file = event.target.files[0];
    if (file) processFile(file);
  };
  const handleDragOver = (event : any) => { event.preventDefault(); setIsDraggingOver(true); };
  const handleDragLeave = (event : any) => { event.preventDefault(); setIsDraggingOver(false); };
  const handleDrop = (event : any) => {
    event.preventDefault();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files[0];
    processFile(file);
  };

  const handleParse = () => {
    fetch(parseUrl).then(response => response.blob()).then(blob => {
      const fileName = parseUrl.split('/').pop() || 'file';
      const file = new File([blob], fileName, { type: blob.type });
      processFile(file);
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary)
      .then(() => {
        alert('内容已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
      });
  };

  const handleExportText = () => {
    const summaryElement = document.getElementById('summary');

    if (summaryElement) {
      const link = document.createElement('a');
      link.download = `${fileInfo}-预审报告(${new Date().toLocaleString()}).txt`;
      link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(summaryElement.innerText)}`;
      link.click();
    }
  };

  const handleExportImage = async () => {
    const summaryElement = document.getElementById('summary');

    if (summaryElement) {
      try {
        const data = await asBlob(summaryElement.innerHTML);
        const fileName = `${fileInfo}-预审报告(${new Date().toLocaleString()}).docx`;

        window.saveAs(data, fileName);
      } catch (error) {
        console.error('导出图片失败:', error);
        alert('导出图片失败');
      }
    }
  };

  const parseScoresFromText = (text: string): Scores | null => {
    const tablePattern = /\|.*内容质量.*\|.*结构组织.*\|.*语言表达.*\|.*意识形态.*\|.*市场定位.*\|[\s\S]*?\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/;
    const tableMatch = text.match(tablePattern);
    
    if (tableMatch) {
      return {
        contentQuality: parseFloat(tableMatch[1]),
        structure: parseFloat(tableMatch[2]),
        language: parseFloat(tableMatch[3]),
        ideology: parseFloat(tableMatch[4]),
        market: parseFloat(tableMatch[5])
      };
    } 
    return null;
  };

  const handleGenerate = async () => {        
    if (isLoading) return;
    setIsLoading(true);
    setIsScoring(true);
    setScores(null);
    try {
      const getBlob = async () => {
        const response = await fetch(blobUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        const file = new File([blob], fileInfo, { type: blob.type });
        const base64Url = await fileToBase64(file);          

        return { type: "image_url", image_url: { url: base64Url } };
      };      
      const summaryElement = document.getElementById('summary');    
      const messagesItem = isPdf ? await getBlob() : { type: "text", text: fileInfo + '\n' + wordText };

      // 生成预审报告
      const data = await generate({
        ...apiConfig,
        model: 'gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: "text",
                text: `你是一位专业的出版编辑，严谨客观实事求是，请对这份书稿进行预审评估，请从以下几个维度给出详细分析：

1. 内容质量：主题是否明确、观点是否新颖、论据是否充分、逻辑是否严密
2. 结构组织：章节安排是否合理、层次是否清晰、过渡是否自然
3. 语言表达：用词是否准确、句式是否多样、文风是否统一
4. 意识形态与价值观：是否符合主流价值观、是否存在不当表述
5. 市场定位：目标读者群体、潜在市场价值、竞争优势
6. 存在问题：指出具体问题和改进建议

请在分析的开始给出一个总体评价和是否建议进一步出版(是/否/待定)的结论，并辅以表格格式给出评分（每个维度满分10分）：

| 维度 | 内容质量 | 结构组织 | 语言表达 | 意识形态 | 市场定位 |
| ----| -------- | -------- | -------- | -------- | -------- |
| 评分 | X        | Y        | Z        | A        | B        |`,
              },
              messagesItem,
          ],
          }
        ],
        handler (chunk: string) {          
          setSummary(chunk);
          if (summaryElement) {
            summaryElement.scrollTo({ top: summaryElement.scrollHeight, behavior: 'smooth' });
          }
        },
        temperature: 0,
      })
      const summaryText = data.content || data.error || '';
      setSummary(summaryText);
      
      // 最终解析评分
      const finalScores = parseScoresFromText(summaryText);
      if (finalScores) {
        setScores(finalScores);
      }
      
      setIsLoading(false);
      setIsScoring(false);
    } catch (error) {
      console.error('生成预审报告时出错:', error);
      setIsLoading(false);
      setIsScoring(false);
    }
  };

  useEffect(() => {
    if (isPdf && blobUrl || (!isPdf && wordText)) handleGenerate();
  }, [blobUrl, wordText, isPdf]);

  return (
    <FeatureLayout 
      title="文档预审" 
      subtitle="通读书稿内容，整体判断书稿质量，并给出专业建议"
    >
      <div>
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-col items-center gap-3">
              <label className="w-full cursor-pointer">
                <div
                  className={`w-full p-5 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-400 hover:bg-blue-50 transition-colors ${isDraggingOver ? 'bg-blue-100 border-blue-400' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <FaCloudUploadAlt className="text-5xl text-gray-400 mx-auto" />
                  <p className="my-2">支持PDF、Word等格式</p>
                  <p className="text-sm text-gray-500">{fileInfo ? '已选择: ' + fileInfo : '未选择文件'}</p>
                  <input type="file" id="input" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleFileUpload} />
                </div>
              </label>

              <div className='w-full flex flex-col md:flex-row gap-4 mb-4'>
                <input type="text" className='flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500' value={parseUrl} onChange={(e) => setParseUrl(e.target.value)} placeholder="请输入文件URL" />
                <button className='py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-80' onClick={handleParse} disabled={isLoading || !parseUrl}>
                  {isLoading ? '解析中...' : '立即解析'}
                </button>
              </div>
            </div>
          </div>

          {
            blobUrl && (
              <>
                {scores && !isScoring && <div className='grid grid-cols-1 md:grid-cols-1 gap-4 mb-4 h-[350px]'>
                  <div className='border border-gray-200 rounded-lg overflow-hidden bg-white md:col-span-1'>
                    <div className="p-3 border-b border-gray-200">
                      <h3 className="font-semibold">评分雷达图</h3>
                    </div>

                    <div className="w-full h-[calc(100%-56px)] flex items-center justify-center">
                      <RadarChart scores={scores} />
                    </div>
                  </div>
                </div>}

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                  {isPdf ? <PdfViewer pdfPreviewUrl={blobUrl} /> : <WordViewer wordPreviewUrl={blobUrl} setWordText={setWordText} />}
                    
                    <div className='flex items-center justify-between py-2'>
                      <div className='flex gap-2 text-sm text-gray-500'>
                        <span>字数: {wordText?.length}</span>
                      </div>

                      <div className='flex gap-2 hidden'>
                        <button 
                          onClick={handleExportImage}
                          className='flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors'
                          disabled={!summary}
                        >
                          <FaDownload /> 导出当前页
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className='relative border border-gray-200 rounded-lg bg-white md:col-span-2 h-[600px]'>
                      {!summary && <div className="w-full h-full flex items-center justify-center gap-2 z-0">
                        <FaSpinner className="animate-spin text-blue-600 text-4xl" />报告正在生成中，请稍候...
                      </div>}

                      <div 
                        id="summary" 
                        className="p-4 text-sm leading-loose h-full max-h-[600px] overflow-y-auto" 
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
                      </div>
                    </div>

                    <div className='flex items-center justify-between py-2'>
                      <div className='flex gap-2 text-sm text-gray-500'>
                        <span>字数: {summary?.length}</span>
                      </div>

                      <div className='flex gap-2'>
                        <button 
                          onClick={handleCopy}
                          className='flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors'
                          disabled={!summary}
                        >
                          <FaCopy /> 复制
                        </button>
                        <button 
                          onClick={handleExportText}
                          className='flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors'
                          disabled={!summary}
                        >
                          <FaDownload /> 纯文本
                        </button>
                        <button 
                          onClick={handleExportImage}
                          className='flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors'
                          disabled={!summary}
                        >
                          <FaDownload /> 导出文档
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )
          }
        </div>
      </div>
      
      <Script src="https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js" />
    </FeatureLayout>
  );
}