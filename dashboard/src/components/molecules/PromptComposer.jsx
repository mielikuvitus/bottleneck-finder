// A chat-style prompt box (AI analysis panel): the attachment as a file chip
// (not clickable), the prompt as read-only text, then the conversation
// (children: the thinking state and the reply), and a bottom bar with the
// model picker and the send button. The box keeps its size: everything above
// the bar scrolls, and follows the reply to the bottom while it types (unless
// the reader has scrolled up).
import { Children, useEffect, useId, useRef } from 'react';
import Icon from '../atoms/Icon.jsx';

// models: [{ id, name }], in picker order
export default function PromptComposer({ prompt, attachment, models, model, onModelChange, onSend, sendDisabled, children }) {
  const id = useId();
  const scrollRef = useRef(null);
  const replyRef = useRef(null);
  const followRef = useRef(true); // at the bottom: keep following
  // toArray leaves out empty children, so empty slots don't count as a reply
  const hasReply = Children.toArray(children).length > 0;

  // Once sent, jump to the bottom, then stay there as the reply grows
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!hasReply || !scroller || !replyRef.current) return undefined;
    followRef.current = true;
    const toBottom = () => {
      if (followRef.current) scroller.scrollTop = scroller.scrollHeight;
    };
    toBottom();
    const observer = new ResizeObserver(toBottom);
    observer.observe(replyRef.current);
    return () => observer.disconnect();
  }, [hasReply]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    followRef.current = el.scrollHeight - el.clientHeight - el.scrollTop < 24;
  };

  return (
    <div className="prompt-composer">
      {/* Focusable so the arrow keys can scroll the reply */}
      <div className="prompt-composer-scroll" ref={scrollRef} onScroll={onScroll} role="group" aria-label="Prompt and reply" tabIndex={0}>
        {attachment ? (
          <div className="prompt-composer-attachment">
            <Icon name="description" size={16} />
            <span className="prompt-composer-file">{attachment.name}</span>
            {attachment.size ? <span className="prompt-composer-size">{attachment.size}</span> : null}
          </div>
        ) : null}

        <label className="visually-hidden" htmlFor={`${id}-prompt`}>
          Prompt (read-only)
        </label>
        <textarea id={`${id}-prompt`} className="prompt-composer-text" value={prompt} readOnly rows={12} />

        {hasReply ? (
          <div className="prompt-composer-reply" ref={replyRef}>
            {children}
          </div>
        ) : null}
      </div>

      <div className="prompt-composer-bar">
        <label className="visually-hidden" htmlFor={`${id}-model`}>
          Model
        </label>
        <select id={`${id}-model`} className="prompt-composer-model" value={model} onChange={(e) => onModelChange(e.target.value)}>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {/* aria-disabled keeps keyboard focus on the button once sent; disabled can lose it */}
        <button type="button" className="prompt-composer-send" onClick={sendDisabled ? undefined : onSend} aria-disabled={sendDisabled ? true : undefined}>
          <Icon name="arrowUpward" size={18} />
          <span className="visually-hidden">Send</span>
        </button>
      </div>
    </div>
  );
}
