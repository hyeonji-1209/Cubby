-- ============================================
-- 전화번호 고유성 제약조건 및 트리거 업데이트
-- ============================================

-- 기존 중복 전화번호가 있을 경우를 대비해 NULL은 허용
-- (아직 전화번호를 입력하지 않은 사용자)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON profiles (phone)
  WHERE phone IS NOT NULL;

-- 회원가입 시 전화번호도 저장하도록 트리거 함수 업데이트
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
