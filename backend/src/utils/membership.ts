import { Repository } from 'typeorm';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { AppError } from '../middlewares/error.middleware';

/**
 * 활성 멤버십 확인
 * @throws AppError 멤버가 아닌 경우
 */
export const requireActiveMember = async (
  memberRepository: Repository<GroupMember>,
  groupId: string,
  userId: string
): Promise<GroupMember> => {
  const member = await memberRepository.findOne({
    where: { groupId, userId, status: MemberStatus.ACTIVE },
  });

  if (!member) {
    throw new AppError('Not a member of this group', 403);
  }

  return member;
};

/**
 * 관리자 권한 확인 (owner 또는 admin)
 * @throws AppError 관리자가 아닌 경우
 */
export const requireAdmin = async (
  memberRepository: Repository<GroupMember>,
  groupId: string,
  userId: string,
  action: string = 'perform this action'
): Promise<GroupMember> => {
  const member = await memberRepository.findOne({
    where: { groupId, userId },
  });

  if (!member || ![MemberRole.OWNER, MemberRole.ADMIN].includes(member.role)) {
    throw new AppError(`Only admins can ${action}`, 403);
  }

  return member;
};

/**
 * 멤버가 관리자인지 확인
 */
export const isAdmin = (member: GroupMember): boolean => {
  return member.role === MemberRole.OWNER || member.role === MemberRole.ADMIN;
};

/**
 * 멤버가 리더 이상인지 확인 (owner, admin, leader)
 */
export const isLeaderOrAbove = (member: GroupMember): boolean => {
  return [MemberRole.OWNER, MemberRole.ADMIN, MemberRole.LEADER].includes(member.role);
};

/**
 * 작성자 또는 관리자인지 확인
 * @returns true if user is author or admin
 */
export const canEditOrDelete = async (
  memberRepository: Repository<GroupMember>,
  groupId: string,
  userId: string,
  authorId: string
): Promise<boolean> => {
  if (userId === authorId) return true;

  const member = await memberRepository.findOne({
    where: { groupId, userId, status: MemberStatus.ACTIVE },
  });

  return member ? isAdmin(member) : false;
};
