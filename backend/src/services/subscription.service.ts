import { AppDataSource } from '../config/database';
import { Subscription, SubscriptionPlan, PLAN_LIMITS, SubscriptionStatus } from '../models/Subscription';
import { Group } from '../models/Group';
import { SubGroup, SubGroupStatus } from '../models/SubGroup';
import { GroupMember, MemberStatus } from '../models/GroupMember';

export class SubscriptionService {
  private subscriptionRepository = AppDataSource.getRepository(Subscription);
  private groupRepository = AppDataSource.getRepository(Group);
  private subGroupRepository = AppDataSource.getRepository(SubGroup);
  private memberRepository = AppDataSource.getRepository(GroupMember);

  // 사용자의 현재 구독 플랜 조회
  async getUserPlan(userId: string): Promise<SubscriptionPlan> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    return subscription?.plan || SubscriptionPlan.BASIC;
  }

  // 플랜 제한 조회
  getPlanLimits(plan: SubscriptionPlan) {
    return PLAN_LIMITS[plan];
  }

  // 모임 생성 가능 여부 체크
  async canCreateGroup(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const plan = await this.getUserPlan(userId);
    const limits = this.getPlanLimits(plan);

    if (limits.maxGroups === -1) {
      return { allowed: true };
    }

    const groupCount = await this.groupRepository.count({
      where: { ownerId: userId },
    });

    if (groupCount >= limits.maxGroups) {
      return {
        allowed: false,
        reason: `${plan} 플랜은 최대 ${limits.maxGroups}개의 모임만 생성할 수 있습니다. 업그레이드가 필요합니다.`,
      };
    }

    return { allowed: true };
  }

  // 소모임 생성 가능 여부 체크
  async canCreateSubGroup(
    userId: string,
    groupId: string,
    parentSubGroupId?: string
  ): Promise<{ allowed: boolean; reason?: string; depth?: number }> {
    // 그룹 소유자의 플랜 확인
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      return { allowed: false, reason: '모임을 찾을 수 없습니다.' };
    }

    const plan = await this.getUserPlan(group.ownerId);
    const limits = this.getPlanLimits(plan);

    // 소모임 개수 체크
    if (limits.maxSubGroupsPerGroup !== -1) {
      const subGroupCount = await this.subGroupRepository.count({
        where: { parentGroupId: groupId, status: SubGroupStatus.ACTIVE },
      });

      if (subGroupCount >= limits.maxSubGroupsPerGroup) {
        return {
          allowed: false,
          reason: `${plan} 플랜은 모임당 최대 ${limits.maxSubGroupsPerGroup}개의 소모임만 생성할 수 있습니다.`,
        };
      }
    }

    // 중첩 깊이 체크
    let depth = 0;
    if (parentSubGroupId) {
      const parentSubGroup = await this.subGroupRepository.findOne({
        where: { id: parentSubGroupId },
      });
      if (parentSubGroup) {
        depth = parentSubGroup.depth + 1;
      }
    }

    if (limits.maxSubGroupDepth !== -1 && depth >= limits.maxSubGroupDepth) {
      return {
        allowed: false,
        reason: `${plan} 플랜은 최대 ${limits.maxSubGroupDepth}단계 깊이까지만 소모임을 생성할 수 있습니다.`,
        depth,
      };
    }

    return { allowed: true, depth };
  }

  // 멤버 추가 가능 여부 체크
  async canAddMember(groupId: string): Promise<{ allowed: boolean; reason?: string }> {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      return { allowed: false, reason: '모임을 찾을 수 없습니다.' };
    }

    const plan = await this.getUserPlan(group.ownerId);
    const limits = this.getPlanLimits(plan);

    if (limits.maxMembersPerGroup === -1) {
      return { allowed: true };
    }

    const memberCount = await this.memberRepository.count({
      where: { groupId, status: MemberStatus.ACTIVE },
    });

    if (memberCount >= limits.maxMembersPerGroup) {
      return {
        allowed: false,
        reason: `${plan} 플랜은 모임당 최대 ${limits.maxMembersPerGroup}명의 멤버만 가입할 수 있습니다.`,
      };
    }

    return { allowed: true };
  }
}

export const subscriptionService = new SubscriptionService();
