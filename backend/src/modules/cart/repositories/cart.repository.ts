export interface CartRepository {
  getAll(userId: string): Promise<Record<string, string>>;

  get(userId: string, productId: string): Promise<string | null>;

  increment(userId: string, productId: string, quantity: number): Promise<void>;

  set(userId: string, productId: string, quantity: number): Promise<void>;

  exists(userId: string, productId: string): Promise<number>;

  remove(userId: string, productId: string): Promise<void>;

  clear(userId: string): Promise<void>;

  setTTL(userId: string): Promise<void>;
}
