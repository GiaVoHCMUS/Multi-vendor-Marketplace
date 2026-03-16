export const buildOffsetMeta = (page: number, limit: number, total: number) => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const buildCursorMeta = <T extends { id: string }>(
  items: T[],
  limit: number,
) => {
  const hasNext = items.length === limit;

  return {
    limit,
    nextCursor: hasNext ? items[items.length - 1].id : null,
  };
};