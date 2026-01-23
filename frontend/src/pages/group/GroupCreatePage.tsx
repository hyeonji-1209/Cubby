import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/groupStore';
import './GroupPages.scss';

type GroupType = 'education' | 'religious' | 'community' | 'company';

const groupTypes: { value: GroupType; label: string; desc: string }[] = [
  { value: 'education', label: '학원/교육', desc: '수업, 과제, 출석 관리' },
  { value: 'religious', label: '교회/종교', desc: '예배, 소그룹, 봉사 관리' },
  { value: 'community', label: '동호회/커뮤니티', desc: '모임, 회비, 게시판' },
  { value: 'company', label: '회사/팀', desc: '프로젝트, 업무, 회의 관리' },
];

const GroupCreatePage = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GroupType | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  const createGroup = useGroupStore((state) => state.createGroup);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!type) {
      alert('모임 타입을 선택해주세요');
      return;
    }

    setIsLoading(true);

    try {
      const group = await createGroup({ name, description, type });
      alert('모임이 생성되었습니다!');
      navigate(`/groups/${group.id}`);
    } catch (error) {
      console.error('모임 생성 실패:', error);
      alert('모임 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="group-create">
      <h1 className="group-create__title">새 모임 만들기</h1>

      <form className="group-create__form" onSubmit={handleSubmit}>
        <div className="group-create__section">
          <h2 className="group-create__section-title">모임 타입</h2>
          <div className="group-create__types">
            {groupTypes.map((gt) => (
              <label
                key={gt.value}
                className={`group-create__type ${type === gt.value ? 'group-create__type--selected' : ''}`}
              >
                <input
                  type="radio"
                  name="type"
                  value={gt.value}
                  checked={type === gt.value}
                  onChange={(e) => setType(e.target.value as GroupType)}
                />
                <span className="group-create__type-label">{gt.label}</span>
                <span className="group-create__type-desc">{gt.desc}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="group-create__section">
          <h2 className="group-create__section-title">기본 정보</h2>

          <div className="group-create__field">
            <label className="group-create__label">모임 이름</label>
            <input
              type="text"
              className="group-create__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="모임 이름을 입력하세요"
              required
            />
          </div>

          <div className="group-create__field">
            <label className="group-create__label">설명 (선택)</label>
            <textarea
              className="group-create__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="모임에 대한 간단한 설명을 입력하세요"
              rows={3}
            />
          </div>
        </div>

        <div className="group-create__actions">
          <button
            type="button"
            className="group-create__cancel"
            onClick={() => navigate(-1)}
          >
            취소
          </button>
          <button
            type="submit"
            className="group-create__submit"
            disabled={isLoading}
          >
            {isLoading ? '생성 중...' : '모임 만들기'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GroupCreatePage;
