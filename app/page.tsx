"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Heart, Search, ChevronDown, Globe, User, Menu, X, Star, TruckIcon, ShieldCheck, Clock, CreditCard } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const featuredProducts = [
    {
      id: 1,
      name: "Premium Dog Food",
      image:
        "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 49.99,
      offerPrice: 39.99,
      category: "Food",
    },
    {
      id: 2,
      name: "Comfortable Dog Bed",
      image:
        "https://images.unsplash.com/photo-1541599468348-e96984315921?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 89.99,
      offerPrice: 69.99,
      category: "Accessories",
    },
    {
      id: 3,
      name: "Interactive Dog Toy",
      image:
        "https://images.unsplash.com/photo-1575425186775-b8de9a427e67?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 24.99,
      offerPrice: 19.99,
      category: "Toys",
    },
    {
      id: 4,
      name: "Dog Grooming Kit",
      image:
        "https://images.unsplash.com/photo-1607734834519-d8576ae60ea6?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 34.99,
      offerPrice: 29.99,
      category: "Grooming",
    },
  ]

  const testimonials = [
    {
      id: 1,
      name: "Sarah Johnson",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3",
      rating: 5,
      text: "My dog absolutely loves the premium food I purchased from PetDo. The quality is exceptional and delivery was super fast!",
    },
    {
      id: 2,
      name: "Michael Brown",
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3",
      rating: 5,
      text: "The dog bed I bought is amazing quality. My furry friend hasn't left it since it arrived. Great customer service too!",
    },
    {
      id: 3,
      name: "Emily Davis",
      image:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961&auto=format&fit=crop&ixlib=rb-4.0.3",
      rating: 4,
      text: "The interactive toys keep my puppy entertained for hours. Definitely coming back for more products!",
    },
  ]

  return (
    <main className="flex-1">
      {/* Hero Banner */}
      <section className="relative">
        <div className="container px-4 py-12 md:px-6 md:py-24 lg:py-32">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                Everything Your Dog Needs in One Place
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                Premium quality products for your furry friends. From nutritious food to comfortable accessories.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="font-medium" asChild>
                  <Link href="/shop">Shop Now</Link>
                </Button>
                <Button size="lg" variant="outline" className="font-medium">
                  View Deals
                </Button>
              </div>
            </div>
            <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] rounded-xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3"
                alt="Happy dog"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="bg-muted py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-8 md:text-3xl">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {["Food", "Accessories", "Toys", "Grooming"].map((category, index) => {
              const categoryImages = [
                "https://images.unsplash.com/photo-1585846888147-3fe14c130048?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3", // Food
                "https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3", // Accessories
                "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3", // Toys
                "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3", // Grooming
              ]
              return (
                <Link
                  key={category}
                  href={`/category/${category.toLowerCase()}`}
                  className="group relative overflow-hidden rounded-lg bg-background shadow-md transition-all hover:shadow-lg"
                >
                  <div className="aspect-square relative">
                    <Image
                      src={categoryImages[index] || "/placeholder.svg"}
                      alt={category}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 w-full p-4">
                      <h3 className="text-lg font-semibold text-white">{category}</h3>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-8 md:text-3xl">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <div key={product.id} className="group relative">
                <div className="aspect-square overflow-hidden rounded-lg bg-background">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    width={300}
                    height={300}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Heart className="h-4 w-4" />
                      <span className="sr-only">Add to wishlist</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Search className="h-4 w-4" />
                      <span className="sr-only">Quick view</span>
                    </Button>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <Button className="mx-auto">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Cart
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-center">
                  <Badge variant="outline" className="mb-2">
                    {product.category}
                  </Badge>
                  <h3 className="font-medium">{product.name}</h3>
                  <div className="flex justify-center gap-2">
                    <span className="text-muted-foreground line-through">${product.price.toFixed(2)}</span>
                    <span className="font-medium text-primary">${product.offerPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button variant="outline" size="lg" asChild>
              <Link href="/shop">View All Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Our Store */}
      <section className="bg-muted py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-8 md:text-3xl">Why Choose PetDo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-background">
              <CardContent className="flex flex-col items-center text-center p-6">
                <TruckIcon className="h-10 w-10 mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Free Shipping</h3>
                <p className="text-muted-foreground">
                  On orders over $50. Get your pet supplies delivered to your doorstep.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="flex flex-col items-center text-center p-6">
                <ShieldCheck className="h-10 w-10 mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Quality Guarantee</h3>
                <p className="text-muted-foreground">
                  All our products are carefully selected for quality and safety.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="flex flex-col items-center text-center p-6">
                <Clock className="h-10 w-10 mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">24/7 Support</h3>
                <p className="text-muted-foreground">
                  Our customer service team is available around the clock to help you.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-background">
              <CardContent className="flex flex-col items-center text-center p-6">
                <CreditCard className="h-10 w-10 mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Secure Payment</h3>
                <p className="text-muted-foreground">
                  Multiple secure payment options for your convenience and safety.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-8 md:text-3xl">What Our Customers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="bg-background">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Image
                      src={testimonial.image || "/placeholder.svg"}
                      alt={testimonial.name}
                      width={50}
                      height={50}
                      className="rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold">{testimonial.name}</h3>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < testimonial.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{testimonial.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-primary text-primary-foreground py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Join Our Newsletter</h2>
            <p className="max-w-[600px] text-primary-foreground/90 md:text-lg">
              Subscribe to get special offers, free giveaways, and pet care tips.
            </p>
            <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
              <Input type="email" placeholder="Enter your email" className="bg-primary-foreground text-foreground" />
              <Button variant="secondary">Subscribe</Button>
            </div>
            <p className="text-xs text-primary-foreground/70">
              By subscribing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
