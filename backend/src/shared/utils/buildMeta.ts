export const buildOffsetMeta = ({
  totalItems,
  page,
  limit,
}: {
  totalItems: number;
  page: number;
  limit: number;
}) => {
  return {
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
    currentPage: page,
    limit,
  };
};

export const buildCursorMeta = <T>({
  data,
  limit,
  cursorField,
}: {
  data: T[];
  limit: number;
  cursorField: keyof T;
}) => {
  const hasNext = data.length > limit;

  const nextCursor = hasNext
    ? (data[data.length - 1] as any)[cursorField]
    : null;

  return {
    nextCursor,
    hasNext,
    limit,
  };
};
