export const buildOffsetMeta = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

export const buildCursorMeta = <T extends { id: string }>(
  items: T[],
  limit: number,
) => {
  const hasNext = items.length > limit;
  
  return {
    limit,
    nextCursor: hasNext ? items[items.length - 1].id : null,
  };
};
