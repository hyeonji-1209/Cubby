import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum VerificationType {
  EMAIL = 'email',
  PHONE = 'phone',
}

@Entity('verification_codes')
@Index(['userId', 'type'])
export class VerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  userId: string; // UUID 또는 'signup' (비로그인 인증용)

  @Column({ type: 'enum', enum: VerificationType })
  type: VerificationType;

  @Column({ type: 'varchar', length: 255 })
  target: string; // 이메일 주소 또는 전화번호

  @Column({ type: 'varchar', length: 100 })
  code: string; // 6자리 코드 또는 인증 토큰

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'int', default: 0 })
  attempts: number; // 시도 횟수 (브루트포스 방지)

  @CreateDateColumn()
  createdAt: Date;
}
