"use client";

import React from 'react';
import FeatureLayout from '../../components/FeatureLayout';
import CheckerEditor from './CheckerEditor';

export default function CommentEditorPage() {
  return (
    <FeatureLayout 
      title="文章校对与生成助手" 
      subtitle="智能校对、文本转语音、封面图生成"
    >
      <CheckerEditor />
    </FeatureLayout>
  );
}