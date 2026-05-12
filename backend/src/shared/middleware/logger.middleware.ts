import morgan from 'morgan';
import moment from 'moment';
import chalk from 'chalk';

// 1. Token thời gian [HH:mm:ss UTC] - Màu xám
morgan.token('date-utc', () => {
  const time = moment().utc().format('HH:mm:ss');
  return chalk.gray(`[${time} UTC]`);
});

// 2. Token Method - Màu vàng đậm
morgan.token('method', (req) => {
  return chalk.yellow.bold(req.method);
});

// 3. Token Status - Màu sắc thay đổi theo mã lỗi
morgan.token('status', (req, res) => {
    const status = res.statusCode;
    const color = status >= 500 ? chalk.red     // Lỗi Server
                : status >= 400 ? chalk.yellow  // Lỗi Client
                : status >= 300 ? chalk.cyan    // Redirect
                : chalk.green;                  // Thành công
    
    return color(status);
});

// 4. Ghép định dạng: [Time] Method URL - Status (Time ms)
const customFormat = ':date-utc :method :url - :status (:response-time ms)';

export const loggerMiddleware = morgan(customFormat);