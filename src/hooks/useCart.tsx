import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();
  useEffect(() => {
    prevCartRef.current = cart;
  });
  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const stok = await api.get(`stock/${productId}`).then((response) => response.data as Stock)

      const existingProduct = cart.find((element) => { return element.id === productId })

      if (existingProduct) {
        if ((existingProduct.amount + 1) <= stok.amount) {
          const newCart = cart.map((element) => {
            if (element.id === existingProduct.id) {
              return { ...existingProduct, amount: element.amount + 1 }
            } else {
              return element
            }
          })
          setCart(newCart)
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }

      } else {

        const product = await api.get(`products/${productId}`).then((response) => response.data as Product)

        if ((product.amount || 0 + 1) <= stok.amount) {
          setCart([...cart, { ...product, amount: 1 }])
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find((p) => p.id === productId)
      if (product) {

        const newCart = cart.filter((product) => {
          return product.id !== productId;
        })

        setCart(newCart);
      } else {
        throw new Error("Erro na remoção do produto");

      }

    } catch {
      toast.error("Erro na remoção do produto")
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0) {
        return
      }

      const stock = await api.get(`/stock/${productId}`,).then((response) => response.data as Stock)
      const product = cart.find((item) => item.id === productId)

      if (product) {
        const newCart = cart.map((product) => {
          if (product.id === productId) {

            if (amount > 0) {

              if (amount > stock.amount) {
                toast.error("Quantidade solicitada fora de estoque");
              } else {
                product.amount = amount;
              }
            }
          }

          return product;
        })

        setCart(newCart);
      } else {
        toast.error("Erro na alteração de quantidade do produto");
      }


    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
