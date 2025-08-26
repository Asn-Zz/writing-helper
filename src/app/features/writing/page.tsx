import FeatureLayout from '@/app/components/FeatureLayout';
import WritingAssistant from './components/WritingAssistant';

export default function Home() {
  return (
    <FeatureLayout title="文章写作" subtitle="智能生成文章，让写作更简单">
      <WritingAssistant />
    </FeatureLayout>
  );
}
