"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Heart, Search, ChevronDown, Filter, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export default function ShopPage() {
  const [priceRange, setPriceRange] = useState([0, 100])
  const [selectedFilters, setSelectedFilters] = useState({
    categories: [],
    brands: [],
    ratings: [],
  })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const products = [
    {
      id: 1,
      name: "Premium Dog Food",
      image:
        "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 49.99,
      offerPrice: 39.99,
      category: "Food",
      brand: "PetNutrition",
      rating: 5,
    },
    {
      id: 2,
      name: "Comfortable Dog Bed",
      image:
        "https://images.unsplash.com/photo-1541599468348-e96984315921?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 89.99,
      offerPrice: 69.99,
      category: "Accessories",
      brand: "ComfyPets",
      rating: 4,
    },
    {
      id: 3,
      name: "Interactive Dog Toy",
      image:
        "https://images.unsplash.com/photo-1575425186775-b8de9a427e67?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 24.99,
      offerPrice: 19.99,
      category: "Toys",
      brand: "PlayfulPaws",
      rating: 5,
    },
    {
      id: 4,
      name: "Dog Grooming Kit",
      image:
        "https://images.unsplash.com/photo-1607734834519-d8576ae60ea6?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 34.99,
      offerPrice: 29.99,
      category: "Grooming",
      brand: "GroomPro",
      rating: 4,
    },
    {
      id: 5,
      name: "Organic Dog Treats",
      image:
        "https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?q=80&w=2073&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 19.99,
      offerPrice: 15.99,
      category: "Food",
      brand: "PetNutrition",
      rating: 5,
    },
    {
      id: 6,
      name: "Dog Collar with Name Tag",
      image:
        "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 14.99,
      offerPrice: 12.99,
      category: "Accessories",
      brand: "PetStyle",
      rating: 4,
    },
    {
      id: 7,
      name: "Dental Chew Toys",
      image:
        "https://images.unsplash.com/photo-1591946614720-90a587da4a36?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 9.99,
      offerPrice: 7.99,
      category: "Toys",
      brand: "DentalPet",
      rating: 3,
    },
    {
      id: 8,
      name: "Dog Shampoo",
      image:
        "https://images.unsplash.com/photo-1583511655826-05700442982d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3",
      price: 12.99,
      offerPrice: 10.99,
      category: "Grooming",
      brand: "GroomPro",
      rating: 4,
    },
  ]

  const toggleFilter = (type, value) => {
    setSelectedFilters((prev) => {
      const current = [...prev[type]]
      const index = current.indexOf(value)

      if (index === -1) {
        current.push(value)
      } else {
        current.splice(index, 1)
      }

      return {
        ...prev,
        [type]: current,
      }
    })
  }

  const clearFilters = () => {
    setSelectedFilters({
      categories: [],
      brands: [],
      ratings: [],
    })
    setPriceRange([0, 100])
  }

  const FilterSidebar = ({ isMobile = false }) => (
    <div className={`space-y-6 ${isMobile ? "" : "sticky top-20"}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg">Filters</h3>
        {(selectedFilters.categories.length > 0 ||
          selectedFilters.brands.length > 0 ||
          selectedFilters.ratings.length > 0 ||
          priceRange[0] > 0 ||
          priceRange[1] < 100) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs text-primary hover:text-primary/80"
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <Accordion type="single" collapsible defaultValue="categories">
          <AccordionItem value="categories">
            <AccordionTrigger>Categories</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {["Food", "Accessories", "Toys", "Grooming"].map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={selectedFilters.categories.includes(category)}
                      onCheckedChange={() => toggleFilter("categories", category)}
                    />
                    <Label htmlFor={`category-${category}`} className="text-sm font-normal cursor-pointer">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="price">
            <AccordionTrigger>Price Range</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 px-1">
                <Slider
                  defaultValue={[0, 100]}
                  max={100}
                  step={1}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  className="py-4"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm">${priceRange[0]}</span>
                  <span className="text-sm">${priceRange[1]}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="brands">
            <AccordionTrigger>Brands</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {["PetNutrition", "ComfyPets", "PlayfulPaws", "GroomPro", "PetStyle", "DentalPet"].map((brand) => (
                  <div key={brand} className="flex items-center space-x-2">
                    <Checkbox
                      id={`brand-${brand}`}
                      checked={selectedFilters.brands.includes(brand)}
                      onCheckedChange={() => toggleFilter("brands", brand)}
                    />
                    <Label htmlFor={`brand-${brand}`} className="text-sm font-normal cursor-pointer">
                      {brand}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ratings">
            <AccordionTrigger>Ratings</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rating-${rating}`}
                      checked={selectedFilters.ratings.includes(rating)}
                      onCheckedChange={() => toggleFilter("ratings", rating)}
                    />
                    <Label
                      htmlFor={`rating-${rating}`}
                      className="text-sm font-normal cursor-pointer flex items-center"
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={`h-4 w-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                      <span className="ml-1">& Up</span>
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )

  const filteredProducts = products.filter((product) => {
    // Filter by category
    if (selectedFilters.categories.length > 0 && !selectedFilters.categories.includes(product.category)) {
      return false
    }

    // Filter by brand
    if (selectedFilters.brands.length > 0 && !selectedFilters.brands.includes(product.brand)) {
      return false
    }

    // Filter by rating
    if (selectedFilters.ratings.length > 0 && !selectedFilters.ratings.some((r) => product.rating >= r)) {
      return false
    }

    // Filter by price
    if (product.price < priceRange[0] || product.price > priceRange[1]) {
      return false
    }

    return true
  })

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Shop All Products</h1>
        <div className="flex items-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>Shop</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters - Desktop */}
        <div className="hidden md:block w-64 shrink-0">
          <FilterSidebar />
        </div>

        {/* Filters - Mobile */}
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent side="left" className="w-full sm:max-w-md">
            <SheetHeader className="mb-4">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Narrow down your product search</SheetDescription>
            </SheetHeader>
            <FilterSidebar isMobile={true} />
          </SheetContent>
        </Sheet>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="md:hidden flex items-center gap-2"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>

              {/* Active filters */}
              <div className="flex flex-wrap gap-2">
                {selectedFilters.categories.map((category) => (
                  <Badge key={`cat-${category}`} variant="secondary" className="flex items-center gap-1">
                    {category}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter("categories", category)} />
                  </Badge>
                ))}
                {selectedFilters.brands.map((brand) => (
                  <Badge key={`brand-${brand}`} variant="secondary" className="flex items-center gap-1">
                    {brand}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter("brands", brand)} />
                  </Badge>
                ))}
                {(priceRange[0] > 0 || priceRange[1] < 100) && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    ${priceRange[0]} - ${priceRange[1]}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setPriceRange([0, 100])} />
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground hidden sm:inline">{filteredProducts.length} products</span>
              <Select defaultValue="featured">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="newest">Newest Arrivals</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your filters to find what you're looking for.</p>
              <Button onClick={clearFilters}>Clear all filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
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
                    <div className="flex justify-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={`h-4 w-4 ${i < product.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-center space-x-2 mt-12">
            <Button variant="outline" size="icon" disabled>
              <ChevronDown className="h-4 w-4 rotate-90" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              1
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              2
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              3
            </Button>
            <Button variant="outline" size="icon">
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
