import { getPositionLabel } from '@/constants/labels';
import type { GroupCreateFormState } from '../hooks/useGroupCreateForm';
import type { ListManager } from '@/hooks/useListManager';
import type { GroupType } from '@/types';

interface PositionSettingsProps {
  type: GroupType;
  formState: GroupCreateFormState;
  updateField: <K extends keyof GroupCreateFormState>(field: K, value: GroupCreateFormState[K]) => void;
  positionList: ListManager<string>;
  rankList: ListManager<string>;
}

const getPositionPlaceholder = (type: GroupType): string => {
  switch (type) {
    case 'religious':
      return '직분 입력 후 Enter (예: 목사, 전도사, 장로)';
    case 'company':
      return '직책 입력 후 Enter (예: 팀장, 부서장)';
    case 'education':
      return '직책 입력 후 Enter (예: 원장, 강사, 매니저)';
    default:
      return '직책 입력 후 Enter (예: 회장, 총무, 팀장)';
  }
};

const PositionSettings: React.FC<PositionSettingsProps> = ({
  type,
  formState,
  updateField,
  positionList,
  rankList,
}) => {
  const { myTitle, myRank, companyPositionMode } = formState;
  const positionLabel = getPositionLabel(type);

  return (
    <>
      {/* 회사 타입: 직위+직책 vs 직책만 선택 */}
      {type === 'company' && (
        <div className="group-create__company-mode">
          <label className="group-create__label">직위/직책 설정 방식</label>
          <div className="group-create__company-mode-toggle">
            <button
              type="button"
              className={`group-create__company-mode-btn ${companyPositionMode === 'title_only' ? 'group-create__company-mode-btn--active' : ''}`}
              onClick={() => updateField('companyPositionMode', 'title_only')}
            >
              직책만
            </button>
            <button
              type="button"
              className={`group-create__company-mode-btn ${companyPositionMode === 'both' ? 'group-create__company-mode-btn--active' : ''}`}
              onClick={() => updateField('companyPositionMode', 'both')}
            >
              직위 + 직책
            </button>
          </div>
          <span className="group-create__company-mode-hint">
            {companyPositionMode === 'title_only'
              ? '직책만 사용합니다 (예: 팀장, 부서장)'
              : '직위와 직책을 함께 사용합니다 (예: 과장/팀장)'}
          </span>
        </div>
      )}

      {/* 회사 직위+직책 모드일 때 직위 섹션 */}
      {type === 'company' && companyPositionMode === 'both' && (
        <div className="group-create__positions">
          <label className="group-create__label">직위 만들기</label>
          <input
            type="text"
            className="group-create__input"
            placeholder="직위 입력 후 Enter (예: 사원, 대리, 과장)"
            maxLength={30}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                const value = e.currentTarget.value.trim();
                if (value && rankList.canAdd) {
                  const emptyIndex = rankList.items.findIndex((item: string) => !item.trim());
                  if (emptyIndex !== -1) {
                    rankList.update(emptyIndex, value);
                  } else {
                    rankList.add(value);
                  }
                  e.currentTarget.value = '';
                }
              }
            }}
          />
          {rankList.items.some((r: string) => r.trim()) && (
            <div className="group-create__positions-tags">
              {rankList.items.map((rank: string, index: number) => (
                rank.trim() && (
                  <span key={index} className="group-create__positions-tag">
                    {rank}
                    <button
                      type="button"
                      className="group-create__positions-tag-remove"
                      onClick={() => rankList.remove(index)}
                    >
                      ×
                    </button>
                  </span>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* 멤버 설정 */}
      <div className="group-create__member-settings">
        <div className="group-create__member-settings-header">
          <span className="group-create__member-settings-header-icon">👥</span>
          <span className="group-create__member-settings-header-text">멤버 설정</span>
        </div>

        {/* 직책/직분 만들기 */}
        <div className="group-create__member-settings-card">
          <div className="group-create__member-settings-card-question">{positionLabel} 만들기</div>
          <input
            type="text"
            className="group-create__input"
            placeholder={getPositionPlaceholder(type)}
            maxLength={30}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                const value = e.currentTarget.value.trim();
                if (value && positionList.canAdd) {
                  const emptyIndex = positionList.items.findIndex((item: string) => !item.trim());
                  if (emptyIndex !== -1) {
                    positionList.update(emptyIndex, value);
                  } else {
                    positionList.add(value);
                  }
                  e.currentTarget.value = '';
                }
              }
            }}
          />
          {positionList.items.some((p: string) => p.trim()) && (
            <div className="group-create__positions-tags">
              {positionList.items.map((position: string, index: number) => (
                position.trim() && (
                  <span key={index} className="group-create__positions-tag">
                    {position}
                    <button
                      type="button"
                      className="group-create__positions-tag-remove"
                      onClick={() => positionList.remove(index)}
                    >
                      ×
                    </button>
                  </span>
                )
              ))}
            </div>
          )}
        </div>

        {/* 회사 직위+직책 모드일 때 내 직위 설정 */}
        {type === 'company' && companyPositionMode === 'both' && (
          <div className="group-create__member-settings-card">
            <div className="group-create__member-settings-card-question">내 직위</div>
            <input
              type="text"
              className="group-create__input"
              value={myRank}
              onChange={(e) => updateField('myRank', e.target.value)}
              placeholder="본인의 직위를 입력하세요 (예: 과장)"
              maxLength={30}
            />
          </div>
        )}

        {/* 본인 직책/직분 설정 */}
        <div className="group-create__member-settings-card">
          <div className="group-create__member-settings-card-question">내 {positionLabel}</div>
          <input
            type="text"
            className="group-create__input"
            value={myTitle}
            onChange={(e) => updateField('myTitle', e.target.value)}
            placeholder={
              type === 'education'
                ? '본인의 직책 (예: 원장, 강사)'
                : `본인의 ${positionLabel}을 입력하세요`
            }
            maxLength={30}
          />
          <div className="group-create__member-settings-card-note">
            <span className="group-create__role-badge">Owner</span>
            <span>모임 생성자는 자동으로 Owner가 됩니다</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default PositionSettings;
