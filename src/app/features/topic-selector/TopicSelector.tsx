'use client';

import React, { useState, useCallback } from 'react';
import { FaBook, FaNewspaper, FaFire, FaRankingStar } from 'react-icons/fa6';
import BookAnalysis from './components/BookAnalysis';
import InformationAnalysis from './components/InformationAnalysis';
import HotTopics from './components/HotTopics';
import HotLists from './components/HotLists';

type AppMode = 'books' | 'information' | 'topic' | 'hot-lists';

export default function TopicSelector() {
    const [appMode, setAppMode] = useState<AppMode>('books');

    const handleSetAppMode = useCallback((mode: AppMode) => {
        setAppMode(mode);
    }, []);

    const taskList = [
        {
            id: 'books',
            name: '图书榜单',
            icon: <FaBook className="inline mr-2" />,
            component: <BookAnalysis />
        },
        {
            id: 'information',
            name: '热榜资讯',
            icon: <FaNewspaper className="inline mr-2" />,
            component: <InformationAnalysis />
        },
        {
            id: 'topic',
            name: '热门话题',
            icon: <FaFire className="inline mr-2" />,
            component: <HotTopics />
        },
        {
            id: 'hot-lists',
            name: '热门榜单',
            icon: <FaRankingStar className="inline mr-2" />,
            component: <HotLists />
        }
    ];

    return (
        <div className="min-h-screen flex flex-col">
            <main className="mx-auto flex-grow w-full">
                {/* Mode Selection Tabs */}
                <nav className="flex border-b border-gray-200 mb-6 no-print">
                    {taskList.map((task) => (
                        <button
                            key={task.id}
                            onClick={() => handleSetAppMode(task.id as AppMode)}
                            className={`py-3 px-5 text-center border-b-2 focus:outline-none hover:bg-gray-100 transition duration-150 ease-in-out ${appMode === task.id ? 'border-blue-500 text-blue-500 font-semibold' : 'border-transparent text-gray-500'}`}
                        >
                            {task.icon}
                            {task.name}
                        </button>
                    ))}
                </nav>
                <div>
                    {taskList.map((task) => (
                        <div key={task.id} className={appMode === task.id ? '' : 'hidden'}>
                            {task.component}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
