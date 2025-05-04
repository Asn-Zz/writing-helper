"use client";

import React, { useState, useEffect } from 'react';
import FeatureLayout from '../../components/FeatureLayout';
import CommentEditor from './CommentEditor';

export default function CommentEditorPage() {
  return (
    <FeatureLayout 
      title="评论编辑" 
      subtitle="生成多样化的评论内容，支持自定义类型和风格"
    >
      <CommentEditor />
    </FeatureLayout>
  );
}