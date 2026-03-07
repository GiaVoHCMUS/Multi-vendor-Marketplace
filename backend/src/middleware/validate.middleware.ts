import { Request, Response, NextFunction } from 'express';
import { ZodObject } from 'zod';
import { catchAsync } from '@/utils/catchAsync';
import { ParsedQs } from 'qs';
import { ParamsDictionary } from 'express-serve-static-core';

export const validate = (schema: ZodObject) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    Object.defineProperty(req, 'query', {
      ...Object.getOwnPropertyDescriptor(req, 'query'),
      value: req.query,
      writable: true,
    });
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    req.body = parsed.body;
    req.query = parsed.query as ParsedQs;
    req.params = parsed.params as ParamsDictionary;

    next();
  });
