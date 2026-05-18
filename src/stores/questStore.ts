import { create } from 'zustand';
import { apolloClient } from '../lib/apolloClient';
import { gql } from '@apollo/client';

const FETCH_QUEST_DATA = gql`
  query FetchQuestData {
    myProgress {
      id
      academicClassId
      currentStep
      isLocked
      className
      subject
      totalSteps
    }
    me {
      pointsBalance
    }
  }
`;

const ADVANCE_STEP_MUTATION = gql`
  mutation AdvanceStep($academicClassId: ID!) {
    advanceStep(academicClassId: $academicClassId) {
      progress {
        id
        currentStep
        isLocked
      }
      pointsAwarded
      pointsBalance
      questComplete
    }
  }
`;

export interface QuestProgress {
  id: string;
  academicClassId: string;
  currentStep: number;
  isLocked: boolean;
  className: string;
  subject: string;
  totalSteps: number;
}

interface QuestState {
  progresses: QuestProgress[];
  activeClassId: string | null;
  pointsBalance: number;
  isLoading: boolean;
  error: string | null;
  lastPointsAwarded: number;
  isQuestComplete: boolean;
  devFreshStart: boolean;
  setDevFreshStart: (v: boolean) => void;
  setActiveClass: (id: string) => void;
  clearPointsPopup: () => void;
  fetchProgress: () => Promise<void>;
  advance: (academicClassId: string) => Promise<void>;
}

export const useQuestStore = create<QuestState>((set, get) => ({
  progresses: [],
  activeClassId: null,
  pointsBalance: 0,
  isLoading: false,
  error: null,
  lastPointsAwarded: 0,
  isQuestComplete: false,
  devFreshStart: false,

  setDevFreshStart: (v) => set((state) => ({
    devFreshStart: v,
    isQuestComplete: v ? false : state.isQuestComplete,
    progresses: v ? state.progresses.map(p => ({ ...p, currentStep: 0 })) : state.progresses,
  })),

  setActiveClass: (id) => set({ activeClassId: id }),

  clearPointsPopup: () => set({ lastPointsAwarded: 0 }),

  async fetchProgress() {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apolloClient.query({
        query: FETCH_QUEST_DATA,
        fetchPolicy: 'network-only',
      });
      const fetched: QuestProgress[] = data.myProgress;
      const fresh = get().devFreshStart;
      const progresses = fresh ? fetched.map(p => ({ ...p, currentStep: 0 })) : fetched;
      set({
        progresses,
        isLoading: false,
        devFreshStart: false,
        pointsBalance: data.me?.pointsBalance ?? 0,
        // Only set activeClassId if not already chosen
        activeClassId: get().activeClassId ?? (progresses[0]?.academicClassId ?? null),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load quest data';
      set({ isLoading: false, error: message });
    }
  },

  async advance(academicClassId: string) {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apolloClient.mutate({
        mutation: ADVANCE_STEP_MUTATION,
        variables: { academicClassId },
      });
      const result = data.advanceStep;
      set((state) => ({
        isLoading: false,
        pointsBalance: result.pointsBalance,
        lastPointsAwarded: result.pointsAwarded,
        isQuestComplete: result.questComplete,
        progresses: state.progresses.map((p) =>
          p.academicClassId === academicClassId
            ? { ...p, currentStep: result.progress.currentStep, isLocked: result.progress.isLocked }
            : p,
        ),
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to advance step';
      set({ isLoading: false, error: message });
    }
  },
}));
