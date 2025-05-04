"use client";

import React, { useState, useEffect } from 'react';
import FeatureLayout from '../../components/FeatureLayout';
import MediaEditor from './MediaEditor';

export default function CommentEditorPage() {
  return (
    <FeatureLayout 
      title="新媒体编辑" 
      subtitle="全渠道社交媒体文案创建工具"
    >
      <MediaEditor />
    </FeatureLayout>
  );
}