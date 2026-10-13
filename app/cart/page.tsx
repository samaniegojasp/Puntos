"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2, ArrowRight } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"

export default function CartPage() {
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "Premium Dog Food",
      image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 39.99,
      quantity: 2,
    },
    {
      id: 2,
      name: "Comfortable Dog Bed",
      image: "https://images.unsplash.com/photo-1541599468348-e96984315921?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 69.99,
      quantity: 1,
    },
    {
      id: 3,
      name: "Interactive Dog Toy",
      image: "https://images.unsplash.com/photo-1575425186775-b8de9a427e67?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 19.99,
      quantity: 3,
    },
  ])

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) return
    setCartItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item)))
  }

  const removeItem = (id: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = 5.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
        <div className="flex items-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>Cart</span>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">
            {"Looks like you haven't added any products to your cart yet."}
          </p>
          <Button asChild>
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="rounded-lg border bg-card">
              <div className="p-6">
                <div className="hidden md:grid grid-cols-12 gap-4 pb-4 text-sm font-medium text-muted-foreground">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>
                <Separator />
                {cartItems.map((item, index) => (
                  <div key={item.id}>
                    <div className="py-6">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="col-span-6 flex items-center gap-4">
                          <div className="relative h-20 w-20 rounded-md overflow-hidden">
                            <Image 
                              src={item.image || "/placeholder.svg"} 
                              alt={item.name} 
                              fill 
                              className="object-cover" 
                            />
                          </div>
                          <div>
                            <h3 className="font-medium">{item.name}</h3>
                            <p className="text-sm text-muted-foreground md:hidden">
                              ${item.price.toFixed(2)}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1 h-auto p-0 text-sm text-destructive hover:text-destructive/80 md:hidden"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Remove
                            </Button>
                          </div>
                        </div>
                        <div className="col-span-2 text-center hidden md:block">
                          ${item.price.toFixed(2)}
                        </div>
                        <div className="col-span-2 flex items-center justify-center">
                          <div className="flex items-center border rounded-md">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-none"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                              <span className="sr-only">Decrease</span>
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-none"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                              <span className="sr-only">Increase</span>
                            </Button>
                          </div>
                        </div>
                        <div className="col-span-2 text-right flex items-center justify-between md:justify-end">
                          <span className="font-medium">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/80 hidden md:inline-flex"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    {index < cartItems.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between bg-muted p-6 rounded-b-lg">
                <Button variant="outline" asChild>
                  <Link href="/shop">Continue Shopping</Link>
                </Button>
                <Button variant="ghost" onClick={() => setCartItems([])}>
                  Clear Cart
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>${shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>

                  <div className="pt-4">
                    <Button className="w-full" size="lg" asChild>
                      <Link href="/checkout">
                        Proceed to Checkout
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="pt-4 space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center">
                        <Input type="text" placeholder="Coupon code" className="rounded-r-none" />
                        <Button className="rounded-l-none">Apply</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
