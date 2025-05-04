"use client";

import React, { useState, useEffect } from 'react';
import FeatureLayout from '../../components/FeatureLayout';
import TopicSelector from './TopicSelector';

export default function CommentEditorPage() {
  return (
    <FeatureLayout 
      title="选题情报员" 
      subtitle="分析图书榜单、热榜资讯、热门话题，助力编辑选题决策"
    >
      <TopicSelector />
    </FeatureLayout>
  );
}