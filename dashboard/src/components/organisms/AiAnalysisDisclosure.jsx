// "AI analysis for the suggested fixes" (the planned LLM layer, not
// connected): the prompt and its findings.json attachment in a chat-style box,
// and after Send, a canned reply that types itself out in the same box. Closed by default.
// The contract (prompt, input, output schema, models) is in
// src/data/aiContract.js; the replies in src/data/cannedAiResponses.json.
import { useEffect, useState } from 'react';
import Icon from '../atoms/Icon.jsx';
import Disclosure from '../molecules/Disclosure.jsx';
import PromptComposer from '../molecules/PromptComposer.jsx';
import AiResponse from '../molecules/AiResponse.jsx';
import { ATTACHMENT_NAME, MODELS, PROMPT_TEMPLATE, attachmentSize, buildAiInput, cannedKey } from '../../data/aiContract.js';
import CANNED from '../../data/cannedAiResponses.json';

const THINKING_MS = 900; // "Thinking…" before the reply starts

// defaultOpen: true to start open (the components page)
export default function AiAnalysisDisclosure({ finding, peaks, defaultOpen = false }) {
  const [model, setModel] = useState(MODELS[0].id);
  // idle → thinking → answered
  const [status, setStatus] = useState('idle');
  const canned = CANNED[cannedKey(finding)];

  useEffect(() => {
    if (status !== 'thinking') return undefined;
    const timer = setTimeout(() => setStatus('answered'), THINKING_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const modelName = MODELS.find((m) => m.id === model)?.name;

  return (
    // keepMounted: hidden when closed, not removed, so the reply is kept and types only once
    <Disclosure label="AI analysis for the suggested fixes" className="ai-disclosure" contentClassName="ai-content" defaultOpen={defaultOpen} keepMounted>
      <p className="ai-note ai-note-warning">
        <Icon name="warningAmber" size={16} />
        Not connected yet: this shows the planned LLM layer. The prompt is read-only and the reply is pre-written.
      </p>
      <PromptComposer
        prompt={PROMPT_TEMPLATE}
        attachment={{ name: ATTACHMENT_NAME, size: attachmentSize(buildAiInput(finding, peaks)) }}
        models={MODELS}
        model={model}
        onModelChange={setModel}
        onSend={() => setStatus('thinking')}
        sendDisabled={!canned || status !== 'idle'}
      >
        {/* The reply comes in the same box, under the prompt */}
        {status === 'thinking' ? (
          <p className="ai-thinking" role="status">
            Thinking…
          </p>
        ) : null}
        {status === 'answered' ? <AiResponse response={canned} modelName={modelName} typing /> : null}
      </PromptComposer>
      {!canned ? <p className="ai-note">There's no pre-written reply for this finding yet.</p> : null}
    </Disclosure>
  );
}
