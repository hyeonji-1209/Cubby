-- ============================================
-- Cubby Database Reset Script
-- 주의: 모든 데이터가 삭제됩니다!
-- ============================================

-- 트리거 삭제
DROP TRIGGER IF EXISTS on_announcement_comment_delete ON announcement_comments;
DROP TRIGGER IF EXISTS on_announcement_comment_insert ON announcement_comments;
DROP TRIGGER IF EXISTS on_announcement_like_delete ON announcement_likes;
DROP TRIGGER IF EXISTS on_announcement_like_insert ON announcement_likes;
DROP TRIGGER IF EXISTS update_announcement_comments_updated_at ON announcement_comments;
DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
DROP TRIGGER IF EXISTS update_sub_groups_updated_at ON sub_groups;
DROP TRIGGER IF EXISTS update_group_members_updated_at ON group_members;
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 함수 삭제
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_announcement_comment_count_on_delete();
DROP FUNCTION IF EXISTS update_announcement_comment_count_on_insert();
DROP FUNCTION IF EXISTS update_announcement_like_count_on_delete();
DROP FUNCTION IF EXISTS update_announcement_like_count_on_insert();
DROP FUNCTION IF EXISTS increment_view_count(UUID);
DROP FUNCTION IF EXISTS update_updated_at();

-- 테이블 삭제 (의존성 순서대로)
DROP TABLE IF EXISTS attendance_qr_codes CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS daily_messages CASCADE;
DROP TABLE IF EXISTS menstrual_cycles CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS announcement_comments CASCADE;
DROP TABLE IF EXISTS announcement_likes CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS room_reservations CASCADE;
DROP TABLE IF EXISTS lesson_change_requests CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS sub_groups CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ENUM 타입 삭제
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS event_visibility CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS lesson_status CASCADE;
DROP TYPE IF EXISTS lesson_type CASCADE;
DROP TYPE IF EXISTS attendance_status CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS member_role CASCADE;
DROP TYPE IF EXISTS group_type CASCADE;

-- auth.users 데이터 삭제 (Supabase 인증 사용자)
-- 주의: 이 부분은 Supabase Dashboard에서 직접 실행하거나
-- service_role 키로 실행해야 합니다
DELETE FROM auth.users;

-- ============================================
-- 초기화 완료 후 schema.sql 실행하세요
-- ============================================
