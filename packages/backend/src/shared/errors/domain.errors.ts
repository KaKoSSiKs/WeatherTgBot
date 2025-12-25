/**
 * Domain Errors
 * 
 * Ошибки доменной логики приложения.
 * Не зависят от transport layer (Telegram, HTTP).
 */

/**
 * Базовый класс для domain ошибок
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Пользователь не найден
 */
export class UserNotFoundError extends DomainError {
  constructor(userId: string | number) {
    super(
      `User with id ${userId} not found`,
      'USER_NOT_FOUND',
      404
    );
  }
}

/**
 * Локация не установлена
 */
export class LocationNotSetError extends DomainError {
  constructor(userId: string | number) {
    super(
      `Default location not set for user ${userId}`,
      'LOCATION_NOT_SET',
      400
    );
  }
}

/**
 * Локация не найдена
 */
export class LocationNotFoundError extends DomainError {
  constructor(locationId: number) {
    super(
      `Location with id ${locationId} not found`,
      'LOCATION_NOT_FOUND',
      404
    );
  }
}

/**
 * Локация не принадлежит пользователю
 */
export class LocationNotOwnedError extends DomainError {
  constructor(locationId: number, userId: string | number) {
    super(
      `Location ${locationId} does not belong to user ${userId}`,
      'LOCATION_NOT_OWNED',
      403
    );
  }
}

