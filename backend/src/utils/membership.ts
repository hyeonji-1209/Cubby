import { Repository } from 'typeorm';
import { GroupMember, MemberRole, MemberStatus } from '../models/GroupMember';
import { GroupPosition, PositionPermissions } from '../models/GroupPosition';
import { AppError } from '../middlewares/error.middleware';
import { AppDataSource } from '../config/database';

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
 * 멤버의 직책 권한 확인
 */
export const hasPositionPermission = async (
  member: GroupMember,
  permission: keyof PositionPermissions
): Promise<boolean> => {
  // owner는 모든 권한 보유
  if (member.role === MemberRole.OWNER) return true;

  // 직책이 없으면 권한 없음
  if (!member.positionId) return false;

  // 직책 조회
  const positionRepository = AppDataSource.getRepository(GroupPosition);
  const position = await positionRepository.findOne({
    where: { id: member.positionId, isActive: true },
  });

  if (!position || !position.permissions) return false;

  return position.permissions[permission] === true;
};

/**
 * 관리자 권한 확인 (owner 또는 관리 권한 직책)
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

  if (!member) {
    throw new AppError(`Only admins can ${action}`, 403);
  }

  // owner는 항상 허용
  if (member.role === MemberRole.OWNER) {
    return member;
  }

  // member는 관리 권한 직책이 있어야 함
  const hasPermission = await hasPositionPermission(member, 'canManageMembers') ||
                        await hasPositionPermission(member, 'canApproveRequests');

  if (!hasPermission) {
    throw new AppError(`Only admins can ${action}`, 403);
  }

  return member;
};

/**
 * 특정 권한 요구
 * @throws AppError 권한이 없는 경우
 */
export const requirePermission = async (
  memberRepository: Repository<GroupMember>,
  groupId: string,
  userId: string,
  permission: keyof PositionPermissions,
  action: string = 'perform this action'
): Promise<GroupMember> => {
  const member = await memberRepository.findOne({
    where: { groupId, userId, status: MemberStatus.ACTIVE },
  });

  if (!member) {
    throw new AppError('Not a member of this group', 403);
  }

  const hasPermission = await hasPositionPermission(member, permission);

  if (!hasPermission) {
    throw new AppError(`You don't have permission to ${action}`, 403);
  }

  return member;
};

/**
 * 멤버가 owner인지 확인
 */
export const isOwner = (member: GroupMember): boolean => {
  return member.role === MemberRole.OWNER;
};

/**
 * 멤버가 관리자인지 확인 (owner만 - 동기 함수)
 * Note: 직책 기반 확인은 isAdminAsync 사용
 */
export const isAdmin = (member: GroupMember): boolean => {
  return member.role === MemberRole.OWNER;
};

/**
 * 멤버가 관리자인지 비동기 확인 (owner이거나 관리 권한 직책)
 */
export const isAdminAsync = async (member: GroupMember): Promise<boolean> => {
  if (member.role === MemberRole.OWNER) return true;

  return await hasPositionPermission(member, 'canManageMembers') ||
         await hasPositionPermission(member, 'canApproveRequests');
};

/**
 * 멤버가 특정 직책(title)인지 확인
 */
export const hasTitle = (member: GroupMember, title: string): boolean => {
  return member.title === title;
};

/**
 * 멤버가 강사인지 확인
 */
export const isInstructor = (member: GroupMember): boolean => {
  return hasTitle(member, '강사');
};

/**
 * 멤버가 보호자인지 확인
 */
export const isGuardian = (member: GroupMember): boolean => {
  return hasTitle(member, '보호자');
};

/**
 * 멤버가 학생인지 확인 (보호자/강사/owner가 아니면 학생으로 간주)
 */
export const isStudent = (member: GroupMember): boolean => {
  return !isGuardian(member) && !isInstructor(member) && member.role !== MemberRole.OWNER;
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

  if (!member) return false;

  return await isAdminAsync(member);
};
