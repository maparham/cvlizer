/**
 * CV Store Type Definitions
 *
 * This module defines the complete CV store type by combining
 * all slice types together.
 */

import type { CVCrudSlice } from "./cvCrudSlice";
import type { CVHistorySlice } from "./cvHistorySlice";
import type { CVPollingSlice } from "./cvPollingSlice";

// Complete CV store type combining all slices
export type CVStore = CVCrudSlice & CVHistorySlice & CVPollingSlice;
