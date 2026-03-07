// src/shared/constants/regex.constant.ts
export const REGEX = {
  // UUID v4: Định dạng phổ biến nhất của Postgres (8-4-4-4-12)
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // Việt Nam Phone Number
  VIETNAM_PHONE:
    /^(0|\+84)(\s|\.)?((3[2-9])|(5[689])|(7[06-9])|(8[1-689])|(9[0-46-9]))(\d)(\s|\.)?(\d{3})(\s|\.)?(\d{3})$/,

  // Password rules
  PASSWORD_UPPERCASE: /[A-Z]/,
  PASSWORD_LOWERCASE: /[a-z]/,
  PASSWORD_NUMBER: /[0-9]/,
} as const;
