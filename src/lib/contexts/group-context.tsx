"use client";

import { createContext, useContext } from "react";
import { Group, GroupMember } from "@/types";

interface GroupContextType {
  group: Group;
  membership: GroupMember;
  isOwner: boolean;
  isInstructor: boolean;
  isStudent: boolean;
  isGuardian: boolean;
  canManage: boolean; // isOwner || isInstructor
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

interface GroupProviderProps {
  children: React.ReactNode;
  group: Group;
  membership: GroupMember;
}

export function GroupProvider({ children, group, membership }: GroupProviderProps) {
  const isOwner = membership.is_owner || false;
  const isInstructor = membership.role === "instructor";
  const isStudent = membership.role === "student";
  const isGuardian = membership.role === "guardian";
  const canManage = isOwner || isInstructor;

  return (
    <GroupContext.Provider
      value={{
        group,
        membership,
        isOwner,
        isInstructor,
        isStudent,
        isGuardian,
        canManage,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error("useGroup must be used within a GroupProvider");
  }
  return context;
}
