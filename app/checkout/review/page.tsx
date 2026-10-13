"use client"
import Image from "next/image"
import Link from "next/link"
import { CreditCard, Edit2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"

export default function ReviewOrderPage() {
  const cartItems = [
    {
      id: 1,
      name: "Premium Dog Food",
      image:
        "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 39.99,
      quantity: 2,
    },
    {
      id: 2,
      name: "Comfortable Dog Bed",
      image:
        "https://images.unsplash.com/photo-1541599468348-e96984315921?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 69.99,
      quantity: 1,
    },
    {
      id: 3,
      name: "Interactive Dog Toy",
      image:
        "https://images.unsplash.com/photo-1575425186775-b8de9a427e67?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 19.99,
      quantity: 3,
    },
  ]

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = 5.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  const shippingInfo = {
    name: "John Doe",
    address: "123 Main St, Apt 4B",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "United States",
    email: "john.doe@example.com",
    phone: "(123) 456-7890",
  }

  const paymentInfo = {
    method: "Credit Card",
    cardNumber: "**** **** **** 4242",
    expiry: "12/25",
    nameOnCard: "John Doe",
  }

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Review Your Order</h1>
        <div className="flex items-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/cart" className="hover:text-primary">
            Cart
          </Link>
          <span className="mx-2">/</span>
          <Link href="/checkout" className="hover:text-primary">
            Checkout
          </Link>
          <span className="mx-2">/</span>
          <span>Review</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Shipping Information */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Shipping Information</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/checkout" className="flex items-center gap-1 text-primary">
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Contact Information</h3>
                <p className="text-sm">{shippingInfo.email}</p>
                <p className="text-sm">{shippingInfo.phone}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Shipping Address</h3>
                <p className="text-sm">{shippingInfo.name}</p>
                <p className="text-sm">{shippingInfo.address}</p>
                <p className="text-sm">
                  {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}
                </p>
                <p className="text-sm">{shippingInfo.country}</p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Payment Method</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/checkout" className="flex items-center gap-1 text-primary">
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5" />
              <div>
                <p className="font-medium">{paymentInfo.method}</p>
                <p className="text-sm text-muted-foreground">
                  {paymentInfo.cardNumber} | Expires: {paymentInfo.expiry}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Order Items</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/cart" className="flex items-center gap-1 text-primary">
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </div>
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative h-20 w-20 rounded-md overflow-hidden flex-shrink-0">
                    <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="sticky top-20">
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
                      <Link href="/checkout/success">Place Order</Link>
                    </Button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground pt-4">
                    By placing your order, you agree to our{" "}
                    <Link href="#" className="underline hover:text-primary">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="#" className="underline hover:text-primary">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
