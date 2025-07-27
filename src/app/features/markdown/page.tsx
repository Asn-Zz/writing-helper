import MarkdownFormatter from './components/MarkdownFormatter';
import { Metadata } from 'next';
import FeatureLayout from '../../components/FeatureLayout';

export const metadata: Metadata = {
  title: 'WeChat Public Account Formatter',
  description: 'Format your content for WeChat public account articles with beautiful styles',
};

export default function MarkdownFormatterPage() {
  return (
    <FeatureLayout 
      title="微信公众号排版工具" 
      subtitle="使用Markdown创建美观的微信公众号文章"
    >
      <MarkdownFormatter />
    </FeatureLayout>
  );
} 