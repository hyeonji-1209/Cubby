-- ============================================
-- Migration: Role Refactor
-- role = 역할 (instructor, student, guardian)
-- is_owner = 관리 권한 (boolean)
-- ============================================

-- 1. role을 사용하는 RLS 정책 삭제
DROP POLICY IF EXISTS "Instructors can create QR codes" ON attendance_qr_codes;
DROP POLICY IF EXISTS "Instructors can delete QR codes" ON attendance_qr_codes;

-- 2. is_owner 컬럼 추가
ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE;

-- 3. 기존 owner/admin을 is_owner=true로 설정
UPDATE group_members
SET is_owner = TRUE
WHERE role IN ('owner', 'admin');

-- 4. 기본값 제거
ALTER TABLE group_members
ALTER COLUMN role DROP DEFAULT;

-- 5. role 변환 (텍스트 컬럼으로 임시 변경)
ALTER TABLE group_members
ALTER COLUMN role TYPE TEXT;

-- 6. role 값 변환
UPDATE group_members SET role = 'instructor' WHERE role = 'owner';
UPDATE group_members SET role = 'instructor' WHERE role = 'admin';
UPDATE group_members SET role = 'student' WHERE role = 'member';

-- 7. 새 ENUM 타입 생성
CREATE TYPE member_role_new AS ENUM (
  'instructor',
  'student',
  'guardian'
);

-- 8. 새 ENUM 타입으로 변경
ALTER TABLE group_members
ALTER COLUMN role TYPE member_role_new USING role::member_role_new;

-- 9. 새 기본값 설정
ALTER TABLE group_members
ALTER COLUMN role SET DEFAULT 'student';

-- 10. 기존 ENUM 삭제 및 이름 변경
DROP TYPE IF EXISTS member_role;
ALTER TYPE member_role_new RENAME TO member_role;

-- 11. RLS 정책 재생성
CREATE POLICY "Instructors can create QR codes"
  ON attendance_qr_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = attendance_qr_codes.group_id
      AND group_members.user_id = auth.uid()
      AND (group_members.is_owner = TRUE OR group_members.role = 'instructor')
      AND group_members.status = 'approved'
    )
  );

CREATE POLICY "Instructors can delete QR codes"
  ON attendance_qr_codes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = attendance_qr_codes.group_id
      AND group_members.user_id = auth.uid()
      AND (group_members.is_owner = TRUE OR group_members.role = 'instructor')
      AND group_members.status = 'approved'
    )
  );

-- 12. is_group_owner 함수 수정
CREATE OR REPLACE FUNCTION is_group_owner(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = group_uuid
    AND user_id = user_uuid
    AND is_owner = TRUE
    AND status = 'approved'
  ) OR EXISTS (
    SELECT 1 FROM groups
    WHERE id = group_uuid
    AND owner_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_group_members_is_owner
ON group_members(group_id, is_owner) WHERE is_owner = TRUE;
