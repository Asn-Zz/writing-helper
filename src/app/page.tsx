
import FeatureLayout from './components/FeatureLayout';
import WritingHelp from './components/WritingHelp';

export default async function Home() {
  return (
    <FeatureLayout title="写作助手" subtitle="由先进的大语言模型驱动的智能写作助手">
      <WritingHelp />
    </FeatureLayout>
  );
}
