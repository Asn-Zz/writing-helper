"use client";

import React, { useState, useEffect } from 'react';
import { FaBook } from 'react-icons/fa';
import ThesaurusModal from './ThesaurusModal';
import { useLocalStorage } from '@/app/hooks/useLocalStorage';
import { Thesaurus } from '../types';

const defaultThesaurus: Thesaurus[] = [
    {
        id: 'default',
        name: '默认',
        enabled: true,
        corrections: []
    }
];

export default function ThesaurusManager({ setThesauruses }: { setThesauruses: (thesauruses: Thesaurus[]) => void }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [thesauruses, setLocalThesauruses] = useLocalStorage<Thesaurus[]>('customThesauruses', defaultThesaurus);

    const [displayNames, setDisplayNames] = useState('');
    useEffect(() => {
        const enabledGroups = thesauruses.filter(t => t.enabled);

        setThesauruses(enabledGroups);
        setDisplayNames(enabledGroups.map(t => t.name).join(', '));
    }, [thesauruses]);

    const resetThesaurus = () => {
        if (window.confirm('确定要重置词库吗？')) {
            setLocalThesauruses(defaultThesaurus);
        }
    };

    return (
        <>
            <h3 className="text-gray-800 flex items-center cursor-pointer" onClick={() => setIsModalOpen(true)}>
                <FaBook className="mr-2 text-blue-500" />
                词库({displayNames || '全部'})
            </h3>
            <ThesaurusModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                thesauruses={thesauruses}
                setThesauruses={setLocalThesauruses}
                resetThesaurus={resetThesaurus}
            />
        </>
    );
}
