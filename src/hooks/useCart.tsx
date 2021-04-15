import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = window.localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get(`stock/${productId}`);

      const productStock: Stock = stockResponse.data;

      const productIsAlreadyOnCart = cart.find(
        (product) => product.id === productId
      );

      const amountProductOnCart = productIsAlreadyOnCart
        ? productIsAlreadyOnCart.amount + 1
        : 1;

      const productHasStock = productStock.amount >= amountProductOnCart;

      if (!productHasStock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productIsAlreadyOnCart) {
        const newCart = cart.map((product) => {
          if (product.id === productId) {
            product.amount += 1;
          }

          return product;
        });

        window.localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(newCart)
        );

        setCart(newCart);

        return;
      }

      const productsListResponse = await api.get(`products/${productId}`);

      const ptoductDetail: Product = productsListResponse.data;

      if (ptoductDetail) {
        const newCart = [...cart, { ...ptoductDetail, amount: 1 }];

        window.localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(newCart)
        );
        setCart(newCart);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIsAlreadyOnCart = cart.find(
        (product) => product.id === productId
      );

      if (!productIsAlreadyOnCart)
        throw new Error("Produto não está no carrinho");

      const productHasMoreThanOneUnit = productIsAlreadyOnCart
        ? productIsAlreadyOnCart.amount > 1
        : false;

      if (productHasMoreThanOneUnit) {
        const newCart = cart.map((product) => {
          if (product.id === productId) {
            product.amount -= 1;
          }

          return product;
        });

        window.localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(newCart)
        );

        setCart(newCart);

        return;
      }

      const newCart = cart.filter((product) => product.id !== productId);

      window.localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stockResponse = await api.get(`stock/${productId}`);

      const productStock: Stock = stockResponse.data;

      const productHasStock = productStock.amount >= amount;

      if (!productHasStock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = cart.map((product) => {
        if (product.id === productId) {
          product.amount = amount;
        }

        return product;
      });

      window.localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      setCart(newCart);
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
