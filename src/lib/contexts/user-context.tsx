"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Group {
  id: string;
  name: string;
  icon: string | null;
  type: string;
  status: "approved" | "pending";
}

interface Profile {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
}

interface UserContextType {
  user: User | null;
  profile: Profile | null;
  groups: Group[];
  unreadNotificationCount: number;
  isLoading: boolean;
  refreshGroups: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setIsLoading(false);
      return;
    }

    setUser(user);

    // 병렬로 데이터 조회
    const [profileResult, membershipsResult, notificationResult] = await Promise.all([
      // 프로필
      supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .eq("id", user.id)
        .single(),

      // 그룹 멤버십 (승인됨 + 대기중)
      supabase
        .from("group_members")
        .select(`status, group:groups(id, name, icon, type)`)
        .eq("user_id", user.id)
        .in("status", ["approved", "pending"]),

      // 읽지 않은 알림 수
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
    ]);

    if (profileResult.data) {
      setProfile(profileResult.data);
    }

    if (membershipsResult.data) {
      const groupList = membershipsResult.data
        .map((m) => {
          const rawGroup = m.group;
          // group:groups(*) 조인 결과가 배열인지 객체인지 확인
          const group = (Array.isArray(rawGroup) ? rawGroup[0] : rawGroup) as { id: string; name: string; icon: string | null; type: string } | null;
          if (!group) return null;
          return {
            ...group,
            status: m.status as "approved" | "pending",
          };
        })
        .filter(Boolean) as Group[];
      // 승인된 그룹 먼저, 대기중 그룹 나중에
      groupList.sort((a, b) => {
        if (a.status === "approved" && b.status === "pending") return -1;
        if (a.status === "pending" && b.status === "approved") return 1;
        return 0;
      });
      setGroups(groupList);
    }

    setUnreadNotificationCount(notificationResult.count || 0);
    setIsLoading(false);
  }, []);

  const refreshGroups = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    const { data: memberships } = await supabase
      .from("group_members")
      .select(`status, group:groups(id, name, icon, type)`)
      .eq("user_id", user.id)
      .in("status", ["approved", "pending"]);

    if (memberships) {
      const groupList = memberships
        .map((m) => {
          const rawGroup = m.group;
          // group:groups(*) 조인 결과가 배열인지 객체인지 확인
          const group = (Array.isArray(rawGroup) ? rawGroup[0] : rawGroup) as { id: string; name: string; icon: string | null; type: string } | null;
          if (!group) return null;
          return {
            ...group,
            status: m.status as "approved" | "pending",
          };
        })
        .filter(Boolean) as Group[];
      // 승인된 그룹 먼저, 대기중 그룹 나중에
      groupList.sort((a, b) => {
        if (a.status === "approved" && b.status === "pending") return -1;
        if (a.status === "pending" && b.status === "approved") return 1;
        return 0;
      });
      setGroups(groupList);
    }
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setUnreadNotificationCount(count || 0);
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        groups,
        unreadNotificationCount,
        isLoading,
        refreshGroups,
        refreshNotifications,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
