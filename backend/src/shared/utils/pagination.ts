type PaginationQuery = {
  page?: number;
  limit?: number;
  cursor?: string;
};

export const buildPagination = (query: PaginationQuery) => {
  const limit = query.limit ?? 10;

  if (query.cursor) {
    return {
      skip: 1,
      take: limit,
      cursor: {
        id: query.cursor,
      },
      type: 'cursor',
    };
  }

  const page = query.page ?? 1;

  return {
    skip: (page - 1) * limit,
    take: limit,
    type: 'offset',
    page,
  };
};
