-- ============================================
-- Migration: Lessons RLS Policies
-- 강사/오너가 수업을 생성/수정/삭제할 수 있도록 정책 추가
-- ============================================

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Instructors can create lessons" ON lessons;
DROP POLICY IF EXISTS "Instructors can update lessons" ON lessons;
DROP POLICY IF EXISTS "Instructors can delete lessons" ON lessons;

-- 강사/오너가 수업 생성 가능
CREATE POLICY "Instructors can create lessons"
  ON lessons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = lessons.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'approved'
      AND (group_members.role = 'instructor' OR group_members.is_owner = true)
    )
  );

-- 강사/오너가 수업 수정 가능
CREATE POLICY "Instructors can update lessons"
  ON lessons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = lessons.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'approved'
      AND (group_members.role = 'instructor' OR group_members.is_owner = true)
    )
  );

-- 강사/오너가 수업 삭제 가능
CREATE POLICY "Instructors can delete lessons"
  ON lessons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = lessons.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'approved'
      AND (group_members.role = 'instructor' OR group_members.is_owner = true)
    )
  );

-- attendance_qr_codes 테이블 RLS 정책 추가
DROP POLICY IF EXISTS "Instructors can create QR codes" ON attendance_qr_codes;
DROP POLICY IF EXISTS "Instructors can view QR codes" ON attendance_qr_codes;
DROP POLICY IF EXISTS "Instructors can delete QR codes" ON attendance_qr_codes;

-- QR 코드 생성 정책 (강사가 자신이 생성한 수업의 QR 코드 생성)
CREATE POLICY "Instructors can create QR codes"
  ON attendance_qr_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN group_members gm ON gm.group_id = l.group_id
      WHERE l.id = attendance_qr_codes.lesson_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'approved'
      AND (gm.role = 'instructor' OR gm.is_owner = true)
    )
  );

-- QR 코드 조회 정책 (그룹 멤버 모두 조회 가능)
CREATE POLICY "Group members can view QR codes"
  ON attendance_qr_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN group_members gm ON gm.group_id = l.group_id
      WHERE l.id = attendance_qr_codes.lesson_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'approved'
    )
  );

-- QR 코드 삭제 정책 (강사만 삭제 가능)
CREATE POLICY "Instructors can delete QR codes"
  ON attendance_qr_codes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN group_members gm ON gm.group_id = l.group_id
      WHERE l.id = attendance_qr_codes.lesson_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'approved'
      AND (gm.role = 'instructor' OR gm.is_owner = true)
    )
  );
