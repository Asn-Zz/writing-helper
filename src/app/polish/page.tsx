"use client";

import React from 'react';
import ArticlePolisher from '../components/ArticlePolisher';
import FeatureLayout from '../components/FeatureLayout';

export default function PolishPage() {
  return (
    <FeatureLayout 
      title="文章润色" 
      subtitle="提升文章质量，修正表达，使文章更专业流畅"
    >
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6">
          <ArticlePolisher />
        </div>
      </div>
    </FeatureLayout>
  );
} 