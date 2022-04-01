import { createContext, ReactNode, useContext, useState } from 'react';
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

  const addProduct = async (productId: number) => {
    try {
      const updateCart = [...cart]
      const existProduct = updateCart.find(product => product.id === productId)

      if (existProduct) {

        const stock = await api.get(`stock/${productId}`)
        const isStockAvailable = stock.data.amount >= existProduct.amount + 1

        if (isStockAvailable) {
          existProduct.amount += 1
          setCart(updateCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }

      } else {
        await api.get(`products/${productId}`).then(response => {
          const productResponse: Product = response.data;

          const newProduct: Product = {
            id: productResponse.id,
            title: productResponse.title,
            price: productResponse.price,
            image: productResponse.image,
            amount: 1,
          }

          return newProduct
        }).then(newProduct => {
          const newCart = [
            newProduct
            , ...cart]
          setCart(newCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        })
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existProduct = cart.find(product => product.id === productId)

      if (!existProduct) {
        throw Error();
      }
      const updateCart = cart.filter(product => product.id !== productId)
      setCart(updateCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount < 1)
        return

      const updateCart = [...cart]
      const existProduct = updateCart.find(product => product.id === productId)
      if (!existProduct) {
        throw Error();
      }

      const stock = await api.get(`stock/${productId}`)
      const isStockAvailable = stock.data.amount >= amount

      if (isStockAvailable) {
        existProduct.amount = amount
        setCart(updateCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
