import Image from "next/image"
import Link from "next/link"
import { Heart, Award, Users, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function AboutPage() {
  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">About PetDo</h1>
        <div className="flex items-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>About</span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="grid md:grid-cols-2 gap-8 items-center mb-16">
        <div>
          <h2 className="text-3xl font-bold mb-4">Our Story</h2>
          <p className="text-muted-foreground mb-4">
            Founded in 2015, PetDo started with a simple mission: to provide high-quality products for pets and make pet
            parenting easier and more enjoyable.
          </p>
          <p className="text-muted-foreground mb-4">
            What began as a small local shop has grown into a trusted online destination for pet lovers across the
            country. Our founder, Sarah Johnson, a passionate dog owner, recognized the need for premium pet products
            that prioritize both quality and affordability.
          </p>
          <p className="text-muted-foreground">
            Today, we continue to be guided by our love for animals and commitment to exceptional customer service.
            Every product in our catalog is carefully selected to ensure it meets our high standards for quality,
            safety, and value.
          </p>
        </div>
        <div className="relative h-[300px] md:h-[400px] rounded-lg overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3"
            alt="PetDo team with dogs"
            fill
            className="object-cover"
          />
        </div>
      </div>

      {/* Values Section */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-4">Our Values</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            At PetDo, our core values guide everything we do, from product selection to customer service.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card rounded-lg border p-6 text-center">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
              <Heart className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Pet Wellbeing</h3>
            <p className="text-muted-foreground">
              We prioritize products that contribute to the health, happiness, and wellbeing of your pets.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6 text-center">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Quality Assurance</h3>
            <p className="text-muted-foreground">
              We rigorously test and verify all products to ensure they meet our high standards for quality and safety.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6 text-center">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Customer Focus</h3>
            <p className="text-muted-foreground">
              We're dedicated to providing exceptional service and building lasting relationships with our customers.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6 text-center">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Reliability</h3>
            <p className="text-muted-foreground">
              We deliver on our promises with fast shipping, accurate orders, and responsive customer support.
            </p>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-4">Meet Our Team</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The passionate people behind PetDo who work tirelessly to bring the best products to you and your pets.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              name: "Sarah Johnson",
              role: "Founder & CEO",
              image:
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3",
            },
            {
              name: "Michael Chen",
              role: "Head of Product",
              image:
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3",
            },
            {
              name: "Emily Rodriguez",
              role: "Customer Experience",
              image:
                "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961&auto=format&fit=crop&ixlib=rb-4.0.3",
            },
            {
              name: "David Kim",
              role: "Logistics Manager",
              image:
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3",
            },
          ].map((member, index) => (
            <div key={index} className="bg-card rounded-lg border overflow-hidden">
              <div className="relative h-64 w-full">
                <Image src={member.image || "/placeholder.svg"} alt={member.name} fill className="object-cover" />
              </div>
              <div className="p-4 text-center">
                <h3 className="font-semibold text-lg">{member.name}</h3>
                <p className="text-muted-foreground">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground rounded-lg p-8 md:p-12 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Join the PetDo Family</h2>
        <p className="max-w-2xl mx-auto mb-6">
          Discover premium products for your furry friends and join thousands of satisfied pet parents who trust PetDo.
        </p>
        <Button size="lg" variant="secondary" asChild>
          <Link href="/shop">Shop Now</Link>
        </Button>
      </div>
    </div>
  )
}
