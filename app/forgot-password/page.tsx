import Link from "next/link"
import { Gift } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function ForgotPasswordPage() {
  return (
    <div className="container px-4 py-8 md:px-6 md:py-12 max-w-md mx-auto">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Gift className="h-6 w-6" />
            </span>
          </div>
          <CardTitle className="text-2xl text-center">¿Olvidaste tu contraseña?</CardTitle>
          <CardDescription className="text-center">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" placeholder="nombre@correo.com" />
          </div>
          <Button className="w-full" size="lg">
            Enviar enlace de recuperación
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col">
          <p className="text-center text-sm text-muted-foreground">
            ¿Recordaste tu contraseña?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
