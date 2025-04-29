"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 定义导航链接类型
type NavLink = {
  href: string;
  label: string;
  icon?: React.ReactNode;
};

// 集中管理所有功能页面的导航链接
export const featureLinks: NavLink[] = [
  { href: '/', label: '写作助手' },

  // { href: '/features/text-summarizer', label: '文本摘要' },
  { href: '/features/ai-rewrite', label: 'AI文本优化' },

  { href: '/polish', label: '文本润色' },
  
  // 在此处添加新的功能页面链接
  { href: '/features/text-summarizer', label: '文本摘要' },

  { href: '/features/markdown', label: '编辑器' },
  
  { href: '/grok', label: 'API测试' },
];

export default function Navigation() {
  const pathname = usePathname();
  
  return (
    <nav className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <span className="text-xl font-bold text-gray-900">AI 编辑工作室</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {featureLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                      isActive
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
        </div>
      </div>
      
      {/* 移动端导航菜单 */}
      <div className="sm:hidden">
        <div className="space-y-1 px-2 pb-3 pt-2">
          {featureLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-md px-3 py-2 text-base font-medium ${
                  isActive
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
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