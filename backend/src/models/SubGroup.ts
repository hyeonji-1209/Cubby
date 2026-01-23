import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Group } from './Group';
import { User } from './User';

export enum SubGroupStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending', // 승인 대기
}

@Entity('sub_groups')
export class SubGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  parentGroupId: string;

  @Column({ type: 'uuid', nullable: true })
  parentSubGroupId: string; // 상위 소모임 (중첩 구조)

  @Column({ type: 'int', default: 0 })
  depth: number; // 0: 큰모임 직속, 1: 중간모임, 2: 작은모임...

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage: string;

  @Column({ type: 'uuid', nullable: true })
  leaderId: string;

  @Column({ type: 'uuid', nullable: true })
  createdById: string; // 생성 요청자

  @Column({ type: 'json', nullable: true })
  settings: Record<string, unknown>;

  @Column({ type: 'enum', enum: SubGroupStatus, default: SubGroupStatus.PENDING })
  status: SubGroupStatus;

  @ManyToOne(() => Group, (group) => group.subGroups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentGroupId' })
  parentGroup: Group;

  @ManyToOne(() => SubGroup, (subGroup) => subGroup.childSubGroups, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentSubGroupId' })
  parentSubGroup: SubGroup;

  @OneToMany(() => SubGroup, (subGroup) => subGroup.parentSubGroup)
  childSubGroups: SubGroup[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'leaderId' })
  leader: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
