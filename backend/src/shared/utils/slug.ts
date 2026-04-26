import { randomUUID } from 'crypto';
import slugify from 'slugify';

export const slugHelper = {
  generate: (text: string) => {
    const base = slugify(text, {
      lower: true,
      strict: true,
      locale: 'vi',
      trim: true,
    });

    const suffix = randomUUID().slice(0, 6);

    return `${base}-${suffix}`;
  },
};
