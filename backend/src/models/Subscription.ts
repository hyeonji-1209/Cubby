import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

export enum SubscriptionPlan {
  BASIC = 'basic',       // 무료
  STANDARD = 'standard', // 스탠다드
  PREMIUM = 'premium',   // 프리미엄
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

// 플랜별 제한 설정
export const PLAN_LIMITS = {
  [SubscriptionPlan.BASIC]: {
    maxGroups: 1,
    maxMembersPerGroup: 10,
    maxSubGroupsPerGroup: 2,
    maxSubGroupDepth: 1, // 1단계만 (큰모임 → 소모임)
    storageLimit: 100, // MB
    advancedFeatures: false,
  },
  [SubscriptionPlan.STANDARD]: {
    maxGroups: 3,
    maxMembersPerGroup: 50,
    maxSubGroupsPerGroup: 10,
    maxSubGroupDepth: 2, // 2단계 (큰모임 → 중간모임 → 소모임)
    storageLimit: 5120, // 5GB
    advancedFeatures: true,
  },
  [SubscriptionPlan.PREMIUM]: {
    maxGroups: -1, // 무제한
    maxMembersPerGroup: -1,
    maxSubGroupsPerGroup: -1,
    maxSubGroupDepth: -1, // 무제한
    storageLimit: -1,
    advancedFeatures: true,
  },
};

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: SubscriptionPlan, default: SubscriptionPlan.BASIC })
  plan: SubscriptionPlan;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date;

  @Column({ type: 'json', nullable: true })
  paymentInfo: {
    provider?: string;
    subscriptionId?: string;
    lastPaymentAt?: string;
  };

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
