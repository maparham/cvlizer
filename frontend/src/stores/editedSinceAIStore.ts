/**
 * Tracks, per CV and per field, whether the user has edited that field since the last
 * AI run. Used to show an overwrite warning when applying suggestions.
 *
 * Flags are cleared when: the user applies a suggestion (clear that field); the user
 * switches to another CV (clear all for the left CV); new AI suggestions or quality
 * analysis is loaded (clear the affected fields). Do not clear again in those paths.
 *
 * Field keys: professional_summary, personal_info.description, skills, and for
 * list sections the pattern is <section>:<itemId> (e.g. work_experience:abc, education:def,
 * certifications:ghi, projects:jkl, awards:mno, volunteer_experience:pqr).
 */

import { create } from "zustand";

export type EditedSinceAIFieldKey =
  | "professional_summary"
  | "skills"
  | `work_experience:${string}`
  | `education:${string}`
  | "personal_info.description"
  | `certifications:${string}`
  | `projects:${string}`
  | `awards:${string}`
  | `volunteer_experience:${string}`;

interface EditedSinceAIState {
  /** cvId -> fieldKey -> true if user edited since last AI generation */
  byCV: Record<string, Record<string, boolean>>;
}

interface EditedSinceAIStore extends EditedSinceAIState {
  setEdited: (cvId: string, fieldKey: string) => void;
  clearEdited: (cvId: string, fieldKey: string) => void;
  clearEditedForCV: (cvId: string) => void;
  isEdited: (cvId: string, fieldKey: string) => boolean;
}

export const useEditedSinceAIStore = create<EditedSinceAIStore>((set, get) => ({
  byCV: {},

  setEdited: (cvId: string, fieldKey: string) => {
    if (!cvId || !fieldKey) return;

    set((state) => ({
      byCV: {
        ...state.byCV,
        [cvId]: {
          ...(state.byCV[cvId] ?? {}),
          [fieldKey]: true,
        },
      },
    }));
  },

  clearEdited: (cvId: string, fieldKey: string) => {
    if (!cvId || !fieldKey) return;
    set((state) => {
      const cvMap = state.byCV[cvId];
      if (!cvMap || !(fieldKey in cvMap)) return state;
      const next = { ...cvMap };
      delete next[fieldKey];
      return {
        byCV: {
          ...state.byCV,
          [cvId]: next,
        },
      };
    });
  },

  clearEditedForCV: (cvId: string) => {
    if (!cvId) return;
    set((state) => {
      if (!(cvId in state.byCV)) return state;
      const next = { ...state.byCV };
      delete next[cvId];
      return { byCV: next };
    });
  },

  isEdited: (cvId: string, fieldKey: string): boolean => {
    if (!cvId || !fieldKey) return false;
    return get().byCV[cvId]?.[fieldKey] === true;
  },
}));
