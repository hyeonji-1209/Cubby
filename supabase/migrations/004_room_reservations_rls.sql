-- ============================================
-- Room Reservations RLS Policies
-- ============================================

-- 그룹 멤버는 예약 조회 가능
CREATE POLICY "Group members can view reservations"
  ON room_reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = room_reservations.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'approved'
    )
  );

-- 승인된 그룹 멤버는 예약 생성 가능
CREATE POLICY "Group members can create reservations"
  ON room_reservations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = room_reservations.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'approved'
    )
    AND reserved_by = auth.uid()
  );

-- 예약 생성자 또는 오너/강사는 예약 수정 가능
CREATE POLICY "Owners and reservers can update reservations"
  ON room_reservations FOR UPDATE
  USING (
    reserved_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = room_reservations.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'approved'
      AND (group_members.is_owner = true OR group_members.role = 'instructor')
    )
  );

-- 예약 생성자 또는 오너/강사는 예약 삭제 가능
CREATE POLICY "Owners and reservers can delete reservations"
  ON room_reservations FOR DELETE
  USING (
    reserved_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = room_reservations.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'approved'
      AND (group_members.is_owner = true OR group_members.role = 'instructor')
    )
  );
