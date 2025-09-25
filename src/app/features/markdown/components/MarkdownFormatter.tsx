'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FaBold, FaItalic, FaListUl, FaListOl, FaQuoteLeft, FaLink, FaImage,
  FaCode, FaFileCode, FaTable, FaMinus, FaUndo, FaQuestionCircle,
  FaEdit, FaEye
} from 'react-icons/fa';

const defaultMarkdownContent = `# Markdown Formatter
This is a simple markdown editor.

## Features
- Edit Markdown on the left
- See the preview on the right
- Basic formatting toolbar

### Example
*   List item 1
*   List item 2
`;

export default function MarkdownFormatter() {
  const [markdown, setMarkdown] = useState<string>(defaultMarkdownContent);
  const previewRef = useRef<HTMLDivElement>(null);

  // Apply styling to the preview
  useEffect(() => {
    const styleId = 'markdown-formatter-style';
    // Avoid adding duplicate styles
    if (document.getElementById(styleId)) {
      return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = styleId;

    const css = `
      .markdown-preview {
        flex: 1;
        overflow-y: scroll;
        font-family: -apple-system, BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB, Microsoft YaHei UI, Microsoft YaHei, Arial, sans-serif;
        color: #333;
        font-size: 14px;
        line-height: 1.75;
        background: #fff;
        padding: 16px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      }
      .markdown-preview h1 { font-size: 24px; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px; }
      .markdown-preview h2 { font-size: 20px; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px; }
      .markdown-preview h3 { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
      .markdown-preview p { margin: 10px 0; line-height: 1.75; }
      .markdown-preview a { color: #0366d6; text-decoration: none; }
      .markdown-preview code { background-color: rgba(27,31,35,.05); border-radius: 3px; font-size: 85%; margin: 0; padding: 0.2em 0.4em; }
      .markdown-preview pre { background-color: #f6f8fa; border-radius: 3px; font-size: 85%; line-height: 1.45; overflow: auto; padding: 16px; }
      .markdown-preview blockquote { border-left: 4px solid #dfe2e5; color: #6a737d; padding: 0 1em; }
      .markdown-preview img { max-width: 100%; box-sizing: content-box; }
      .markdown-preview .image-wrapper { text-align: center; margin: 16px 0; }
      .markdown-preview .image-wrapper img { max-width: 100%; }
    `;

    styleElement.textContent = css;
    document.head.appendChild(styleElement);

    return () => {
      const style = document.getElementById(styleId);
      if (style) {
        document.head.removeChild(style);
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  const copyToClipboard = async () => {
    if (previewRef.current) {
      try {
        await navigator.clipboard.writeText(previewRef.current.innerHTML);
        alert('已复制到剪贴板');
      } catch (err) {
        console.error('无法复制内容: ', err);
        alert('复制失败，请手动复制');
      }
    }
  };

  const copyTextToClipboard = async () => {
    if (previewRef.current) {
      try {
        await navigator.clipboard.writeText(previewRef.current.innerText);
        alert('已复制纯文本到剪贴板');
      } catch (err) {
        console.error('无法复制内容: ', err);
        alert('复制失败，请手动复制');
      }
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const adjustHeight = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    };
    adjustHeight();
    const resizeObserver = new ResizeObserver(() => {
      adjustHeight();
    });
    if (textareaRef.current) {
      resizeObserver.observe(textareaRef.current);
    }
    return () => {
      if (textareaRef.current) {
        resizeObserver.unobserve(textareaRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [markdown]);

  const [showTableGenerator, setShowTableGenerator] = useState<boolean>(false);
  const [tableRows, setTableRows] = useState<number>(3);
  const [tableCols, setTableCols] = useState<number>(3);
  const [markdownHistory, setMarkdownHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);
  const [showMarkdownHelp, setShowMarkdownHelp] = useState<boolean>(false);

  const generateTable = () => {
    if (!textareaRef.current) return;

    const headerRow = Array(tableCols).fill('').map((_, i) => `表头${i+1}`).join(' | ');
    const separatorRow = Array(tableCols).fill('-----').join(' | ');
    const contentRows = Array(tableRows).fill('').map((_, rowIdx) => {
      return Array(tableCols).fill('').map((_, colIdx) => `内容${rowIdx*tableCols+colIdx+1}`).join(' | ');
    }).join('\n| ');

    const tableMarkdown = `\n| ${headerRow} |\n| ${separatorRow} |\n| ${contentRows} |\n`;

    insertMarkdown('customtable', tableMarkdown);
    setShowTableGenerator(false);
  };

  const undoEdit = () => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      setMarkdown(markdownHistory[newIndex]);
    }
  };

  const saveHistory = (newText: string) => {
    if (currentHistoryIndex < markdownHistory.length - 1) {
      const newHistory = markdownHistory.slice(0, currentHistoryIndex + 1);
      setMarkdownHistory([...newHistory, newText]);
    } else {
      setMarkdownHistory([...markdownHistory, newText]);
    }
    setCurrentHistoryIndex(markdownHistory.length);
  };

  const insertMarkdown = (type: string, customContent?: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);

    let insertion = '';

    switch(type) {
      case 'bold':
        insertion = `**${selectedText || '加粗文字'}**`;
        break;
      case 'italic':
        insertion = `*${selectedText || '斜体文字'}*`;
        break;
      case 'heading1':
        insertion = `\n# ${selectedText || '一级标题'}\n`;
        break;
      case 'heading2':
        insertion = `\n## ${selectedText || '二级标题'}\n`;
        break;
      case 'heading3':
        insertion = `\n### ${selectedText || '三级标题'}\n`;
        break;
      case 'heading4':
        insertion = `\n#### ${selectedText || '四级标题'}\n`;
        break;
      case 'heading5':
        insertion = `\n##### ${selectedText || '五级标题'}\n`;
        break;
      case 'link':
        insertion = `[${selectedText || '链接文字'}](https://example.com)`;
        break;
      case 'image':
        insertion = `![${selectedText || '图片描述'}](https://example.com/image.jpg)`;
        break;
      case 'code':
        insertion = selectedText ? `\`${selectedText}\`` : '`代码`';
        break;
      case 'codeblock':
        insertion = selectedText ? 
          `\n\`\`\`\n${selectedText}\n\`\`\`\n` : 
          '\n```\n// 在此处输入代码\n```\n';
        break;
      case 'quote':
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          insertion = '\n' + lines.map(line => `> ${line}`).join('\n') + '\n';
        } else {
          insertion = `\n> ${selectedText || '引用文字'}\n`;
        }
        break;
      case 'list':
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          insertion = '\n' + lines.map(line => `- ${line}`).join('\n') + '\n';
        } else {
          insertion = `\n- ${selectedText || '列表项'}\n`;
        }
        break;
      case 'orderedlist':
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          insertion = '\n' + lines.map((line, i) => `${i+1}. ${line}`).join('\n') + '\n';
        } else {
          insertion = `\n1. ${selectedText || '有序列表项'}\n`;
        }
        break;
      case 'table':
        setShowTableGenerator(true);
        return;
      case 'customtable':
        insertion = customContent || '';
        break;
      case 'hr':
        insertion = '\n\n---\n\n';
        break;
    }

    const newText = beforeText + insertion + afterText;
    saveHistory(textarea.value);
    setMarkdown(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertion.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const markdownHelpContent = (
    <div className="bg-white border border-gray-200 rounded-md p-4 mt-2 text-sm shadow-md">
      <h4 className="font-medium text-gray-800 mb-2">Markdown 语法参考</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <p className="text-gray-700 mb-1"><code className="bg-gray-100 px-1 py-0.5 rounded"># 标题</code> - 一级标题</p>
          <p className="text-gray-700 mb-1"><code className="bg-gray-100 px-1 py-0.5 rounded">## 标题</code> - 二级标题</p>
          <p className="text-gray-700 mb-1"><code className="bg-gray-100 px-1 py-0.5 rounded">**文字**</code> - <strong>加粗文字</strong></p>
          <p className="text-gray-700 mb-1"><code className="bg-gray-100 px-1 py-0.5 rounded">*文字*</code> - <em>斜体文字</em></p>
          <p className="text-gray-700 mb-1"><code className="bg-gray-100 px-1 py-0.5 rounded">~~文字~~</code> - <del>删除线</del></p>
        </div>
        <div>
          <p className="text-gray-700 mb-1"><code className="bg-gray-100 px-1 py-0.5 rounded">[链接](URL)</code> - 链接</p>
          <p className="text-gray-700 mb-1"><code className="bg-gray-100 px-1 py-0.5 rounded">![描述](图片URL)</code> - 图片</p>
          <p className="text-gray-700 mb-1"><code className="bg-gray-100 px-1 py-0.5 rounded">- 项目</code> - 无序列表</p>
          <p className="text-gray-700 mb-1"><code className="bg-gray-100 px-1 py-0.5 rounded">1. 项目</code> - 有序列表</p>
          <p className="text-gray-700 mb-1"><code className="bg-gray-100 px-1 py-0.5 rounded">{`>`} 引用</code> - 引用文本</p>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-600">
        <p>点击上方工具栏按钮可快速插入对应格式</p>
      </div>
    </div>
  );

  return (
    <div className="markdown-formatter">
      <div className="p-0">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/2 space-y-4">
              <div className="border border-gray-200 rounded-lg p-4 bg-white flex flex-col h-full">
                <h3 className="text-lg font-medium mb-3 flex items-center text-gray-800">
                  <FaEdit className="mr-2 text-blue-600" />
                  Markdown 编辑
                </h3>

                <div className="mb-2 flex flex-wrap gap-1">
                  <button type="button" onClick={() => insertMarkdown('heading1')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="一级标题"><span className="font-bold text-base">H1</span></button>
                  <button type="button" onClick={() => insertMarkdown('heading2')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="二级标题"><span className="font-bold text-base">H2</span></button>
                  <button type="button" onClick={() => insertMarkdown('heading3')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="三级标题"><span className="font-bold text-base">H3</span></button>
                  <button type="button" onClick={() => insertMarkdown('heading4')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="四级标题"><span className="font-bold text-base">H4</span></button>
                  <button type="button" onClick={() => insertMarkdown('heading5')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="五级标题"><span className="font-bold text-base">H5</span></button>
                  <div className="h-6 w-px bg-gray-300 mx-1"></div>
                  <button type="button" onClick={() => insertMarkdown('bold')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="加粗"><FaBold /></button>
                  <button type="button" onClick={() => insertMarkdown('italic')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="斜体"><FaItalic /></button>
                  <div className="h-6 w-px bg-gray-300 mx-1"></div>
                  <button type="button" onClick={() => insertMarkdown('list')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="无序列表"><FaListUl /></button>
                  <button type="button" onClick={() => insertMarkdown('orderedlist')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="有序列表"><FaListOl /></button>
                  <button type="button" onClick={() => insertMarkdown('quote')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="引用"><FaQuoteLeft /></button>
                  <div className="h-6 w-px bg-gray-300 mx-1"></div>
                  <button type="button" onClick={() => insertMarkdown('link')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="插入链接"><FaLink /></button>
                  <button type="button" onClick={() => insertMarkdown('image')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="插入图片"><FaImage /></button>
                  <button type="button" onClick={() => insertMarkdown('code')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="插入代码"><FaCode /></button>
                  <button type="button" onClick={() => insertMarkdown('codeblock')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="插入代码块"><FaFileCode /></button>
                  <button type="button" onClick={() => insertMarkdown('table')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="插入表格"><FaTable /></button>
                  <button type="button" onClick={() => insertMarkdown('hr')} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded" title="插入水平线"><FaMinus /></button>
                  <button type="button" onClick={undoEdit} disabled={currentHistoryIndex <= 0} className={`p-1.5 text-gray-700 hover:bg-gray-100 rounded ${currentHistoryIndex <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`} title="撤销"><FaUndo /></button>
                  <div className="flex-grow"></div>
                  <button type="button" onClick={() => setShowMarkdownHelp(!showMarkdownHelp)} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded flex items-center" title="Markdown 帮助"><FaQuestionCircle className="mr-1" /><span className="text-sm">帮助</span></button>
                </div>

                {showMarkdownHelp && markdownHelpContent}

                {showTableGenerator && (
                  <div className="bg-white border border-gray-200 rounded-md p-4 my-2 shadow-md">
                    <h4 className="font-medium text-gray-800 mb-3">创建表格</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">行数</label>
                        <input type="number" min="1" max="10" value={tableRows} onChange={(e) => setTableRows(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">列数</label>
                        <input type="number" min="1" max="10" value={tableCols} onChange={(e) => setTableCols(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setShowTableGenerator(false)} className="mr-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">取消</button>
                      <button type="button" onClick={generateTable} className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">插入表格</button>
                    </div>
                  </div>
                )}

                <textarea
                  id="markdown-editor"
                  ref={textareaRef}
                  className="w-full flex-1 p-3 border border-gray-300 rounded-md font-mono text-sm"
                  value={markdown}
                  onChange={(e) => {
                    saveHistory(markdown);
                    setMarkdown(e.target.value);
                  }}
                  style={{ overflow: 'hidden', resize: 'none' }}
                />
              </div>
            </div>

            <div className="md:w-1/2 space-y-4">
              <div className="border border-gray-200 rounded-lg p-4 bg-white h-full relative flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium flex items-center text-gray-800">
                    <FaEye className="mr-2 text-green-600" />
                    预览
                  </h3>
                  <div className='flex gap-4'>
                    <button onClick={copyToClipboard} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium">复制 HTML</button>
                    <button onClick={copyTextToClipboard} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium">复制文本</button>
                  </div>
                </div>
                <div 
                  ref={previewRef}
                  className="markdown-preview"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdown}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}