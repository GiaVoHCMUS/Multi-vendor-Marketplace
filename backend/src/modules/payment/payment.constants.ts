export const VNPAY_CONFIG = {
  tmnCode: process.env.VNP_TMN_CODE,
  secretKey: process.env.VNP_HASH_SECRET as string,
  vnpUrl: process.env.VNP_URL,
  returnUrl: process.env.VNP_RETURN_URL,
};
