import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactCalendar from 'react-calendar';
import ReactQuill from 'react-quill';
import 'react-calendar/dist/Calendar.css';
import 'react-quill/dist/quill.snow.css';
import { useGroupStore } from '@/store/groupStore';
import { useAuthStore } from '@/store';
import { groupApi, announcementApi, scheduleApi, uploadApi, locationApi } from '@/api';
import type { FavoriteLocation } from '@/api';
import { Modal, EmptyState, useToast, CommentSection, LocationPicker } from '@/components';
import type { LocationData } from '@/components';
import { useLoading } from '@/hooks';
import { formatDate } from '@/utils/dateFormat';
import { isHoliday, getHolidayName } from '@/utils/holidays';
import {
  GROUP_TYPE_LABELS,
  MEMBER_ROLE_LABELS,
  ROLE_OPTIONS,
} from '@/constants/labels';
import { getIconById } from '@/assets/icons';
import type { GroupMember, SubGroupRequest, Announcement, AnnouncementFormData, Schedule, ScheduleFormData } from '@/types';
import PositionsTab from './PositionsTab';
import './GroupPages.scss';

// 첨부파일 타입
interface AttachmentFile {
  id: string;
  file?: File; // 새 파일 업로드 시
  name?: string; // 기존 첨부파일
  url?: string; // 기존 첨부파일
  preview?: string;
  type: 'image' | 'file' | string;
}

type CalendarValue = Date | null | [Date | null, Date | null];
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

type TabType = 'home' | 'members' | 'subgroups' | 'announcements' | 'schedules' | 'settings';

const GroupDetailPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();

  const {
    currentGroup,
    currentGroupLoading,
    members,
    membersLoading,
    subGroups,
    subGroupsLoading,
    subGroupRequests,
    fetchGroup,
    fetchMembers,
    fetchSubGroups,
    fetchSubGroupRequests,
    createSubGroup,
    approveRequest,
    rejectRequest,
    leaveGroup,
    deleteGroup,
    clearCurrentGroup,
  } = useGroupStore();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSubGroupModal, setShowSubGroupModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

  // 소모임 생성 폼
  const [subGroupName, setSubGroupName] = useState('');
  const [subGroupDesc, setSubGroupDesc] = useState('');
  const { loading: subGroupLoading, withLoading: withSubGroupLoading } = useLoading();

  // 멤버 역할 변경
  const [newRole, setNewRole] = useState('');
  const { loading: roleLoading, withLoading: withRoleLoading } = useLoading();

  // 멤버 검색
  const [memberSearch, setMemberSearch] = useState('');

  // 초대코드 재생성
  const { loading: regeneratingCode, withLoading: withRegeneratingCode } = useLoading();

  // 공지사항
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { loading: announcementsLoading, withLoading: withAnnouncementsLoading } = useLoading();
  const [announcementWriteMode, setAnnouncementWriteMode] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [announcementLikeState, setAnnouncementLikeState] = useState<{ isLiked: boolean; likeCount: number } | null>(null);
  const { withLoading: withAnnouncementDetailLoading } = useLoading();
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormData>({
    title: '',
    content: '',
    isPinned: false,
    isAdminOnly: false,
  });
  const { loading: announcementSaving, withLoading: withAnnouncementSaving } = useLoading();
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 일정
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const { loading: schedulesLoading, withLoading: withSchedulesLoading } = useLoading();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const { withLoading: withScheduleDetailLoading } = useLoading();
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '10:00',
    isAllDay: false,
    locationData: null as LocationData | null,
    color: '#3b82f6',
  });
  const { loading: scheduleSaving, withLoading: withScheduleSaving } = useLoading();

  // 캘린더
  const [homeCalendarDate, setHomeCalendarDate] = useState<CalendarValue>(new Date());

  // 자주 쓰는 장소
  const [favoriteLocations, setFavoriteLocations] = useState<FavoriteLocation[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<FavoriteLocation | null>(null);
  const [locationForm, setLocationForm] = useState<LocationData | null>(null);
  const { loading: locationSaving, withLoading: withLocationSaving } = useLoading();

  // 데이터 로드 상태 (lazy loading용) - useRef로 변경하여 리렌더링 방지
  const loadedRef = useRef({
    members: false,
    subGroups: false,
    homeData: false,          // 홈탭용 (overview에서 받은 데이터)
    announcementsFull: false, // 공지사항 탭용 전체 목록
    schedulesFull: false,     // 일정 탭용 전체 목록
    requests: false,
    favoriteLocations: false, // 자주 쓰는 장소
  });

  // 선택된 날짜
  const selectedDate = homeCalendarDate instanceof Date ? homeCalendarDate : null;

  // 날짜별 일정 매핑
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    schedules.forEach((schedule) => {
      const startDate = new Date(schedule.startAt);
      const endDate = new Date(schedule.endAt);
      const current = new Date(startDate);
      current.setHours(0, 0, 0, 0);

      while (current <= endDate) {
        const dateKey = current.toISOString().split('T')[0];
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(schedule);
        current.setDate(current.getDate() + 1);
      }
    });
    return map;
  }, [schedules]);

  // 선택된 날짜의 일정
  const selectedDateSchedules = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toISOString().split('T')[0];
    return schedulesByDate.get(dateKey) || [];
  }, [selectedDate, schedulesByDate]);

  // 권한 체크 (useEffect보다 먼저 정의)
  const currentMember = members.find((m) => m.userId === user?.id);
  const myRole = currentGroup?.myRole || currentMember?.role;
  const isOwner = myRole === 'owner';
  const isAdmin = isOwner || myRole === 'admin';
  const memberCount = currentGroup?.memberCount ?? members.length;

  // 필터링된 멤버 목록
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const search = memberSearch.toLowerCase();
    return members.filter((member) => {
      const name = (member.nickname || member.user?.name || '').toLowerCase();
      const email = (member.user?.email || '').toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }, [members, memberSearch]);

  // 초기 로드: overview API로 그룹 정보 + 공지사항 + 일정을 한 번에 불러옴
  useEffect(() => {
    if (!groupId) return;

    const loadOverview = async () => {
      try {
        const response = await groupApi.getOverview(groupId);
        // 그룹 정보는 store에 저장
        await fetchGroup(groupId);
        // 홈탭용 공지사항, 일정 데이터 설정 (5개씩)
        setAnnouncements(response.data.announcements);
        setSchedules(response.data.schedules);
        loadedRef.current.homeData = true;
      } catch (error) {
        console.error('Failed to load overview:', error);
        await fetchGroup(groupId);
      }
    };

    loadOverview();
    // 플래그 리셋
    loadedRef.current = {
      members: false,
      subGroups: false,
      homeData: false,
      announcementsFull: false,
      schedulesFull: false,
      requests: false,
      favoriteLocations: false,
    };

    return () => {
      clearCurrentGroup();
    };
  }, [groupId]);

  // 탭 전환 시 필요한 데이터만 lazy loading
  useEffect(() => {
    if (!groupId) return;

    const loadTabData = async () => {
      switch (activeTab) {
        case 'home':
          // 홈탭: overview에서 이미 로드됨 (homeData 플래그로 체크)
          // overview 실패 시에만 개별 API 호출
          if (!loadedRef.current.homeData) {
            await fetchAnnouncements();
            await fetchSchedules();
            loadedRef.current.homeData = true;
          }
          break;
        case 'members':
          if (!loadedRef.current.members) {
            loadedRef.current.members = true;
            await fetchMembers(groupId);
          }
          break;
        case 'subgroups':
          if (!loadedRef.current.subGroups) {
            loadedRef.current.subGroups = true;
            await fetchSubGroups(groupId);
          }
          break;
        case 'announcements':
          // 공지사항 탭: 전체 목록 필요
          if (!loadedRef.current.announcementsFull) {
            loadedRef.current.announcementsFull = true;
            await fetchAnnouncements();
          }
          // 관리자는 승인 요청도 함께 로드
          if (!loadedRef.current.requests && isAdmin) {
            loadedRef.current.requests = true;
            await fetchSubGroupRequests(groupId);
          }
          break;
        case 'schedules':
          // 일정 탭: 전체 목록 필요
          if (!loadedRef.current.schedulesFull) {
            loadedRef.current.schedulesFull = true;
            await fetchSchedules();
          }
          // 일정 추가 시 자주 쓰는 장소도 필요
          if (!loadedRef.current.favoriteLocations) {
            loadedRef.current.favoriteLocations = true;
            await fetchFavoriteLocations();
          }
          break;
        case 'settings':
          if (!loadedRef.current.members) {
            loadedRef.current.members = true;
            await fetchMembers(groupId);
          }
          if (!loadedRef.current.favoriteLocations) {
            loadedRef.current.favoriteLocations = true;
            await fetchFavoriteLocations();
          }
          break;
      }
    };

    loadTabData();
  }, [groupId, activeTab]);

  const handleLeaveGroup = async () => {
    if (!groupId) return;

    try {
      await leaveGroup(groupId);
      navigate('/groups');
    } catch {
      toast.error('모임 탈퇴에 실패했습니다.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;

    try {
      await deleteGroup(groupId);
      toast.success('모임이 삭제되었습니다.');
      navigate('/groups');
    } catch {
      toast.error('모임 삭제에 실패했습니다.');
    }
  };

  const copyInviteCode = () => {
    if (currentGroup?.inviteCode) {
      navigator.clipboard.writeText(currentGroup.inviteCode);
      toast.success('초대 코드가 복사되었습니다!');
    }
  };

  // 초대코드 만료 여부 확인
  const isInviteCodeExpired = () => {
    if (!currentGroup?.inviteCodeExpiresAt) return false;
    return new Date() > new Date(currentGroup.inviteCodeExpiresAt);
  };

  // 초대코드 만료일 포맷
  const formatExpiryDate = (dateStr?: string) => {
    if (!dateStr) return '무제한';
    const date = new Date(dateStr);
    const now = new Date();

    if (date < now) return '만료됨';

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${month}월 ${day}일 ${hours}:${minutes} 만료`;
  };

  // 초대코드 재생성
  const handleRegenerateInviteCode = async () => {
    if (!groupId || !isAdmin) return;

    if (!confirm('초대 코드를 재생성하시겠습니까? 기존 코드는 더 이상 사용할 수 없습니다.')) {
      return;
    }

    await withRegeneratingCode(async () => {
      await groupApi.regenerateInviteCode(groupId);
      await fetchGroup(groupId);
      toast.success('초대 코드가 재생성되었습니다.');
    }).catch(() => toast.error('초대 코드 재생성에 실패했습니다.'));
  };

  // 소모임 생성
  const handleCreateSubGroup = async () => {
    if (!groupId || !subGroupName.trim()) return;

    await withSubGroupLoading(async () => {
      const result = await createSubGroup(groupId, {
        name: subGroupName.trim(),
        description: subGroupDesc.trim() || undefined,
      });

      // 승인 요청인 경우
      if ('status' in result && result.status === 'pending') {
        toast.info('소모임 생성 요청이 전송되었습니다. 관리자 승인을 기다려주세요.');
      } else {
        toast.success('소모임이 생성되었습니다!');
        await fetchSubGroups(groupId);
      }

      setShowSubGroupModal(false);
      setSubGroupName('');
      setSubGroupDesc('');
    }).catch(() => toast.error('소모임 생성에 실패했습니다.'));
  };

  // 승인 요청 처리
  const handleApproveRequest = async (request: SubGroupRequest) => {
    if (!groupId) return;

    try {
      await approveRequest(groupId, request.id);
      toast.success(`"${request.name}" 소모임이 승인되었습니다.`);
    } catch {
      toast.error('승인에 실패했습니다.');
    }
  };

  const handleRejectRequest = async (request: SubGroupRequest) => {
    if (!groupId) return;

    const reason = prompt('거절 사유를 입력하세요 (선택사항):');
    try {
      await rejectRequest(groupId, request.id, reason || undefined);
      toast.success('요청이 거절되었습니다.');
    } catch {
      toast.error('거절에 실패했습니다.');
    }
  };

  // 멤버 역할 관리
  const openMemberModal = (member: GroupMember) => {
    setSelectedMember(member);
    setNewRole(member.role);
    setShowMemberModal(true);
  };

  const handleUpdateRole = async () => {
    if (!groupId || !selectedMember || !newRole) return;

    await withRoleLoading(async () => {
      await groupApi.updateMemberRole(groupId, selectedMember.id, newRole);
      await fetchMembers(groupId);
      toast.success('역할이 변경되었습니다.');
      setShowMemberModal(false);
    }).catch(() => toast.error('역할 변경에 실패했습니다.'));
  };

  const handleRemoveMember = async () => {
    if (!groupId || !selectedMember) return;

    if (!confirm(`${selectedMember.user?.name}님을 모임에서 내보내시겠습니까?`)) {
      return;
    }

    try {
      await groupApi.removeMember(groupId, selectedMember.id);
      await fetchMembers(groupId);
      toast.success('멤버가 제거되었습니다.');
      setShowMemberModal(false);
    } catch {
      toast.error('멤버 제거에 실패했습니다.');
    }
  };

  // 공지사항 조회
  const fetchAnnouncements = useCallback(async () => {
    if (!groupId) return;

    await withAnnouncementsLoading(async () => {
      const response = await announcementApi.getByGroup(groupId);
      setAnnouncements(response.data);
    }).catch((error) => console.error('Failed to fetch announcements:', error));
  }, [groupId, withAnnouncementsLoading]);

  // 공지사항 생성/수정
  const handleSaveAnnouncement = async () => {
    if (!groupId || !announcementForm.title.trim() || !announcementForm.content.trim()) return;

    await withAnnouncementSaving(async () => {
      // 새 파일만 업로드 (file이 있는 것만)
      const newFiles = attachments.filter((a) => a.file).map((a) => a.file!);
      let uploadedAttachments: { name: string; url: string; type: string }[] = [];
      if (newFiles.length > 0) {
        uploadedAttachments = await uploadApi.uploadFiles(newFiles);
      }

      // 기존 첨부파일 (url이 있는 것) + 새로 업로드된 첨부파일 합치기
      const existingAttachments = attachments
        .filter((a) => a.url)
        .map((a) => ({ name: a.name!, url: a.url!, type: a.type }));
      const allAttachments = [...existingAttachments, ...uploadedAttachments];

      const formData = {
        ...announcementForm,
        attachments: allAttachments.length > 0 ? allAttachments : undefined,
      };

      if (editingAnnouncement) {
        await announcementApi.update(editingAnnouncement.id, formData);
        toast.success('공지사항이 수정되었습니다.');
      } else {
        await announcementApi.create(groupId, formData);
        toast.success('공지사항이 등록되었습니다.');
      }
      await fetchAnnouncements();
      closeAnnouncementWriteMode();
    }).catch(() => toast.error('공지사항 저장에 실패했습니다.'));
  };

  // 공지사항 삭제
  const handleDeleteAnnouncement = async (announcement: Announcement) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return;

    try {
      await announcementApi.delete(announcement.id);
      toast.success('공지사항이 삭제되었습니다.');
      await fetchAnnouncements();
    } catch {
      toast.error('공지사항 삭제에 실패했습니다.');
    }
  };

  // 공지사항 고정/해제
  const handleTogglePin = async (announcement: Announcement) => {
    try {
      await announcementApi.togglePin(announcement.id);
      await fetchAnnouncements();
    } catch {
      toast.error('고정 설정에 실패했습니다.');
    }
  };

  // 공지사항 작성 모드 열기
  const openAnnouncementWriteMode = () => {
    setEditingAnnouncement(null);
    setAnnouncementForm({ title: '', content: '', isPinned: false });
    setAnnouncementWriteMode(true);
  };

  // 공지사항 수정 모드 열기
  const openEditAnnouncement = async (announcement: Announcement) => {
    try {
      // 목록에서는 content, attachments가 없으므로 상세 조회
      const response = await announcementApi.getById(announcement.id);
      const fullAnnouncement = response.data;

      setEditingAnnouncement(fullAnnouncement);
      setAnnouncementForm({
        title: fullAnnouncement.title || '',
        content: fullAnnouncement.content || '',
        isPinned: fullAnnouncement.isPinned ?? false,
        isAdminOnly: fullAnnouncement.isAdminOnly ?? false,
      });
      setAttachments(
        (fullAnnouncement.attachments || []).map((att, idx) => ({
          id: `existing-${idx}`,
          name: att.name,
          url: att.url,
          type: att.type,
        }))
      );
      setAnnouncementWriteMode(true);
    } catch {
      toast.error('공지사항을 불러오는데 실패했습니다.');
    }
  };

  // 공지사항 작성 모드 닫기
  const closeAnnouncementWriteMode = () => {
    setAnnouncementWriteMode(false);
    setEditingAnnouncement(null);
    setAnnouncementForm({ title: '', content: '', isPinned: false, isAdminOnly: false });
    setAttachments([]);
  };

  // 공지사항 상세 조회
  const handleSelectAnnouncement = async (announcement: Announcement) => {
    await withAnnouncementDetailLoading(async () => {
      const response = await announcementApi.getById(announcement.id);
      setSelectedAnnouncement(response.data);
      // 좋아요 상태 초기화
      setAnnouncementLikeState({
        isLiked: response.data.isLiked ?? false,
        likeCount: response.data.likeCount ?? 0,
      });
    }).catch(() => toast.error('공지사항을 불러오는데 실패했습니다.'));
  };

  // 공지사항 상세 보기 닫기
  const closeAnnouncementDetail = () => {
    setSelectedAnnouncement(null);
    setAnnouncementLikeState(null);
  };

  // 공지사항 좋아요 토글
  const handleToggleAnnouncementLike = async () => {
    if (!selectedAnnouncement) return;

    try {
      const response = await announcementApi.toggleLike(selectedAnnouncement.id);
      setAnnouncementLikeState(response.data);
    } catch {
      toast.error('좋아요 처리에 실패했습니다.');
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: AttachmentFile[] = [];
    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const attachment: AttachmentFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        type: isImage ? 'image' : 'file',
        preview: isImage ? URL.createObjectURL(file) : undefined,
      };
      newAttachments.push(attachment);
    });

    setAttachments((prev) => [...prev, ...newAttachments]);

    // input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 첨부파일 제거
  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 공지사항 작성 권한 (운영자, 관리자, 리더)
  const canWriteAnnouncement = myRole && ['owner', 'admin', 'leader'].includes(myRole);

  // Quill 에디터 설정
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }, { background: [] }],
      ['link'],
      ['clean'],
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'link',
  ];

  // 자주 쓰는 장소 조회
  const fetchFavoriteLocations = useCallback(async () => {
    if (!groupId) return;

    try {
      const data = await locationApi.getByGroup(groupId);
      setFavoriteLocations(data);
    } catch (error) {
      console.error('Failed to fetch favorite locations:', error);
    }
  }, [groupId]);

  // 자주 쓰는 장소 추가/수정
  const handleSaveLocation = async () => {
    if (!groupId || !locationForm) return;

    await withLocationSaving(async () => {
      if (editingLocation) {
        await locationApi.update(groupId, editingLocation.id, {
          name: locationForm.name,
          address: locationForm.address,
          detail: locationForm.detail,
        });
        toast.success('장소가 수정되었습니다.');
      } else {
        await locationApi.create(groupId, {
          name: locationForm.name,
          address: locationForm.address,
          detail: locationForm.detail,
          placeId: locationForm.placeId,
          lat: locationForm.lat,
          lng: locationForm.lng,
        });
        toast.success('장소가 추가되었습니다.');
      }
      await fetchFavoriteLocations();
      closeLocationModal();
    }).catch(() => toast.error('장소 저장에 실패했습니다.'));
  };

  // 자주 쓰는 장소 삭제
  const handleDeleteLocation = async (location: FavoriteLocation) => {
    if (!groupId) return;
    if (!confirm(`"${location.name}" 장소를 삭제하시겠습니까?`)) return;

    try {
      await locationApi.delete(groupId, location.id);
      toast.success('장소가 삭제되었습니다.');
      await fetchFavoriteLocations();
    } catch {
      toast.error('장소 삭제에 실패했습니다.');
    }
  };

  // 장소 모달 닫기
  const closeLocationModal = () => {
    setShowLocationModal(false);
    setEditingLocation(null);
    setLocationForm(null);
  };

  // 일정 조회
  const fetchSchedules = useCallback(async () => {
    if (!groupId) return;

    await withSchedulesLoading(async () => {
      const response = await scheduleApi.getByGroup(groupId);
      setSchedules(response.data);
    }).catch((error) => console.error('Failed to fetch schedules:', error));
  }, [groupId, withSchedulesLoading]);

  // 일정 생성/수정
  const handleSaveSchedule = async () => {
    if (!groupId || !scheduleForm.title.trim() || !scheduleForm.startDate || !scheduleForm.endDate) return;

    // 날짜/시간 합치기
    const startAt = scheduleForm.isAllDay
      ? `${scheduleForm.startDate}T00:00`
      : `${scheduleForm.startDate}T${scheduleForm.startTime}`;
    const endAt = scheduleForm.isAllDay
      ? `${scheduleForm.endDate}T23:59`
      : `${scheduleForm.endDate}T${scheduleForm.endTime}`;

    // 장소 문자열 생성 (표시용)
    const locationStr = scheduleForm.locationData
      ? scheduleForm.locationData.detail
        ? `${scheduleForm.locationData.name} (${scheduleForm.locationData.detail})`
        : scheduleForm.locationData.name
      : undefined;

    const formData: ScheduleFormData = {
      title: scheduleForm.title,
      description: scheduleForm.description,
      startAt,
      endAt,
      isAllDay: scheduleForm.isAllDay,
      location: locationStr,
      locationData: scheduleForm.locationData || undefined,
      color: scheduleForm.color,
    };

    await withScheduleSaving(async () => {
      if (editingSchedule) {
        await scheduleApi.update(editingSchedule.id, formData);
        toast.success('일정이 수정되었습니다.');
      } else {
        await scheduleApi.create(groupId, formData);
        toast.success('일정이 등록되었습니다.');
      }
      await fetchSchedules();
      closeScheduleModal();
    }).catch(() => toast.error('일정 저장에 실패했습니다.'));
  };

  // 일정 삭제
  const handleDeleteSchedule = async (schedule: Schedule) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;

    try {
      await scheduleApi.delete(schedule.id);
      toast.success('일정이 삭제되었습니다.');
      await fetchSchedules();
    } catch {
      toast.error('일정 삭제에 실패했습니다.');
    }
  };

  // 일정 수정 모달 열기 (상세 API 호출)
  const openEditSchedule = async (scheduleId: string) => {
    await withScheduleDetailLoading(async () => {
      const response = await scheduleApi.getById(scheduleId);
      const schedule = response.data;
      setEditingSchedule(schedule);
      // datetime을 날짜/시간으로 분리
      const startDate = schedule.startAt.slice(0, 10);
      const startTime = schedule.startAt.slice(11, 16) || '09:00';
      const endDate = schedule.endAt.slice(0, 10);
      const endTime = schedule.endAt.slice(11, 16) || '10:00';
      setScheduleForm({
        title: schedule.title,
        description: schedule.description || '',
        startDate,
        startTime,
        endDate,
        endTime,
        isAllDay: schedule.isAllDay,
        locationData: schedule.locationData || null,
        color: schedule.color || '#3b82f6',
      });
      setShowScheduleModal(true);
    }).catch(() => toast.error('일정을 불러오는데 실패했습니다.'));
  };

  // 일정 모달 닫기
  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setEditingSchedule(null);
    setScheduleForm({
      title: '',
      description: '',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '10:00',
      isAllDay: false,
      locationData: null,
      color: '#3b82f6',
    });
  };

  // 새 일정 모달 열기 (현재 시간 기준 기본값 설정)
  const openNewScheduleModal = () => {
    const now = new Date();
    // 30분 단위로 반올림
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 30 ? 30 : 0;
    const roundedHour = minutes < 30 ? now.getHours() : now.getHours() + 1;

    // 시간이 24시를 넘으면 다음 날로
    const startDate = new Date(now);
    if (roundedHour >= 24) {
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setHours(roundedHour, roundedMinutes, 0, 0);
    }

    // 종료 시간은 시작 시간 + 1시간
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    const formatTime = (date: Date) => {
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    const formatDateStr = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    setScheduleForm({
      title: '',
      description: '',
      startDate: formatDateStr(startDate),
      startTime: formatTime(startDate),
      endDate: formatDateStr(endDate),
      endTime: formatTime(endDate),
      isAllDay: false,
      locationData: null,
      color: '#3b82f6',
    });
    setEditingSchedule(null);
    setShowScheduleModal(true);
  };

  // 일정 작성 권한 (운영자, 관리자, 리더)
  const canWriteSchedule = myRole && ['owner', 'admin', 'leader'].includes(myRole);

  // 홈 캘린더 타일 콘텐츠
  const homeTileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    const dateKey = date.toISOString().split('T')[0];
    const daySchedules = schedulesByDate.get(dateKey) || [];

    const uniqueColors = [...new Set(daySchedules.map((s) => s.color || '#3b82f6'))];
    const hasSchedules = daySchedules.length > 0;

    if (!hasSchedules) return null;

    return (
      <div className="calendar-dots">
        {uniqueColors.slice(0, 3).map((color, index) => (
          <span key={index} className="calendar-dot" style={{ backgroundColor: color }} />
        ))}
      </div>
    );
  };

  // 캘린더 타일 클래스 (공휴일, 일요일 스타일링)
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    const classes: string[] = [];
    const dayOfWeek = date.getDay();

    // 일요일
    if (dayOfWeek === 0) {
      classes.push('sunday');
    }
    // 토요일
    if (dayOfWeek === 6) {
      classes.push('saturday');
    }
    // 공휴일
    if (isHoliday(date)) {
      classes.push('holiday');
    }

    return classes.length > 0 ? classes.join(' ') : null;
  };

  if (currentGroupLoading) {
    return (
      <div className="group-detail">
        <div className="group-detail__loading">로딩 중...</div>
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="group-detail">
        <div className="group-detail__error">
          <p>모임을 찾을 수 없습니다.</p>
          <Link to="/groups">모임 목록으로</Link>
        </div>
      </div>
    );
  }

  const pendingRequestsCount = subGroupRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="group-detail">
      {/* 헤더 */}
      <div
        className="group-detail__header"
        style={currentGroup.color ? {
          background: `linear-gradient(145deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%), ${currentGroup.color}`
        } : undefined}
      >
        <div className="group-detail__info">
          {currentGroup.logoImage ? (
            <img
              src={currentGroup.logoImage}
              alt={currentGroup.name}
              className="group-detail__logo"
            />
          ) : currentGroup.icon && getIconById(currentGroup.icon) ? (
            <div className="group-detail__logo group-detail__logo--icon">
              <img src={getIconById(currentGroup.icon)} alt="" />
            </div>
          ) : (
            <div className="group-detail__logo group-detail__logo--default">
              {currentGroup.name.charAt(0)}
            </div>
          )}
          <div className="group-detail__text">
            <h1 className="group-detail__name">
              {currentGroup.name}
              {currentMember && (
                <span className="group-detail__member-info">
                  {currentMember.nickname || user?.name}
                  {currentMember.title && ` ${currentMember.title}`}님
                </span>
              )}
            </h1>
            <span className="group-detail__type">
              {GROUP_TYPE_LABELS[currentGroup.type] || currentGroup.type}
            </span>
            {currentGroup.description && (
              <p className="group-detail__desc">{currentGroup.description}</p>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="group-detail__actions">
            <button className="group-detail__invite-btn" onClick={copyInviteCode}>
              초대 코드 복사
            </button>
          </div>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div className="group-detail__tabs">
        <button
          className={`group-detail__tab ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          홈
        </button>
        {isAdmin && (
          <button
            className={`group-detail__tab ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            멤버 ({members.length > 0 ? members.length : currentGroup?.memberCount ?? 0})
          </button>
        )}
        {isAdmin && (
          <button
            className={`group-detail__tab ${activeTab === 'subgroups' ? 'active' : ''}`}
            onClick={() => setActiveTab('subgroups')}
          >
            소모임 ({subGroups.length > 0 ? subGroups.length : currentGroup?.subGroupCount ?? 0})
          </button>
        )}
        <button
          className={`group-detail__tab ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('announcements');
            setSelectedAnnouncement(null);
            setAnnouncementWriteMode(false);
          }}
        >
          공지사항
        </button>
        <button
          className={`group-detail__tab ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedules')}
        >
          일정
        </button>
        <button
          className={`group-detail__tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          설정
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="group-detail__content">
        {/* 홈 탭 */}
        {activeTab === 'home' && (
          <div className="group-detail__home">
            {isOwner && (
              <div className={`group-detail__invite-box ${isInviteCodeExpired() ? 'group-detail__invite-box--expired' : ''}`}>
                <div className="group-detail__invite-header">
                  <h3>초대 코드</h3>
                  <span className={`group-detail__invite-expiry ${isInviteCodeExpired() ? 'expired' : ''}`}>
                    {formatExpiryDate(currentGroup.inviteCodeExpiresAt)}
                  </span>
                </div>
                <div className="group-detail__invite-code">
                  <code className={isInviteCodeExpired() ? 'expired' : ''}>{currentGroup.inviteCode}</code>
                  <button onClick={copyInviteCode} disabled={isInviteCodeExpired()}>복사</button>
                  <button
                    className="regenerate"
                    onClick={handleRegenerateInviteCode}
                    disabled={regeneratingCode}
                  >
                    {regeneratingCode ? '생성 중...' : '재생성'}
                  </button>
                </div>
                <p>
                  {isInviteCodeExpired()
                    ? '초대 코드가 만료되었습니다. 새 코드를 생성해주세요.'
                    : '이 코드를 공유하여 새 멤버를 초대하세요'}
                </p>
              </div>
            )}

            <div className="group-detail__home-grid">
              {/* 왼쪽: 캘린더 + 선택 날짜 일정 */}
              <div className="group-detail__home-left">
                <div className="group-detail__home-calendar">
                  <ReactCalendar
                    onChange={setHomeCalendarDate}
                    value={homeCalendarDate}
                    tileContent={homeTileContent}
                    tileClassName={tileClassName}
                    locale="ko-KR"
                    formatDay={(_locale, date) => date.getDate().toString()}
                    calendarType="gregory"
                    showNeighboringMonth={false}
                    next2Label={null}
                    prev2Label={null}
                  />
                </div>
                <div className="group-detail__home-day">
                  <div className="group-detail__home-day-header">
                    <span className="date">
                      {selectedDate
                        ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${DAYS[selectedDate.getDay()]})`
                        : '날짜를 선택하세요'}
                      {selectedDate && getHolidayName(selectedDate) && (
                        <span className="holiday-name">{getHolidayName(selectedDate)}</span>
                      )}
                    </span>
                    <button className="group-detail__home-more" onClick={() => setActiveTab('schedules')}>
                      전체 일정
                    </button>
                  </div>
                  {selectedDateSchedules.length === 0 ? (
                    <p className="group-detail__home-empty">일정이 없습니다</p>
                  ) : (
                    <ul className="group-detail__home-schedule-list">
                      {selectedDateSchedules.map((schedule) => (
                        <li key={schedule.id} className="group-detail__home-schedule-item">
                          <span className="color" style={{ backgroundColor: schedule.color || '#3b82f6' }} />
                          <span className="title">{schedule.title}</span>
                          <span className="time">
                            {schedule.isAllDay
                              ? '종일'
                              : new Date(schedule.startAt).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* 오른쪽: 공지사항 */}
              <div className="group-detail__home-right">
                <div className="group-detail__home-section-header">
                  <h3>공지사항</h3>
                  <button className="group-detail__home-more" onClick={() => setActiveTab('announcements')}>
                    더보기
                  </button>
                </div>
                {announcementsLoading ? (
                  <p className="group-detail__home-empty">로딩 중...</p>
                ) : announcements.length === 0 ? (
                  <p className="group-detail__home-empty">등록된 공지사항이 없습니다</p>
                ) : (
                  <div className="group-detail__home-announcements">
                    {announcements.slice(0, 5).map((announcement) => (
                      <div
                        key={announcement.id}
                        className={`group-detail__home-announcement ${announcement.isPinned ? 'pinned' : ''}`}
                        onClick={() => {
                          setActiveTab('announcements');
                          handleSelectAnnouncement(announcement);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {announcement.isPinned && <span className="pin-badge">고정</span>}
                        <span className="title">{announcement.title}</span>
                        <span className="date">{formatDate(announcement.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 멤버 탭 (관리자 전용) */}
        {activeTab === 'members' && isAdmin && (
          <div className="group-detail__members">
            <div className="group-detail__members-header">
              <div className="group-detail__search">
                <input
                  type="text"
                  placeholder="이름 또는 이메일로 검색..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="group-detail__search-input"
                />
                {memberSearch && (
                  <button
                    className="group-detail__search-clear"
                    onClick={() => setMemberSearch('')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <span className="group-detail__member-count">
                {filteredMembers.length}명 {memberSearch && `/ ${members.length}명`}
              </span>
            </div>
            {membersLoading ? (
              <p className="group-detail__loading-text">로딩 중...</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>멤버</th>
                    <th>역할</th>
                    <th>{currentGroup.type === 'religious' ? '직분' : '직책'}</th>
                    <th>가입일</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="data-table__user">
                          <div className="data-table__avatar">
                            {member.user?.profileImage ? (
                              <img src={member.user.profileImage} alt={member.user.name} />
                            ) : (
                              member.user?.name?.charAt(0) || '?'
                            )}
                          </div>
                          <div className="data-table__user-info">
                            <span className="data-table__name">{member.nickname || member.user?.name}</span>
                            <span className="data-table__email">{member.user?.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`data-table__role data-table__role--${member.role}`}>
                          {MEMBER_ROLE_LABELS[member.role] || member.role}
                        </span>
                      </td>
                      <td>
                        <span className="data-table__text">{member.title || '-'}</span>
                      </td>
                      <td>
                        <span className="data-table__date">{formatDate(member.joinedAt)}</span>
                      </td>
                      <td>
                        {isAdmin && member.role !== 'owner' && (
                          <button
                            className="data-table__action-btn"
                            onClick={() => openMemberModal(member)}
                          >
                            관리
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 소모임 탭 (관리자 전용) */}
        {activeTab === 'subgroups' && isAdmin && (
          <div className="group-detail__subgroups">
            <div className="group-detail__section-header">
              <h2>소모임 ({subGroups.length})</h2>
              <button
                className="group-detail__add-btn"
                onClick={() => setShowSubGroupModal(true)}
              >
                + 소모임 만들기
              </button>
            </div>

            {subGroupsLoading ? (
              <p className="group-detail__loading-text">로딩 중...</p>
            ) : subGroups.length === 0 ? (
              <EmptyState
                description="아직 소모임이 없습니다"
                action={{ label: '첫 소모임 만들기', onClick: () => setShowSubGroupModal(true) }}
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>소모임</th>
                    <th>리더</th>
                    <th>상태</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {subGroups.map((subGroup) => (
                    <tr
                      key={subGroup.id}
                      className="data-table__row--clickable"
                      onClick={() => navigate(`/groups/${groupId}/subgroups/${subGroup.id}`)}
                    >
                      <td>
                        <div className="data-table__title-cell">
                          <span className="data-table__title">{subGroup.name}</span>
                          {subGroup.description && (
                            <span className="data-table__subtitle">{subGroup.description}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="data-table__text">{subGroup.leader?.name || '-'}</span>
                      </td>
                      <td>
                        <span className={`data-table__status data-table__status--${subGroup.status}`}>
                          {subGroup.status === 'active' ? '활성' : subGroup.status === 'pending' ? '대기' : '비활성'}
                        </span>
                      </td>
                      <td>
                        <span className="data-table__arrow">→</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 공지사항 탭 */}
        {activeTab === 'announcements' && (
          <div className="group-detail__announcements">
            {/* 미처리 승인 요청 알림 (관리자 전용) */}
            {isAdmin && pendingRequestsCount > 0 && (
              <div className="group-detail__pending-alerts">
                <div className="pending-alert">
                  <div className="pending-alert__icon">🔔</div>
                  <div className="pending-alert__content">
                    <span className="pending-alert__title">
                      승인 대기 중인 소모임 요청이 {pendingRequestsCount}건 있습니다
                    </span>
                    <div className="pending-alert__list">
                      {subGroupRequests.filter(r => r.status === 'pending').map((request) => (
                        <div key={request.id} className="pending-alert__item">
                          <span className="pending-alert__name">
                            "{request.name}" - {request.requester?.name || '알 수 없음'}
                          </span>
                          <div className="pending-alert__actions">
                            <button
                              className="pending-alert__btn pending-alert__btn--approve"
                              onClick={() => handleApproveRequest(request)}
                            >
                              승인
                            </button>
                            <button
                              className="pending-alert__btn pending-alert__btn--reject"
                              onClick={() => handleRejectRequest(request)}
                            >
                              거절
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 작성 모드 */}
            {announcementWriteMode ? (
              <div className="announcement-write">
                <div className="announcement-write__header">
                  <h2>{editingAnnouncement ? '공지사항 수정' : '공지사항 작성'}</h2>
                  <button
                    className="announcement-write__close"
                    onClick={closeAnnouncementWriteMode}
                  >
                    ✕
                  </button>
                </div>

                <div className="announcement-write__form">
                  <div className="announcement-write__field">
                    <label className="announcement-write__label">제목 *</label>
                    <input
                      type="text"
                      className="announcement-write__input"
                      placeholder="공지사항 제목을 입력하세요"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                      maxLength={200}
                    />
                  </div>

                  <div className="announcement-write__field">
                    <label className="announcement-write__label">내용 *</label>
                    <div className="announcement-write__editor">
                      <ReactQuill
                        theme="snow"
                        value={announcementForm.content}
                        onChange={(value) => setAnnouncementForm({ ...announcementForm, content: value })}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="공지사항 내용을 입력하세요"
                      />
                    </div>
                  </div>

                  {/* 파일 첨부 */}
                  <div className="announcement-write__field">
                    <label className="announcement-write__label">첨부파일</label>
                    <div className="announcement-write__attachments">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                        className="announcement-write__file-input"
                      />
                      <button
                        type="button"
                        className="announcement-write__file-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        📎 파일 첨부
                      </button>
                      <span className="announcement-write__file-hint">
                        이미지, PDF, 문서 파일 첨부 가능 (최대 10MB)
                      </span>
                    </div>

                    {/* 첨부파일 목록 */}
                    {attachments.length > 0 && (
                      <div className="announcement-write__attachment-list">
                        {attachments.map((attachment) => {
                          const fileName = attachment.file?.name || attachment.name || '';
                          const isImage = attachment.type === 'image' || attachment.type?.startsWith('image/');
                          return (
                          <div key={attachment.id} className="attachment-item">
                            {isImage && (attachment.preview || attachment.url) ? (
                              <div className="attachment-item__preview">
                                <img src={attachment.preview || attachment.url} alt={fileName} />
                              </div>
                            ) : (
                              <div className="attachment-item__icon">
                                {fileName.endsWith('.pdf') ? '📄' :
                                  fileName.match(/\.(doc|docx)$/) ? '📝' :
                                    fileName.match(/\.(xls|xlsx)$/) ? '📊' :
                                      fileName.match(/\.(ppt|pptx)$/) ? '📽️' : '📁'}
                              </div>
                            )}
                            <div className="attachment-item__info">
                              <span className="attachment-item__name">{fileName}</span>
                              {attachment.file && (
                                <span className="attachment-item__size">{formatFileSize(attachment.file.size)}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="attachment-item__remove"
                              onClick={() => removeAttachment(attachment.id)}
                            >
                              ✕
                            </button>
                          </div>
                        );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="announcement-write__footer">
                    <div className="announcement-write__options">
                      <label className="announcement-write__checkbox">
                        <input
                          type="checkbox"
                          checked={announcementForm.isPinned}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, isPinned: e.target.checked })}
                        />
                        <span>상단에 고정</span>
                      </label>
                      <label className="announcement-write__checkbox">
                        <input
                          type="checkbox"
                          checked={announcementForm.isAdminOnly}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, isAdminOnly: e.target.checked })}
                        />
                        <span>관리자 전용</span>
                      </label>
                    </div>

                    <div className="announcement-write__actions">
                      <button
                        className="announcement-write__cancel"
                        onClick={closeAnnouncementWriteMode}
                        disabled={announcementSaving}
                      >
                        취소
                      </button>
                      <button
                        className="announcement-write__submit"
                        onClick={handleSaveAnnouncement}
                        disabled={!announcementForm.title.trim() || !announcementForm.content.trim() || announcementSaving}
                      >
                        {announcementSaving ? '저장 중...' : editingAnnouncement ? '수정하기' : '등록하기'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 최근 공지사항 미리보기 */}
                {announcements.length > 0 && (
                  <div className="announcement-write__preview">
                    <h4>최근 공지사항</h4>
                    <div className="announcement-write__preview-list">
                      {announcements.slice(0, 2).map((announcement) => (
                        <div key={announcement.id} className={`announcement-write__preview-item ${announcement.isPinned ? 'pinned' : ''}`}>
                          {announcement.isPinned && <span className="pin-badge">고정</span>}
                          <span className="title">{announcement.title}</span>
                          <span className="date">{formatDate(announcement.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedAnnouncement ? (
              /* 상세보기 모드 */
              <div className="announcement-view">
                <div className="announcement-view__toolbar">
                  <button className="announcement-view__back" onClick={closeAnnouncementDetail}>
                    ← 목록
                  </button>
                  {isAdmin && (
                    <div className="announcement-view__actions">
                      <button
                        className="announcement-view__btn"
                        onClick={() => {
                          openEditAnnouncement(selectedAnnouncement);
                          closeAnnouncementDetail();
                        }}
                      >
                        수정
                      </button>
                      <button
                        className="announcement-view__btn announcement-view__btn--delete"
                        onClick={() => {
                          handleDeleteAnnouncement(selectedAnnouncement);
                          closeAnnouncementDetail();
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>

                <article className="announcement-view__article">
                  <header className="announcement-view__header">
                    <div className="announcement-view__tags">
                      {selectedAnnouncement.isPinned && <span className="announcement-view__tag announcement-view__tag--pin">고정</span>}
                      {selectedAnnouncement.isAdminOnly && <span className="announcement-view__tag announcement-view__tag--admin">관리자</span>}
                    </div>
                    <h1 className="announcement-view__title">{selectedAnnouncement.title}</h1>
                    <div className="announcement-view__info">
                      <span>{selectedAnnouncement.author?.name || '알 수 없음'}{selectedAnnouncement.author?.title && ` ${selectedAnnouncement.author.title}`}</span>
                      <span>·</span>
                      <span>{formatDate(selectedAnnouncement.createdAt)}</span>
                      <span>·</span>
                      <span>조회 {selectedAnnouncement.viewCount ?? 0}</span>
                    </div>
                  </header>

                  <div
                    className="announcement-view__body"
                    dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content || '' }}
                  />

                  {/* 좋아요 버튼 */}
                  <div className="announcement-view__footer">
                    <button
                      className={`announcement-view__like-btn ${announcementLikeState?.isLiked ? 'announcement-view__like-btn--active' : ''}`}
                      onClick={handleToggleAnnouncementLike}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={announcementLikeState?.isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      {(announcementLikeState?.likeCount || 0) > 0 && (
                        <span>{announcementLikeState?.likeCount}</span>
                      )}
                    </button>
                  </div>

                  {selectedAnnouncement.attachments && selectedAnnouncement.attachments.length > 0 && (
                    <footer className="announcement-view__files">
                      <span className="announcement-view__files-label">첨부파일</span>
                      <div className="announcement-view__files-grid">
                        {selectedAnnouncement.attachments.map((file, index) => (
                          <a
                            key={index}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="announcement-view__attachment"
                            title={file.name}
                          >
                            {file.type.includes('image') ? (
                              <img src={file.url} alt={file.name} className="announcement-view__attachment-img" />
                            ) : (
                              <div className="announcement-view__attachment-icon">
                                {file.type.includes('pdf') ? '📄' : file.name.match(/\.(doc|docx)$/) ? '📝' : file.name.match(/\.(xls|xlsx)$/) ? '📊' : '📎'}
                              </div>
                            )}
                            <span className="announcement-view__attachment-name">{file.name}</span>
                          </a>
                        ))}
                      </div>
                    </footer>
                  )}

                  {/* 댓글 섹션 */}
                  <CommentSection
                    announcementId={selectedAnnouncement.id}
                    isAdmin={isAdmin}
                  />
                </article>
              </div>
            ) : (
              <>
                <div className="group-detail__section-header">
                  <h2>공지사항</h2>
                  {canWriteAnnouncement && (
                    <button
                      className="group-detail__add-btn"
                      onClick={openAnnouncementWriteMode}
                    >
                      + 공지사항 작성
                    </button>
                  )}
                </div>

                {announcementsLoading ? (
                  <p className="group-detail__loading-text">로딩 중...</p>
                ) : announcements.length === 0 ? (
                  <EmptyState
                    description="아직 공지사항이 없습니다"
                    action={
                      canWriteAnnouncement
                        ? { label: '첫 공지사항 작성', onClick: openAnnouncementWriteMode }
                        : undefined
                    }
                  />
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>제목</th>
                        <th>작성자</th>
                        <th>작성일</th>
                        {isAdmin && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {announcements.map((announcement) => (
                        <tr
                          key={announcement.id}
                          className={`data-table__row--clickable ${announcement.isPinned ? 'data-table__row--pinned' : ''}`}
                          onClick={() => handleSelectAnnouncement(announcement)}
                        >
                          <td>
                            <div className="data-table__title-cell">
                              <div className="data-table__title-row">
                                {announcement.isPinned && (
                                  <span className="data-table__pin-badge">고정</span>
                                )}
                                {announcement.isAdminOnly && (
                                  <span className="data-table__admin-badge">관리자</span>
                                )}
                                <span className="data-table__title">{announcement.title}</span>
                              </div>
                              <span className="data-table__meta">조회 {announcement.viewCount ?? 0}</span>
                            </div>
                          </td>
                          <td>
                            <span className="data-table__text">{announcement.author?.name || '알 수 없음'}{announcement.author?.title && ` ${announcement.author.title}`}</span>
                          </td>
                          <td>
                            <span className="data-table__date">{formatDate(announcement.createdAt)}</span>
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="data-table__actions">
                                <button
                                  className="data-table__icon-btn"
                                  onClick={(e) => { e.stopPropagation(); handleTogglePin(announcement); }}
                                  title={announcement.isPinned ? '고정 해제' : '고정'}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill={announcement.isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 17v5" />
                                    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z" />
                                    <path d="M9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1" />
                                  </svg>
                                </button>
                                <button
                                  className="data-table__icon-btn"
                                  onClick={(e) => { e.stopPropagation(); openEditAnnouncement(announcement); }}
                                  title="수정"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                                <button
                                  className="data-table__icon-btn data-table__icon-btn--danger"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteAnnouncement(announcement); }}
                                  title="삭제"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}

        {/* 일정 탭 */}
        {activeTab === 'schedules' && (
          <div className="group-detail__schedules">
            <div className="group-detail__schedules-header">
              <h2>일정</h2>
              {canWriteSchedule && (
                <button
                  className="group-detail__add-btn"
                  onClick={openNewScheduleModal}
                >
                  + 일정 추가
                </button>
              )}
            </div>

            {schedulesLoading ? (
              <p className="group-detail__loading-text">로딩 중...</p>
            ) : (
              <div className="schedule-view">
                {/* 캘린더 */}
                <div className="schedule-view__calendar">
                  <ReactCalendar
                    onChange={setHomeCalendarDate}
                    value={homeCalendarDate}
                    tileContent={homeTileContent}
                    tileClassName={tileClassName}
                    locale="ko-KR"
                    formatDay={(_locale, date) => date.getDate().toString()}
                    calendarType="gregory"
                    showNeighboringMonth={false}
                    next2Label={null}
                    prev2Label={null}
                  />
                </div>

                {/* 선택된 날짜 일정 */}
                <div className="schedule-view__selected">
                  <h3 className="schedule-view__date">
                    {selectedDate
                      ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${DAYS[selectedDate.getDay()]})`
                      : '날짜를 선택하세요'}
                    {selectedDate && getHolidayName(selectedDate) && (
                      <span className="holiday-name">{getHolidayName(selectedDate)}</span>
                    )}
                  </h3>
                  {selectedDateSchedules.length === 0 ? (
                    <p className="schedule-view__empty">이 날짜에 일정이 없습니다</p>
                  ) : (
                    <div className="schedule-view__list">
                      {selectedDateSchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="schedule-item"
                          onClick={() => (isAdmin || schedule.authorId === user?.id) && openEditSchedule(schedule.id)}
                        >
                          <span
                            className="schedule-item__color"
                            style={{ backgroundColor: schedule.color || '#3b82f6' }}
                          />
                          <div className="schedule-item__info">
                            <span className="schedule-item__title">{schedule.title}</span>
                            <span className="schedule-item__time">
                              {schedule.isAllDay
                                ? '종일'
                                : `${new Date(schedule.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(schedule.endAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                            {schedule.location && (
                              <span className="schedule-item__location">📍 {schedule.location}</span>
                            )}
                          </div>
                          {(isAdmin || schedule.authorId === user?.id) && (
                            <button
                              className="schedule-item__delete"
                              onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(schedule); }}
                              title="삭제"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 설정 탭 */}
        {activeTab === 'settings' && (
          <div className="group-detail__settings">
            {isAdmin ? (
              <>
                {/* 모임 정보 섹션 */}
                <div className="group-detail__setting-section">
                  <h3>모임 정보</h3>
                  <div className="group-detail__setting-item">
                    <span className="label">모임 이름</span>
                    <span className="value">{currentGroup.name}</span>
                  </div>
                  <div className="group-detail__setting-item">
                    <span className="label">타입</span>
                    <span className="value">{GROUP_TYPE_LABELS[currentGroup.type]}</span>
                  </div>
                  {isOwner && (
                    <div className="group-detail__setting-item">
                      <span className="label">초대 코드</span>
                      <span className="value code">{currentGroup.inviteCode}</span>
                    </div>
                  )}
                </div>

                {/* 직책 관리 섹션 */}
                {groupId && (
                  <div className="group-detail__setting-section">
                    <PositionsTab groupId={groupId} members={members} isAdmin={isAdmin} groupType={currentGroup.type} />
                  </div>
                )}

                {/* 모임 장소 설정 섹션 */}
                <div className="group-detail__setting-section">
                  <div className="group-detail__setting-header">
                    <h3>모임 장소</h3>
                    <button
                      className="group-detail__setting-add-btn"
                      onClick={() => {
                        setEditingLocation(null);
                        setLocationForm(null);
                        setShowLocationModal(true);
                      }}
                    >
                      + 장소 추가
                    </button>
                  </div>
                  {favoriteLocations.length === 0 ? (
                    <p className="group-detail__setting-empty">등록된 장소가 없습니다</p>
                  ) : (
                    <div className="group-detail__location-list">
                      {favoriteLocations.map((location) => (
                        <div key={location.id} className="group-detail__location-item">
                          <div className="group-detail__location-info">
                            <span className="group-detail__location-name">{location.name}</span>
                            <span className="group-detail__location-address">
                              {location.address}
                              {location.detail && ` (${location.detail})`}
                            </span>
                          </div>
                          <div className="group-detail__location-actions">
                            <button
                              className="group-detail__location-btn"
                              onClick={() => {
                                setEditingLocation(location);
                                setLocationForm({
                                  name: location.name,
                                  address: location.address,
                                  detail: location.detail,
                                  placeId: location.placeId,
                                  lat: location.lat,
                                  lng: location.lng,
                                });
                                setShowLocationModal(true);
                              }}
                              title="수정"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              className="group-detail__location-btn group-detail__location-btn--danger"
                              onClick={() => handleDeleteLocation(location)}
                              title="삭제"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 모임 삭제/나가기 */}
                {isOwner && (
                  <div className="group-detail__setting-section group-detail__setting-section--danger">
                    <h3>모임 삭제</h3>
                    {memberCount === 1 ? (
                      <button
                        className="group-detail__danger-btn"
                        onClick={() => setShowDeleteModal(true)}
                      >
                        모임 삭제
                      </button>
                    ) : (
                      <p className="group-detail__warning">
                        운영자는 모임을 나갈 수 없습니다. 다른 멤버에게 운영자 권한을 넘긴 후 나가세요.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="group-detail__setting-section">
                  <h3>모임 나가기</h3>
                  <p className="group-detail__leave-desc">
                    모임을 나가면 더 이상 이 모임의 공지사항, 일정 등을 확인할 수 없습니다.
                  </p>
                  <button
                    className="group-detail__leave-btn"
                    onClick={() => setShowLeaveModal(true)}
                  >
                    모임 나가기
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 소모임 생성 모달 */}
      <Modal
        isOpen={showSubGroupModal}
        onClose={() => setShowSubGroupModal(false)}
        title="소모임 만들기"
        description={isAdmin ? '새 소모임이 바로 생성됩니다.' : '관리자의 승인 후 소모임이 생성됩니다.'}
        actions={
          <>
            <button className="modal__cancel" onClick={() => setShowSubGroupModal(false)}>
              취소
            </button>
            <button
              className="modal__submit"
              onClick={handleCreateSubGroup}
              disabled={!subGroupName.trim() || subGroupLoading}
            >
              {subGroupLoading ? '처리 중...' : isAdmin ? '생성하기' : '요청 보내기'}
            </button>
          </>
        }
      >
        <div className="modal__field">
          <label className="modal__label">소모임 이름 *</label>
          <input
            type="text"
            className="modal__input"
            placeholder="예: 청년부, 수학반, 개발팀"
            value={subGroupName}
            onChange={(e) => setSubGroupName(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">설명 (선택)</label>
          <textarea
            className="modal__textarea"
            placeholder="소모임에 대한 간단한 설명"
            value={subGroupDesc}
            onChange={(e) => setSubGroupDesc(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      {/* 멤버 관리 모달 */}
      <Modal
        isOpen={showMemberModal && !!selectedMember}
        onClose={() => setShowMemberModal(false)}
        title="멤버 관리"
        actions={
          <>
            <button className="modal__cancel" onClick={() => setShowMemberModal(false)}>
              취소
            </button>
            <button className="modal__submit modal__submit--danger" onClick={handleRemoveMember}>
              내보내기
            </button>
            <button
              className="modal__submit"
              onClick={handleUpdateRole}
              disabled={roleLoading || newRole === selectedMember?.role}
            >
              {roleLoading ? '저장 중...' : '역할 저장'}
            </button>
          </>
        }
      >
        {selectedMember && (
          <>
            <div className="modal__member-info">
              <div className="modal__member-avatar">
                {selectedMember.user?.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="modal__member-name">{selectedMember.user?.name}</p>
                <p className="modal__member-email">{selectedMember.user?.email}</p>
              </div>
            </div>

            <div className="modal__field">
              <label className="modal__label">역할 변경</label>
              <select
                className="modal__select"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </Modal>

      {/* 모임 나가기 모달 */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="모임 나가기"
        description={`정말 ${currentGroup.name} 모임을 나가시겠습니까?`}
        actions={
          <>
            <button className="modal__cancel" onClick={() => setShowLeaveModal(false)}>
              취소
            </button>
            <button className="modal__submit modal__submit--danger" onClick={handleLeaveGroup}>
              나가기
            </button>
          </>
        }
      />

      {/* 모임 삭제 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="모임 삭제"
        description={`정말 ${currentGroup.name} 모임을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        actions={
          <>
            <button className="modal__cancel" onClick={() => setShowDeleteModal(false)}>
              취소
            </button>
            <button className="modal__submit modal__submit--danger" onClick={handleDeleteGroup}>
              삭제
            </button>
          </>
        }
      />

      {/* 모임 장소 추가/수정 모달 */}
      <Modal
        isOpen={showLocationModal}
        onClose={closeLocationModal}
        title={editingLocation ? '장소 수정' : '모임 장소 추가'}
        description="일정 추가 시 빠르게 선택할 수 있는 장소를 등록하세요."
        size="md"
        actions={
          <>
            <button className="modal__cancel" onClick={closeLocationModal}>
              취소
            </button>
            <button
              className="modal__submit"
              onClick={handleSaveLocation}
              disabled={!locationForm?.name || !locationForm?.address || locationSaving}
            >
              {locationSaving ? '저장 중...' : editingLocation ? '수정하기' : '추가하기'}
            </button>
          </>
        }
      >
        {editingLocation ? (
          // 수정 모드: 간단한 입력 폼
          <>
            <div className="modal__field">
              <label className="modal__label">장소 이름</label>
              <input
                type="text"
                className="modal__input"
                placeholder="예: 본사 회의실"
                value={locationForm?.name || ''}
                onChange={(e) => setLocationForm((prev) => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div className="modal__field">
              <label className="modal__label">주소</label>
              <input
                type="text"
                className="modal__input"
                placeholder="예: 서울시 강남구 ..."
                value={locationForm?.address || ''}
                onChange={(e) => setLocationForm((prev) => prev ? { ...prev, address: e.target.value } : null)}
              />
            </div>
            <div className="modal__field">
              <label className="modal__label">상세 위치</label>
              <input
                type="text"
                className="modal__input"
                placeholder="예: 2층 회의실"
                value={locationForm?.detail || ''}
                onChange={(e) => setLocationForm((prev) => prev ? { ...prev, detail: e.target.value } : null)}
              />
            </div>
          </>
        ) : (
          // 추가 모드: Google Maps 검색
          <div className="modal__field">
            <label className="modal__label">장소 검색</label>
            <LocationPicker
              value={locationForm}
              onChange={(loc) => setLocationForm(loc)}
              placeholder="장소를 검색하세요"
            />
          </div>
        )}
      </Modal>

      {/* 일정 작성/수정 모달 */}
      <Modal
        isOpen={showScheduleModal}
        onClose={closeScheduleModal}
        title={editingSchedule ? '일정 수정' : '일정 추가'}
        size="md"
        actions={
          <>
            <button className="modal__cancel" onClick={closeScheduleModal}>
              취소
            </button>
            <button
              className="modal__submit"
              onClick={handleSaveSchedule}
              disabled={!scheduleForm.title.trim() || !scheduleForm.startDate || !scheduleForm.endDate || scheduleSaving}
            >
              {scheduleSaving ? '저장 중...' : editingSchedule ? '수정하기' : '등록하기'}
            </button>
          </>
        }
      >
        <div className="modal__field">
          <input
            type="text"
            className="modal__input modal__input--lg"
            placeholder="일정 제목을 입력하세요"
            value={scheduleForm.title}
            onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
            maxLength={200}
          />
        </div>

        <div className="schedule-form">
          <div className="schedule-form__datetime">
            <div className="schedule-form__row">
              <span className="schedule-form__label">시작</span>
              <input
                type="date"
                className="schedule-form__date"
                value={scheduleForm.startDate}
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  setScheduleForm({
                    ...scheduleForm,
                    startDate: newStartDate,
                    endDate: scheduleForm.endDate && newStartDate > scheduleForm.endDate ? newStartDate : scheduleForm.endDate,
                  });
                }}
              />
              {!scheduleForm.isAllDay && (
                <input
                  type="time"
                  className="schedule-form__time"
                  value={scheduleForm.startTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                />
              )}
            </div>
            <div className="schedule-form__row">
              <span className="schedule-form__label">종료</span>
              <input
                type="date"
                className="schedule-form__date"
                value={scheduleForm.endDate}
                min={scheduleForm.startDate}
                onChange={(e) => setScheduleForm({ ...scheduleForm, endDate: e.target.value })}
              />
              {!scheduleForm.isAllDay && (
                <input
                  type="time"
                  className="schedule-form__time"
                  value={scheduleForm.endTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                />
              )}
            </div>
          </div>
          <label className="schedule-form__allday">
            <input
              type="checkbox"
              checked={scheduleForm.isAllDay}
              onChange={(e) => setScheduleForm({ ...scheduleForm, isAllDay: e.target.checked })}
            />
            <span>종일</span>
          </label>
        </div>

        <div className="modal__field">
          <LocationPicker
            value={scheduleForm.locationData}
            onChange={(loc: LocationData | null) => setScheduleForm({ ...scheduleForm, locationData: loc })}
            placeholder="장소 검색"
            favoriteLocations={favoriteLocations.map((loc) => ({
              name: loc.name,
              address: loc.address,
              detail: loc.detail,
              placeId: loc.placeId,
              lat: loc.lat,
              lng: loc.lng,
            }))}
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">설명</label>
          <textarea
            className="modal__textarea"
            placeholder="일정에 대한 설명을 입력하세요"
            value={scheduleForm.description}
            onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
            rows={3}
          />
        </div>
      </Modal>

    </div>
  );
};

export default GroupDetailPage;
