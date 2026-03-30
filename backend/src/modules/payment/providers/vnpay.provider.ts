import crypto from 'crypto';
import qs from 'qs';
import { VNPAY_CONFIG } from '../payment.constants';

export class VNPayProvider {
  private sortObject(obj: Record<string, any>) {
    return Object.keys(obj)
      .sort()
      .reduce((result: Record<string, any>, key) => {
        result[key] = obj[key];
        return result;
      }, {});
  }

  createPaymentUrl(params: {
    orderId: string;
    amount: number;
    ipAddr: string;
  }): string {
    const date = new Date();

    const vnp_Params: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: VNPAY_CONFIG.tmnCode,
      vnp_Amount: params.amount * 100,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.orderId,
      vnp_OrderInfo: `Payment for order ${params.orderId}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: VNPAY_CONFIG.returnUrl,
      vnp_IpAddr: params.ipAddr,
      vnp_CreateDate: this.formatDate(date),
    };

    const sortedParams = this.sortObject(vnp_Params);

    const signData = qs.stringify(sortedParams, {
      encode: true,
      format: 'RFC1738',
    });

    const secureHash = crypto
      .createHmac('sha512', VNPAY_CONFIG.secretKey)
      .update(signData)
      .digest('hex');

    sortedParams['vnp_SecureHash'] = secureHash;

    return `${VNPAY_CONFIG.vnpUrl}?${qs.stringify(sortedParams, {
      encode: true,
      format: 'RFC1738',
    })}`;
  }

  verifyReturn(query: Record<string, string>): boolean {
    const secureHash = query['vnp_SecureHash'];

    const cloned = { ...query };
    delete cloned['vnp_SecureHash'];
    delete cloned['vnp_SecureHashType'];

    const sorted = this.sortObject(cloned);

    const signData = qs.stringify(sorted, {
      encode: true,
      format: 'RFC1738',
    });

    const hash = crypto
      .createHmac('sha512', VNPAY_CONFIG.secretKey)
      .update(signData)
      .digest('hex');

    return hash === secureHash;
  }

  private formatDate(date: Date): string {
    return date
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
  }
}
