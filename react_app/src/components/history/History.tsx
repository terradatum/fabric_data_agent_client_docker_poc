import React, { useState, useMemo } from "react";
import { useAI } from "@context/useAI";
import styles from "./History.module.css";
import { HelixIcon } from "@helix/helix-icon";
import { search, comment, trash_can } from "@helix/helix-icon/outlined";

interface HistoryProps {
  onSelectConversation?: () => void;
}

const History: React.FC<HistoryProps> = ({ onSelectConversation }) => {
  const { history, setResponses, deleteHistoryItem } = useAI();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter history based on search query
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;

    return history.filter((session) => {
      // Search in all prompts and responses in the conversation
      return session.conversation.some(
        (item) =>
          item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.response.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [history, searchQuery]);

  if (history.length === 0) {
    return null;
  }

  return (
    <div className={styles.historyWrapper}>
      <div className='helix-input-group helix-mb-4 helix-w-100-percent'>
        <div className='helix-input-group__addon'>
          <HelixIcon icon={search} className={styles.searchIcon} />
        </div>
        <input
          type='text'
          placeholder='Search conversations...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='helix-text-input helix-w-100-percent'
        />{" "}
      </div>

      <div className={styles.historyList}>
        {filteredHistory.length === 0 ? (
          <div className={styles.noResults}>
            <p className='helix-text-gray-600'>
              No conversations found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          filteredHistory.map((session, index) => {
            const firstPrompt =
              session.conversation[0]?.prompt || "New conversation";
            const truncatedPrompt =
              firstPrompt.length > 80
                ? firstPrompt.substring(0, 80) + "..."
                : firstPrompt;
            const timestamp = session.conversation[0]?.timestamp;
            const timeString = timestamp
              ? new Date(timestamp).toLocaleDateString()
              : "";
            const messageCount = session.conversation.length;

            return (
              <div
                key={index}
                className={`${styles.historyItem} ${styles.historyItemWrapper}`}
              >
                <button
                  onClick={() => {
                    setResponses(session.conversation);
                    onSelectConversation?.();
                  }}
                  className={styles.historyItemButton}
                >
                  <div className={styles.historyItemContent}>
                    <div className={styles.historyItemIcon}>
                      <HelixIcon icon={comment} />
                    </div>
                    <div className={styles.historyItemDetails}>
                      <div className={styles.historyItemPrompt}>
                        {truncatedPrompt}
                      </div>
                      <div className={styles.historyItemMeta}>
                        {timeString} • {messageCount}{" "}
                        {messageCount === 1 ? "message" : "messages"}
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHistoryItem(index);
                  }}
                  className='helix-btn helix-btn--ghost'
                  title='Delete conversation'
                >
                  <HelixIcon icon={trash_can} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default History;
