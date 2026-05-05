// Defense Flow State Management - src/store/defenseFlowStore.ts
import { create } from 'zustand';
import type {
  ResearchGroup,
  Submission,
  Defense
} from '@/types/firestore';
import { documents, firestoreOps, queries } from '@/lib/firestore/collections';

interface DefenseFlowState {
  currentGroup: ResearchGroup | null;
  currentStage: 'title' | 'proposal' | 'final';
  submissions: Submission[];
  defenses: Defense[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setCurrentGroup: (group: ResearchGroup | null) => void;
  setCurrentStage: (stage: 'title' | 'proposal' | 'final') => void;
  fetchGroup: (groupId: string) => Promise<void>;
  fetchSubmissions: (groupId: string) => Promise<void>;
  fetchDefenses: (groupId: string) => Promise<void>;
  updateStage: (groupId: string, stage: 'title' | 'proposal' | 'final') => Promise<void>;
  clearError: () => void;
}

export const useDefenseFlowStore = create<DefenseFlowState>((set, get) => ({
  currentGroup: null,
  currentStage: 'title',
  submissions: [],
  defenses: [],
  loading: false,
  error: null,

  setCurrentGroup: (group) => set({ currentGroup: group }),
  
  setCurrentStage: (stage) => set({ currentStage: stage }),
  
  fetchGroup: async (groupId) => {
    set({ loading: true, error: null });
    try {
      const groupRef = documents.group(groupId);
      const groupData = await firestoreOps.get(groupRef);
      if (groupData) {
        set({ 
          currentGroup: groupData as ResearchGroup,
          currentStage: (groupData as ResearchGroup).stage,
          loading: false 
        });
      } else {
        set({ error: 'Group not found', loading: false });
      }
    } catch (error) {
      set({ error: 'Failed to fetch group', loading: false });
    }
  },
  
  fetchSubmissions: async (groupId) => {
    try {
      // This would use real-time listeners in production
      queries.submissionsByGroup(groupId);
      set({ submissions: [], loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch submissions', loading: false });
    }
  },
  
  fetchDefenses: async (groupId) => {
    try {
      queries.defensesByGroup(groupId);
      set({ defenses: [], loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch defenses', loading: false });
    }
  },
  
  updateStage: async (groupId: string, stage: 'title' | 'proposal' | 'final') => {
    set({ loading: true, error: null });
    try {
      const groupRef = documents.group(groupId);
      await firestoreOps.update(groupRef, { stage });
      
      // Update local state
      set((state) => ({
        currentGroup: state.currentGroup 
          ? { ...state.currentGroup, stage } 
          : null,
        currentStage: stage,
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to update stage', loading: false });
    }
  },
  
  clearError: () => set({ error: null })
}));
