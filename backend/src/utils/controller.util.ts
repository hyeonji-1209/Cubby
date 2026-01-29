import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * 컨트롤러 래퍼 유틸리티
 * try-catch 보일러플레이트를 제거하고 에러 핸들링을 자동화합니다.
 */

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * 비동기 컨트롤러를 래핑하여 에러를 자동으로 next()로 전달
 *
 * @example
 * // Before
 * login = async (req, res, next) => {
 *   try {
 *     // ...logic
 *     res.json({ success: true });
 *   } catch (error) {
 *     next(error);
 *   }
 * };
 *
 * // After
 * login = asyncHandler(async (req, res) => {
 *   // ...logic
 *   res.json({ success: true });
 * });
 */
export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 여러 컨트롤러 메서드를 한번에 래핑
 *
 * @example
 * const handlers = wrapController({
 *   login: async (req, res) => { ... },
 *   register: async (req, res) => { ... },
 * });
 */
export const wrapController = <T extends Record<string, AsyncRequestHandler>>(
  handlers: T
): { [K in keyof T]: RequestHandler } => {
  const wrapped = {} as { [K in keyof T]: RequestHandler };

  for (const key in handlers) {
    if (Object.prototype.hasOwnProperty.call(handlers, key)) {
      wrapped[key] = asyncHandler(handlers[key]);
    }
  }

  return wrapped;
};

/**
 * 응답 헬퍼 유틸리티
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

export const sendMessage = (
  res: Response,
  message: string,
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
  });
};

export const sendCreated = <T>(res: Response, data: T): Response => {
  return sendSuccess(res, data, 201);
};
