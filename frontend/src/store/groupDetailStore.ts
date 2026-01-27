import { create } from 'zustand';
import {
  createAnnouncementSlice,
  createScheduleSlice,
  createLocationSlice,
  createPracticeRoomSlice,
  type AnnouncementSlice,
  type ScheduleSlice,
  type LocationSlice,
  type PracticeRoomSlice,
} from './slices';

type GroupDetailState = AnnouncementSlice & ScheduleSlice & LocationSlice & PracticeRoomSlice & {
  reset: () => void;
};

export const useGroupDetailStore = create<GroupDetailState>()((...args) => ({
  ...createAnnouncementSlice(...args),
  ...createScheduleSlice(...args),
  ...createLocationSlice(...args),
  ...createPracticeRoomSlice(...args),

  reset: () => {
    const [, get] = args;
    get().resetAnnouncementState();
    get().resetScheduleState();
    get().resetLocationState();
    get().resetPracticeRoomState();
  },
}));
