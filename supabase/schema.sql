-- ============================================
-- Cubby Database Schema
-- Supabase (PostgreSQL)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM Types
-- ============================================

CREATE TYPE group_type AS ENUM (
  'education',
  'couple',
  'family',
  'religion',
  'hobby',
  'other'
);

CREATE TYPE member_role AS ENUM (
  'owner',
  'admin',
  'instructor',
  'guardian',
  'member'
);

CREATE TYPE approval_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE attendance_status AS ENUM (
  'present',
  'late',
  'early_leave',
  'absent',
  'excused'
);

CREATE TYPE lesson_type AS ENUM (
  'individual',
  'group'
);

CREATE TYPE lesson_status AS ENUM (
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'overdue'
);

CREATE TYPE event_type AS ENUM (
  'personal',
  'shared',
  'lesson',
  'reservation'
);

CREATE TYPE event_visibility AS ENUM (
  'private',
  'partner',
  'all'
);

CREATE TYPE notification_type AS ENUM (
  'lesson_reminder',
  'lesson_change_request',
  'lesson_change_approved',
  'lesson_completed',
  'room_reminder',
  'payment_reminder',
  'holiday_notice',
  'announcement',
  'member_joined',
  'menstrual_reminder',
  'daily_message'
);

-- ============================================
-- Users Table (extends Supabase auth.users)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  fcm_token TEXT, -- Firebase Cloud Messaging token
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Groups Table
-- ============================================

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type group_type NOT NULL,
  icon TEXT,
  settings JSONB DEFAULT '{}',
  invite_code TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_owner ON groups(owner_id);
CREATE INDEX idx_groups_invite_code ON groups(invite_code);

-- ============================================
-- Group Members Table
-- ============================================

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  nickname TEXT,
  position_id TEXT,
  status approval_status NOT NULL DEFAULT 'pending',

  -- Education type fields
  instructor_id UUID REFERENCES profiles(id),
  lesson_schedule JSONB DEFAULT '[]',
  payment_date INTEGER CHECK (payment_date >= 1 AND payment_date <= 31),

  -- Couple/Family type fields
  family_role TEXT,
  birthday DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_instructor ON group_members(instructor_id);

-- ============================================
-- Sub Groups Table (for group lessons)
-- ============================================

CREATE TABLE sub_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  lesson_schedule JSONB DEFAULT '[]',
  room_id TEXT,
  member_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sub_groups_group ON sub_groups(group_id);
CREATE INDEX idx_sub_groups_instructor ON sub_groups(instructor_id);

-- ============================================
-- Lessons Table
-- ============================================

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  subgroup_id UUID REFERENCES sub_groups(id) ON DELETE SET NULL,
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  student_id UUID REFERENCES profiles(id), -- for 1:1 lessons
  room_id TEXT,

  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,

  is_makeup BOOLEAN DEFAULT FALSE,
  original_lesson_id UUID REFERENCES lessons(id),

  status lesson_status NOT NULL DEFAULT 'scheduled',

  content TEXT,
  homework TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lessons_group ON lessons(group_id);
CREATE INDEX idx_lessons_instructor ON lessons(instructor_id);
CREATE INDEX idx_lessons_student ON lessons(student_id);
CREATE INDEX idx_lessons_scheduled ON lessons(scheduled_at);

-- ============================================
-- Attendance Table
-- ============================================

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id),
  status attendance_status NOT NULL DEFAULT 'present',
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lesson_id, member_id)
);

CREATE INDEX idx_attendance_lesson ON attendance(lesson_id);
CREATE INDEX idx_attendance_member ON attendance(member_id);

-- ============================================
-- Lesson Change Requests Table
-- ============================================

CREATE TABLE lesson_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  requested_date TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status approval_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_change_requests_lesson ON lesson_change_requests(lesson_id);
CREATE INDEX idx_change_requests_status ON lesson_change_requests(status);

-- ============================================
-- Room Reservations Table
-- ============================================

CREATE TABLE room_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  reserved_by UUID NOT NULL REFERENCES profiles(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status approval_status NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_room_reservations_group ON room_reservations(group_id);
CREATE INDEX idx_room_reservations_time ON room_reservations(start_at, end_at);

-- ============================================
-- Announcements Table
-- ============================================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  subgroup_id UUID REFERENCES sub_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_instructor_only BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_group ON announcements(group_id);
CREATE INDEX idx_announcements_pinned ON announcements(is_pinned);

-- ============================================
-- Announcement Likes Table
-- ============================================

CREATE TABLE announcement_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX idx_announcement_likes_announcement ON announcement_likes(announcement_id);
CREATE INDEX idx_announcement_likes_user ON announcement_likes(user_id);

-- ============================================
-- Announcement Comments Table
-- ============================================

CREATE TABLE announcement_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES announcement_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcement_comments_announcement ON announcement_comments(announcement_id);
CREATE INDEX idx_announcement_comments_parent ON announcement_comments(parent_id);

-- ============================================
-- Calendar Events Table
-- ============================================

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  color TEXT,
  event_type event_type NOT NULL DEFAULT 'personal',
  visibility event_visibility NOT NULL DEFAULT 'all',
  location_id TEXT,
  location TEXT,
  is_academy_holiday BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_group ON calendar_events(group_id);
CREATE INDEX idx_calendar_events_time ON calendar_events(start_at, end_at);

-- ============================================
-- Menstrual Cycles Table (Couple/Family)
-- ============================================

CREATE TABLE menstrual_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE,
  cycle_length INTEGER DEFAULT 28,
  period_length INTEGER DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menstrual_user ON menstrual_cycles(user_id);
CREATE INDEX idx_menstrual_group ON menstrual_cycles(group_id);

-- ============================================
-- Daily Messages Table (Couple)
-- ============================================

CREATE TABLE daily_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, sender_id, date)
);

CREATE INDEX idx_daily_messages_group ON daily_messages(group_id);
CREATE INDEX idx_daily_messages_date ON daily_messages(date);

-- ============================================
-- Notifications Table
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- Payments Table
-- ============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id),
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_group ON payments(group_id);
CREATE INDEX idx_payments_member ON payments(member_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================
-- Attendance QR Codes Table (수업당 하나, 수업 종료시 만료)
-- ============================================

CREATE TABLE attendance_qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lesson_id) -- 수업당 하나의 QR 코드만 존재
);

CREATE INDEX idx_attendance_qr_lesson ON attendance_qr_codes(lesson_id);
CREATE INDEX idx_attendance_qr_code ON attendance_qr_codes(code);
CREATE INDEX idx_attendance_qr_expires ON attendance_qr_codes(expires_at);

-- ============================================
-- Functions & Triggers
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_group_members_updated_at
  BEFORE UPDATE ON group_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sub_groups_updated_at
  BEFORE UPDATE ON sub_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_announcement_comments_updated_at
  BEFORE UPDATE ON announcement_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment view count function
CREATE OR REPLACE FUNCTION increment_view_count(announcement_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE announcements
  SET view_count = view_count + 1
  WHERE id = announcement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update like count on insert
CREATE OR REPLACE FUNCTION update_announcement_like_count_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE announcements
  SET like_count = like_count + 1
  WHERE id = NEW.announcement_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update like count on delete
CREATE OR REPLACE FUNCTION update_announcement_like_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE announcements
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = OLD.announcement_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_announcement_like_insert
  AFTER INSERT ON announcement_likes
  FOR EACH ROW EXECUTE FUNCTION update_announcement_like_count_on_insert();

CREATE TRIGGER on_announcement_like_delete
  AFTER DELETE ON announcement_likes
  FOR EACH ROW EXECUTE FUNCTION update_announcement_like_count_on_delete();

-- Update comment count on insert
CREATE OR REPLACE FUNCTION update_announcement_comment_count_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE announcements
  SET comment_count = comment_count + 1
  WHERE id = NEW.announcement_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update comment count on delete
CREATE OR REPLACE FUNCTION update_announcement_comment_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE announcements
  SET comment_count = GREATEST(0, comment_count - 1)
  WHERE id = OLD.announcement_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_announcement_comment_insert
  AFTER INSERT ON announcement_comments
  FOR EACH ROW EXECUTE FUNCTION update_announcement_comment_count_on_insert();

CREATE TRIGGER on_announcement_comment_delete
  AFTER DELETE ON announcement_comments
  FOR EACH ROW EXECUTE FUNCTION update_announcement_comment_count_on_delete();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 전화번호 고유성 (NULL 허용)
CREATE UNIQUE INDEX profiles_phone_unique
  ON profiles (phone)
  WHERE phone IS NOT NULL;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE menstrual_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Groups policies
CREATE POLICY "Users can view groups they are members of"
  ON groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
      AND group_members.status IN ('approved', 'pending')
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their groups"
  ON groups FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their groups"
  ON groups FOR DELETE
  USING (auth.uid() = owner_id);

-- Group members policies (SECURITY DEFINER 함수 사용하여 무한 재귀 방지)
CREATE POLICY "Users can view members of their groups"
  ON group_members FOR SELECT
  USING (
    -- 자신의 멤버십은 항상 볼 수 있음 (pending 포함)
    user_id = auth.uid()
    -- 승인된 멤버는 같은 그룹의 모든 멤버 볼 수 있음
    OR is_group_member(group_id, auth.uid())
    -- 오너는 모든 멤버 볼 수 있음
    OR is_group_owner(group_id, auth.uid())
  );

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership"
  ON group_members FOR UPDATE
  USING (
    auth.uid() = user_id
    OR is_group_owner(group_id, auth.uid())
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Lessons policies
CREATE POLICY "Users can view lessons in their groups"
  ON lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = lessons.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'approved'
    )
  );

-- Calendar events policies
CREATE POLICY "Users can manage their own events"
  ON calendar_events FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared events in their groups"
  ON calendar_events FOR SELECT
  USING (
    visibility != 'private'
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = calendar_events.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'approved'
    )
  );

-- Announcements policies
CREATE POLICY "Users can view announcements in their groups"
  ON announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = announcements.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'approved'
    )
  );

CREATE POLICY "Users can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their announcements"
  ON announcements FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their announcements"
  ON announcements FOR DELETE
  USING (auth.uid() = author_id);

-- Announcement likes policies
ALTER TABLE announcement_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view likes"
  ON announcement_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like announcements"
  ON announcement_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike announcements"
  ON announcement_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Announcement comments policies
ALTER TABLE announcement_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments"
  ON announcement_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON announcement_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their comments"
  ON announcement_comments FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their comments"
  ON announcement_comments FOR DELETE
  USING (auth.uid() = author_id);

-- Attendance QR codes policies
ALTER TABLE attendance_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view QR codes in their groups"
  ON attendance_qr_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = attendance_qr_codes.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'approved'
    )
  );

CREATE POLICY "Instructors can create QR codes"
  ON attendance_qr_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = attendance_qr_codes.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role IN ('owner', 'admin', 'instructor')
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
      AND group_members.role IN ('owner', 'admin', 'instructor')
      AND group_members.status = 'approved'
    )
  );

-- More policies can be added as needed...

-- ============================================
-- RLS Helper Functions (SECURITY DEFINER)
-- ============================================

-- 그룹 멤버 여부 확인 (무한 재귀 방지)
CREATE OR REPLACE FUNCTION is_group_member(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = group_uuid
    AND user_id = user_uuid
    AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 그룹 오너 여부 확인 (무한 재귀 방지)
CREATE OR REPLACE FUNCTION is_group_owner(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM groups
    WHERE id = group_uuid
    AND owner_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 초대 코드로 그룹 찾기 (RLS 우회)
CREATE OR REPLACE FUNCTION get_group_by_invite_code(code TEXT)
RETURNS TABLE (id UUID, name TEXT, type group_type, settings JSONB, owner_id UUID)
AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.name, g.type, g.settings, g.owner_id
  FROM groups g
  WHERE g.invite_code = code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
