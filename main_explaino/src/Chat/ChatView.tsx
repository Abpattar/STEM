import React from 'react';
import { VoiceAgent } from '../Voice';

export interface ChatViewProps {
  onBack?: () => void;
  topic?: string;
  initialInteractionMode?: 'voice' | 'text';
  onNavigateToModule?: (target: 'scratchpad' | 'digitallab') => void;
  className?: string;
}

/**
 * Canonical conversational entry view from NILO's radial wheel ("Talk to EXO")
 * and conversational task actions. Delegates directly to NILO's single native
 * EXO Voice Tutor (VoiceAgent -> ExoWorkspace), sharing the same session,
 * conversation history, backend, and StudentLearningContext.
 */
export const ChatView: React.FC<ChatViewProps> = ({
  onBack,
  topic,
  initialInteractionMode = 'voice',
  onNavigateToModule,
  className = '',
}) => {
  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-[#FAF8FE] ${className}`}>
      <VoiceAgent
        fullScreen={true}
        backLabel="Back to Wheel"
        initialTopic={topic}
        initialInteractionMode={initialInteractionMode}
        onClose={onBack}
        onNavigateToModule={onNavigateToModule}
      />
    </div>
  );
};
