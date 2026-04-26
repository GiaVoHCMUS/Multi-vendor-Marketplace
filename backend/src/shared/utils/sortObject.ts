// Hàm Helper để sort object keys
export const sortObject = (obj: any) =>
  Object.keys(obj)
    .sort()
    .reduce((res: any, key) => {
      res[key] = obj[key];
      return res;
    }, {});
