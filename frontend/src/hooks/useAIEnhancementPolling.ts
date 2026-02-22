/**
 * useAIEnhancementPolling
 *
 * Monitors global polling tasks for AI enhancements: restores button loading state,
 * shows completion/error notifications, handles favicon badge and draft refresh.
 * Extracted from SectionManagerSidebar to reduce its size and separate concerns.
 */

import { useEffect, useRef } from 'react';
import {
  setFaviconBadge,
  clearFaviconBadge,
  isPageHidden as isFaviconPageHidden,
} from '../utils/faviconBadge';
import {
  setTitleNotification,
  clearTitleNotification,
} from '../utils/titleNotification';

interface PollingTask {
  type: string;
  cvId?: string;
  isGenerating?: boolean;
  generationError?: string;
  data?: { enhancement_data?: unknown };
}

type ShowErrorFn = (title: string, message: string) => void;
type ShowInfoFn = (title: string, message?: string, toastOnly?: boolean) => string | void;

interface UseAIEnhancementPollingParams {
  cvId: string | undefined;
  activeTasks: Map<string, PollingTask>;
  allSuggestions: unknown;
  suggestionsLoading: boolean;
  showError: ShowErrorFn;
  showInfo: ShowInfoFn;
  setSuggestionsLoading: (loading: boolean) => void;
  getCVDrafts: (cvId: string) => void;
  removeTask: (id: string) => void;
}

export function useAIEnhancementPolling({
  cvId,
  activeTasks,
  allSuggestions,
  suggestionsLoading,
  showError,
  showInfo,
  setSuggestionsLoading,
  getCVDrafts,
  removeTask,
}: UseAIEnhancementPollingParams): void {
  const suggestionsLoadingRef = useRef(suggestionsLoading);
  const allSuggestionsRef = useRef(allSuggestions);
  const showInfoRef = useRef(showInfo);
  const getCVDraftsRef = useRef(getCVDrafts);
  const removeTaskRef = useRef(removeTask);
  const setSuggestionsLoadingRef = useRef(setSuggestionsLoading);
  const completedTasksRef = useRef<Set<string>>(new Set());
  const errorTasksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    suggestionsLoadingRef.current = suggestionsLoading;
    allSuggestionsRef.current = allSuggestions;
    showInfoRef.current = showInfo;
    getCVDraftsRef.current = getCVDrafts;
    removeTaskRef.current = removeTask;
    setSuggestionsLoadingRef.current = setSuggestionsLoading;
  }, [suggestionsLoading, allSuggestions, showInfo, getCVDrafts, removeTask, setSuggestionsLoading]);

  useEffect(() => {
    const hasGeneratingTask = Array.from(activeTasks.values()).some(
      (task) =>
        task.type === 'ai_enhancement' && task.cvId === cvId && task.isGenerating,
    );

    if (hasGeneratingTask && !suggestionsLoadingRef.current) {
      setSuggestionsLoadingRef.current(true);
    }

    const tasksToRemove: string[] = [];
    for (const [taskId, task] of activeTasks) {
      if (
        task.type === 'ai_enhancement' &&
        task.cvId === cvId &&
        !task.isGenerating
      ) {
        if (task.generationError) {
          setSuggestionsLoadingRef.current(false);
          if (!errorTasksRef.current.has(taskId)) {
            showError('AI Task Failed', task.generationError);
            errorTasksRef.current.add(taskId);
          }
        } else {
          const enhancementData = (task as { data?: { enhancement_data?: unknown } })?.data?.enhancement_data;
          const suggestions = enhancementData || allSuggestionsRef.current;
          const sug = suggestions as {
            skills?: { technical?: unknown[]; soft?: unknown[] };
            professional_summary?: { suggested_text?: string };
          };
          const hasAnySuggestions =
            sug &&
            ((sug.skills?.technical?.length ?? 0) > 0 ||
              (sug.skills?.soft?.length ?? 0) > 0 ||
              (sug.professional_summary?.suggested_text?.trim?.()?.length ?? 0) > 0);

          if (!completedTasksRef.current.has(taskId)) {
            if (!hasAnySuggestions) {
              showInfoRef.current(
                'No suggestions available',
                'Please add more content to your CV (work experience, skills, professional summary) to get AI-powered enhancement suggestions.',
              );
            } else {
              showInfoRef.current('AI enhancement completed', 'Suggestions are ready to review');
            }

            if (hasAnySuggestions && isFaviconPageHidden()) {
              setFaviconBadge(1).catch((err) =>
                console.error('Failed to set favicon badge:', err),
              );
              setTitleNotification('AI suggestions ready');
            }

            completedTasksRef.current.add(taskId);
          }

          if (suggestionsLoadingRef.current) {
            setSuggestionsLoadingRef.current(false);
          }
          const draftId = (task as { data?: { enhancement_data?: { meta?: { draft_id?: string } } } })
            ?.data?.enhancement_data?.meta?.draft_id;
          if (cvId && draftId) {
            getCVDraftsRef.current(cvId);
          }
        }

        tasksToRemove.push(taskId);
      }
    }
    if (tasksToRemove.length > 0) {
      setTimeout(() => {
        tasksToRemove.forEach((id) => {
          removeTaskRef.current(id);
          completedTasksRef.current.delete(id);
        });
      }, 0);
    }
  }, [activeTasks, cvId, showError]);
}

export function useFaviconVisibilityCleanup(): void {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        clearFaviconBadge();
        clearTitleNotification();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
}
