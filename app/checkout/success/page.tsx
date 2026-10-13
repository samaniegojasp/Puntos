import Link from "next/link"
import { Check, Package, Truck, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"

export default function OrderSuccessPage() {
  const orderNumber = "PD-12345678"
  const orderDate = new Date().toLocaleDateString()
  const estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground">
          Thank you for your purchase. Your order has been received and is being processed.
        </p>
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">Order #{orderNumber}</h2>
                <p className="text-sm text-muted-foreground">Placed on {orderDate}</p>
              </div>
              <Button asChild>
                <Link href="/account/orders">View Order Details</Link>
              </Button>
            </div>

            <Separator />

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Package className="h-5 w-5" />
                </div>
                <h3 className="font-medium">Processing</h3>
                <p className="text-xs text-muted-foreground">Your order is being prepared</p>
              </div>

              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <h3 className="font-medium">Shipping</h3>
                <p className="text-xs text-muted-foreground">You'll receive tracking info soon</p>
              </div>

              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="font-medium">Estimated Delivery</h3>
                <p className="text-xs text-muted-foreground">{estimatedDelivery}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">What's Next?</h2>
        <p className="text-muted-foreground">
          You will receive an email confirmation with your order details and tracking information once your order ships.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button asChild>
            <Link href="/shop">Continue Shopping</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">Need Help?</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
