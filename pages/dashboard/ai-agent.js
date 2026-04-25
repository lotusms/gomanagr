import { useState } from 'react';
import AIAgentChat from '@/components/ai/AIAgentChat';
import PrimaryButton from '@/components/ui/buttons/PrimaryButton';

export default function AIAgentPage() {
  const [chatResetSignal, setChatResetSignal] = useState(0);

  const handleStartNewChat = () => {
    setChatResetSignal((value) => value + 1);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Hermes</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Ask questions, get operational guidance, and draft next actions with Hermes.
          </p>
        </div>
        <PrimaryButton type="button" onClick={handleStartNewChat} className="min-w-0 px-4 py-2">
          Start a New Chat
        </PrimaryButton>
      </div>
      <AIAgentChat resetSignal={chatResetSignal} />
    </div>
  );
}
