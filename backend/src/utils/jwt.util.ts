import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

interface TokenPayload {
  userId: string;
}

export const generateAccessToken = (userId: string): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ userId }, config.jwt.secret, options);
};

export const generateRefreshToken = (userId: string): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ userId }, config.jwt.refreshSecret, options);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.secret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
};

export const generateTokens = (userId: string) => {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId),
  };
};
