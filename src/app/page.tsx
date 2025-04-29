import WritingAssistant from './components/WritingAssistant';
import FeatureLayout from './components/FeatureLayout';

export default function Home() {
  return (
    <FeatureLayout title="写作助手" subtitle="由先进的大语言模型驱动的智能写作助手">
      <WritingAssistant />
    </FeatureLayout>
  );
}
