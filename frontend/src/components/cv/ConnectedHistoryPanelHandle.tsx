/**
 * Connected History Panel Handle Component
 *
 * This component connects the HistoryPanelHandle to the CV store and
 * manages the entry count and state automatically.
 */

import React, { useState, useEffect } from "react";
import HistoryPanelHandle from "./HistoryPanelHandle";
import { useCVStore } from "../../stores/cvStore";

interface ConnectedHistoryPanelHandleProps {
  cvId: string;
}

const ConnectedHistoryPanelHandle: React.FC<
  ConnectedHistoryPanelHandleProps
> = ({ cvId }) => {
  const { historyPanelOpen, setHistoryPanelOpen, getHistoryEntries } =
    useCVStore();

  const [entryCount, setEntryCount] = useState(0);

  // Load entry count when component mounts or cvId changes
  useEffect(() => {
    let mounted = true;

    const loadEntryCount = async () => {
      // Skip history loading for temporary CVs (they don't exist on backend yet)
      if (cvId.startsWith("temp-")) {
        if (mounted) {
          setEntryCount(0);
        }
        return;
      }

      try {
        const entries = await getHistoryEntries(cvId);
        if (mounted) {
          setEntryCount(entries.length);
        }
      } catch (error) {
        if (mounted) {
          setEntryCount(0);
        }
      }
    };

    loadEntryCount();

    return () => {
      mounted = false;
    };
  }, [cvId, getHistoryEntries]);

  const handleOpen = () => {
    setHistoryPanelOpen(true);
  };

  return (
    <HistoryPanelHandle
      isOpen={historyPanelOpen}
      onOpen={handleOpen}
      entryCount={entryCount}
      showCount={true}
    />
  );
};

export default ConnectedHistoryPanelHandle;
