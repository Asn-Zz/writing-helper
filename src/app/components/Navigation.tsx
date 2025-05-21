"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

// 定义导航链接类型
type NavLink = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  target?: string;
  children?: NavLink[];
};

// 集中管理所有功能页面的导航链接
export const featureLinks: NavLink[] = [
  { href: '/features/topic-selector', label: '选题情报' },
  { href: '/', label: '写作助手' },
  { href: '/features/ai-rewrite', label: 'AI文本优化' },
  { href: '/features/checker', label: '文章校对' },
  { href: '/features/media-editor', label: '新媒体编辑' },
  { href: '/features/comment-editor', label: '评论编辑' },
  { 
    href: '#text', 
    label: '文本工具', 
    children: [
      { href: '/polish', label: '文章润色' },
      { href: '/features/text-summarizer', label: '文本摘要' },
      { href: 'https://card.3min.top', label: '文字卡片', target: '_blank' },
    ] 
  },
  { 
    href: '#other', 
    label: '其他工具', 
    children: [
      { href: '/features/markdown', label: '编辑器', target: '_blank' },
      { href: '/share/to-markdown', label: '文件转markdown', target: '_blank' },
      { href: '/share/to-podcast', label: '音频转播客', target: '_blank' },
      { href: 'https://deep.codepoem.top', label: '调研报告', target: '_blank' },
    ] 
  },
  // { href: '/grok', label: 'API测试' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSubMenuOpen, setMobileSubMenuOpen] = useState<string | null>(null);
  
  // 处理桌面端子菜单的显示/隐藏
  const toggleSubmenu = (href: string) => {
    setOpenSubmenu(openSubmenu === href ? null : href);
  };

  // 处理移动端菜单的显示/隐藏
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // 处理移动端子菜单的显示/隐藏
  const toggleMobileSubmenu = (href: string) => {
    setMobileSubMenuOpen(mobileSubMenuOpen === href ? null : href);
  };
  
  return (
    <nav className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex h-full">
            <div className="flex flex-shrink-0 items-center">
              <span className="text-xl font-bold text-gray-900">AI 编辑工作室</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {featureLinks.map((link) => {
                const isActive = pathname === link.href || 
                  (link.children?.some(child => child.href === pathname) ?? false);
                
                // 如果有子菜单
                if (link.children && link.children.length > 0) {
                  return (
                    <div key={link.href} className="relative inline-block text-left">
                      <button
                        onClick={() => toggleSubmenu(link.href)}
                        className={`inline-flex items-center px-1 pt-1 text-sm font-medium h-full ${isActive
                          ? 'border-b-2 border-indigo-500 text-gray-900'
                          : 'border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`}
                      >
                        {link.icon && <span className="mr-2">{link.icon}</span>}
                        {link.label}
                        <svg
                          className="ml-1 h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      
                      {/* 子菜单下拉框 */}
                      {openSubmenu === link.href && (
                        <div className="absolute z-10 mt-1 w-48 rounded-md bg-white shadow-lg">
                          <div className="py-1" role="menu" aria-orientation="vertical">
                            {link.children.map((child) => {
                              const isChildActive = pathname === child.href;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  target={child.target}
                                  className={`block px-4 py-2 text-sm ${isChildActive
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                  }`}
                                  role="menuitem"
                                >
                                  {child.icon && <span className="mr-2">{child.icon}</span>}
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                
                // 没有子菜单的普通链接
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    target={link.target}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${isActive
                      ? 'border-b-2 border-indigo-500 text-gray-900'
                      : 'border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {link.icon && <span className="mr-2">{link.icon}</span>}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* 移动端菜单按钮 */}
          <div className="sm:hidden flex items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              onClick={toggleMobileMenu}
            >
              <span className="sr-only">打开菜单</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* 移动端导航菜单 */}
      <div className={`sm:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="space-y-1 px-2 pb-3 pt-2">
          {featureLinks.map((link) => {
            const isActive = pathname === link.href || 
              (link.children?.some(child => child.href === pathname) ?? false);
            
            // 如果有子菜单
            if (link.children && link.children.length > 0) {
              return (
                <div key={link.href} className="space-y-1">
                  <button
                    onClick={() => toggleMobileSubmenu(link.href)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-base font-medium ${isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="flex items-center">
                      {link.icon && <span className="mr-2">{link.icon}</span>}
                      {link.label}
                    </span>
                    <svg
                      className={`h-5 w-5 transform transition-transform duration-200 ${mobileSubMenuOpen === link.href ? 'rotate-180' : ''}`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  
                  {/* 移动端子菜单 */}
                  {mobileSubMenuOpen === link.href && (
                    <div className="pl-4 space-y-1">
                      {link.children.map((child) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block rounded-md px-3 py-2 text-base font-medium ${isChildActive
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {child.icon && <span className="mr-2">{child.icon}</span>}
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            // 没有子菜单的普通链接
            return (
              <Link
                key={link.href}
                href={link.href}
                target={link.target}
                className={`block rounded-md px-3 py-2 text-base font-medium ${isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {link.icon && <span className="mr-2">{link.icon}</span>}
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}