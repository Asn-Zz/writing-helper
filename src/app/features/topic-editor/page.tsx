"use client";

import React, { useState, useMemo, useEffect } from 'react';
import FeatureLayout from '@/app/components/FeatureLayout';
import ReactMarkdown from 'react-markdown';
import { FaUser } from 'react-icons/fa';
import { Book, Result } from './types';

export default function TopicEditor() {
  const [keyword, setKeyword] = useState('');
  const [result, setResult] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookSummary, setBookSummary] = useState('');
  const [activeBook, setActiveBook] = useState<Book | null>(null);

  const [splitKeyword, setSplitKeyword] = useState('');
  const search = async () => {
    if (!keyword.trim()) return;
    
    setLoading(true);
    setSplitKeyword(keyword);
    setActiveBook(null);
    setBookSummary('');
    try {
      const response = await fetch(`/api/wxread/search?keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      const results = data.results || [];

      setResult(results);
    } catch (error) {
      console.error('Search failed:', error);
      setResult([]);
    } finally {
      setLoading(false);
    }
  };

  // 处理回车键搜索
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search();
    }
  };

  const bookData = useMemo(() => {
    return result.find(item => item.title === '电子书' || item.title === '网络小说');
  }, [result]);

  const authorData = useMemo(() => {
    return result.find(item => item.title === '作者');
  }, [result]);

  const upcomingData = useMemo(() => {
    return result.find(item => item.title === '待上架');
  }, [result]);

  const keywordData = useMemo(() => {
    return result.find(item => item.title === '');
  }, [result]);

  const [authorSummary, setAuthorSummary] = useState('');
  useEffect(() => {
    if (authorData?.authors?.length) {
      const [author] = authorData.authors;
      const prompt = `请介绍作者${author.userInfo.name}的写作风格、代表作品和主要成就。`;

      setAuthorSummary('加载中...');
      fetch(`https://text.pollinations.ai/${prompt}?model=openai`)
        .then(response => response.text())
        .then(data => {
          setAuthorSummary(data);
        })
        .catch(error => {
          console.error('Author search failed:', error);
        });
    }
  }, [authorData]);

  const selectBook = (book: Book) => {
    const prompt = `请介绍电子书《${book.bookInfo.title}》的主要内容、核心观点和读者评价，作者是${book.bookInfo.author}。`;

    setActiveBook(book);
    setBookSummary('加载中...');
    fetch(`https://text.pollinations.ai/${prompt}?model=openai`)
      .then(response => response.text())
      .then(data => {
        setBookSummary(data);
      })
      .catch(error => {
        console.error('Book search failed:', error);
      });
  };

  return (
    <FeatureLayout 
      title="策划编辑" 
      subtitle="快速查找选题信息，生成多样化的选题内容"
    >
      <div className="space-y-6">
        {/* 搜索框区域 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex gap-4">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="请输入关键词进行搜索..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500"
              />
              <button
                onClick={search}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '搜索中...' : '搜索'}
              </button>
            </div>
          </div>
        </div>

        {/* 结果展示区域 */}
        <div className="grid grid-cols-1 gap-6">

          {/* 电子书模块 */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-white px-4 py-3">
              <h3 className="text-lg font-medium text-gray-900">电子书</h3>
            </div>
            <div className="p-4">
              {bookData ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    找到 {bookData?.scopeCount || 0} 本相关书籍
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 space-y-3">
                    {bookData?.books.map((book, index) => (
                      <div key={index} className="flex items-center gap-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => selectBook(book)}>
                        {book.bookInfo.cover && (
                          <img 
                            src={book.bookInfo.cover} 
                            alt={book.bookInfo.title} 
                            className="object-contain rounded"
                          />
                        )}
                        <div className="flex-1 flex flex-col justify-between h-full min-w-0">
                          <h4 className="font-base text-gray-900 truncate-2">{book.bookInfo.title}</h4>
                          <p className="text-sm text-gray-500 truncate">{book.bookInfo.author}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-yellow-600">
                              {((book.bookInfo.newRating / 10)).toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-400">
                              ({book.bookInfo.newRatingCount}评价)
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">暂无电子书数据</p>
              )}
            </div>
          </div>

          {/* 选中的书籍介绍 */}
          {activeBook && (<div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-white px-4 py-3">
              <h3 className="text-lg font-medium text-gray-900">
                {activeBook.bookInfo.title}
              </h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">
                作者：{activeBook.bookInfo.author}
              </p>

              <div className="border border-gray-200 rounded-lg p-3 whitespace-pre-wrap text-sm leading-4">
                <ReactMarkdown>{bookSummary}</ReactMarkdown>
              </div>
            </div>
          </div>)}

          {/* 作者模块 */}
          {authorData && (<div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-white px-4 py-3">
              <h3 className="text-lg font-medium text-gray-900">作者</h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  找到 {authorData?.scopeCount || 0} 位相关作者
                </p>
                <div className="space-y-3">
                  {authorData?.authors?.map((author, index) => (
                    <a href={`https://weread.qq.com/web/search/books?author=${encodeURIComponent(author.userInfo.name)}`} key={index} className="border border-gray-200 rounded-lg p-3 block">
                      <p className="text-sm text-blue-700">{author.userInfo.name}</p>
                      <p className="text-sm text-gray-700 line-clamp-2 my-2">{author.desc} {author.userInfo.vdesc}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          作品数: {author.totalCount}
                        </span>
                      </div>
                    </a>
                  ))}

                  <div className="border border-gray-200 rounded-lg p-3 whitespace-pre-wrap text-sm leading-4">
                    <ReactMarkdown>{authorSummary}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </div>)}

          {/* 全文中提到的书籍模块 */}
          {keywordData && (<div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-white px-4 py-3">
              <h3 className="text-lg font-medium text-gray-900">
                全文中提到 <span className="text-blue-600">{splitKeyword}</span> 的书籍 
                <span className="text-gray-500 text-base">（{keywordData?.scopeCount || 0}）</span>
              </h3>
            </div>
            <div className="p-4">
              {keywordData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 space-y-3">
                    {keywordData?.bookTexts?.map((book, index) => (
                      <div key={index} className="flex items-start gap-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                        {book.bookInfo.cover && (
                          <img 
                            src={book.bookInfo.cover} 
                            alt={book.bookInfo.title} 
                            className="object-contain rounded"
                          />
                        )}
                        <div className="flex-1 flex flex-col justify-between h-full min-w-0">
                          <h4 className="font-base text-gray-900 truncate-2 relative">
                            {book.bookInfo.title}
                            <span className="absolute top-1 right-0 bg-gray-200 px-1 rounded-xl text-[10px] text-gray-500 inline-flex items-center">
                              <FaUser />&nbsp;{book.bookInfo.newRatingCount}
                            </span>
                          </h4>
                          <p className="text-sm text-gray-500 truncate">{book.bookInfo.author}</p>
                          <div 
                            className="text-sm text-gray-500 max-h-10 line-clamp-2 overflow-hidden" 
                            dangerouslySetInnerHTML={{ __html: book.bookContentInfo.abstract.replace(splitKeyword, `<span class="text-blue-600">${splitKeyword}</span>`) }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">暂无电子书数据</p>
              )}
            </div>
          </div>)}

          {/* 待上架模块 */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-white px-4 py-3">
              <h3 className="text-lg font-medium text-gray-900">待上架</h3>
            </div>
            <div className="p-4">
              {upcomingData ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    找到 {upcomingData?.scopeCount || 0} 本待上架书籍
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 space-y-3">
                    {upcomingData?.books.map((book, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {book.bookInfo.cover && (
                          <img 
                            src={book.bookInfo.cover} 
                            alt={book.bookInfo.title} 
                            className="w-16 h-24 object-contain rounded"
                          />
                        )}
                        <div className="flex-1 flex flex-col justify-between h-full min-w-0">
                          <h4 className="font-medium text-gray-900 truncate-2">{book.bookInfo.title}</h4>
                          <p className="text-sm text-gray-500 truncate">{book.bookInfo.author}</p>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              预售中
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">暂无待出版数据</p>
              )}
            </div>
          </div>
        </div>

        {/* 无结果提示 */}
        {result.length === 0 && !loading && splitKeyword && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-8 text-center">
              <p className="text-gray-500">暂无搜索结果，请尝试其他关键词</p>
            </div>
          </div>
        )}
      </div>
    </FeatureLayout>
  );
} 