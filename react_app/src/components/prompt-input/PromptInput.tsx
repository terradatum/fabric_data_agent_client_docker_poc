import { useAI } from "@context/useAI";
import styles from "./PromptInput.module.css";
import { HelixIcon } from "@helix/helix-icon";
import { arrow_right, version_history } from "@helix/helix-icon/outlined";
import { useRef, useEffect } from "react";

interface PromptInputProps extends React.HTMLAttributes<HTMLTextAreaElement> {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  setPreviousPageContext: (context: 'default' | 'results') => void;
}

const PromptInput = ({
  showHistory,
  setShowHistory,
  setPreviousPageContext,
  ...rests
}: PromptInputProps) => {
  const { setPrompt, prompt, submitPrompt, isLoading, responses, history } =
    useAI();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    autoResize();
  };

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";
      // Set height to scrollHeight to fit content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // Auto-resize when prompt changes (e.g., from sample prompts)
  useEffect(() => {
    autoResize();
  }, [prompt]);

  return (
    <div
      className={`helix-d-flex helix-flex-direction--column helix-p-2 helix-align--start helix-mt-4  helix-w-100-percent ${styles.textareaWrapper} helix-bg-white`}
    >
      <textarea
        ref={textareaRef}
        id='prompt-input'
        onChange={handleChange}
        value={prompt}
        aria-label='Prompt Input'
        placeholder={responses.length === 0 ? "Ask your Assistant anything..." : "Ask a follow up question..."}
        disabled={isLoading}
        {...rests}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            submitPrompt(prompt);
            setPrompt(""); // Clear prompt after submission
          }
        }}
      />
      <div className='helix-d-flex helix-justify--end helix-align--center helix-w-100-percent'>
        {history.length > 0 && !showHistory && (
          <button
            className='helix-btn helix-btn--ghost helix-mr-2'
            onClick={() => {
              // Track which page context we're coming from
              const currentContext = responses.length > 0 ? 'results' : 'default';
              setPreviousPageContext(currentContext);
              setShowHistory(!showHistory);
            }}
            type='button'
            title='Show conversation history'
          >
            <HelixIcon icon={version_history} />
          </button>
        )}
        <button
          disabled={isLoading || prompt.trim() === ""}
          className='helix-btn helix-btn--primary'
          onClick={() => {
            submitPrompt(prompt);
            setPrompt(""); // Clear prompt after submission
          }}
          type='button'
        >
          <HelixIcon icon={arrow_right} />
        </button>
      </div>
    </div>
  );
};
export default PromptInput;
