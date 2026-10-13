"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CreditCard } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent } from "@/components/ui/card"

export default function CheckoutPage() {
  const [sameAsShipping, setSameAsShipping] = useState(true)

  // Replace cart item images with real dog product images
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

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Checkout</h1>
        <div className="flex items-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/cart" className="hover:text-primary">
            Cart
          </Link>
          <span className="mx-2">/</span>
          <span>Checkout</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Shipping Information */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Shipping Information</h2>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john.doe@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="(123) 456-7890" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123 Main St" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address2">Apartment, suite, etc. (optional)</Label>
                <Input id="address2" placeholder="Apt 4B" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="New York" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select defaultValue="NY">
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NY">New York</SelectItem>
                      <SelectItem value="CA">California</SelectItem>
                      <SelectItem value="TX">Texas</SelectItem>
                      <SelectItem value="FL">Florida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" placeholder="10001" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select defaultValue="US">
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Billing Information</h2>
              <div className="flex items-center space-x-2">
                <Checkbox id="same-as-shipping" checked={sameAsShipping} onCheckedChange={setSameAsShipping} />
                <Label htmlFor="same-as-shipping" className="text-sm font-normal">
                  Same as shipping address
                </Label>
              </div>
            </div>

            {!sameAsShipping && (
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billing-first-name">First Name</Label>
                    <Input id="billing-first-name" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing-last-name">Last Name</Label>
                    <Input id="billing-last-name" placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-address">Address</Label>
                  <Input id="billing-address" placeholder="123 Main St" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-address2">Apartment, suite, etc. (optional)</Label>
                  <Input id="billing-address2" placeholder="Apt 4B" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billing-city">City</Label>
                    <Input id="billing-city" placeholder="New York" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing-state">State</Label>
                    <Select defaultValue="NY">
                      <SelectTrigger id="billing-state">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NY">New York</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="TX">Texas</SelectItem>
                        <SelectItem value="FL">Florida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing-zip">ZIP Code</Label>
                    <Input id="billing-zip" placeholder="10001" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-country">Country</Label>
                  <Select defaultValue="US">
                    <SelectTrigger id="billing-country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
            <RadioGroup defaultValue="credit-card">
              <div className="flex items-center space-x-2 border rounded-md p-4 mb-3">
                <RadioGroupItem value="credit-card" id="credit-card" />
                <Label htmlFor="credit-card" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="h-5 w-5" />
                  Credit Card
                </Label>
              </div>

              <div className="grid gap-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input id="card-number" placeholder="1234 5678 9012 3456" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiration Date</Label>
                    <Input id="expiry" placeholder="MM/YY" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input id="cvv" placeholder="123" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name-on-card">Name on Card</Label>
                  <Input id="name-on-card" placeholder="John Doe" />
                </div>
              </div>

              <div className="flex items-center space-x-2 border rounded-md p-4 mt-3">
                <RadioGroupItem value="paypal" id="paypal" />
                <Label htmlFor="paypal" className="cursor-pointer">
                  PayPal
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Order Notes */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Order Notes (Optional)</h2>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Special instructions for delivery or any other information"
                className="min-h-[100px]"
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="sticky top-20">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

                <Accordion type="single" collapsible defaultValue="items">
                  <AccordionItem value="items" className="border-none">
                    <AccordionTrigger className="py-2">{cartItems.length} items</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        {cartItems.map((item) => (
                          <div key={item.id} className="flex gap-4">
                            <div className="relative h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                              <Image
                                src={item.image || "/placeholder.svg"}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs w-5 h-5 flex items-center justify-center rounded-full">
                                {item.quantity}
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                ${item.price.toFixed(2)} x {item.quantity}
                              </p>
                            </div>
                            <div className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Separator className="my-4" />

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
                      <Link href="/checkout/review">Review Order</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
