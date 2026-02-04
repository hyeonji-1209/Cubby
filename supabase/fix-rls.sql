-- ============================================
-- RLS 정책 수정 (무한 루프 해결)
-- ============================================

-- 기존 profiles 정책 삭제
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles of group members" ON profiles;

-- 새 profiles 정책 (단순화)
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

-- 기존 group_members 정책 삭제 및 재생성
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;

CREATE POLICY "Users can view members of their groups"
  ON group_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM group_members my_membership
      WHERE my_membership.group_id = group_members.group_id
      AND my_membership.user_id = auth.uid()
      AND my_membership.status = 'approved'
    )
  );
