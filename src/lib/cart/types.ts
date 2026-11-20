export type CartItem = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  selectedOptions?: string | null;
  maxStock: number | null; // null = illimité
};

export type CartState = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
};
