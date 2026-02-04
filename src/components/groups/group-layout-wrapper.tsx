"use client";

import { GroupProvider } from "@/lib/contexts/group-context";
import { Group, GroupMember } from "@/types";

interface GroupLayoutWrapperProps {
  children: React.ReactNode;
  group: Group;
  membership: GroupMember;
}

export function GroupLayoutWrapper({ children, group, membership }: GroupLayoutWrapperProps) {
  return (
    <GroupProvider group={group} membership={membership}>
      {children}
    </GroupProvider>
  );
}
