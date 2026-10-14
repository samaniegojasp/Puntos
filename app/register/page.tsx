"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Eye, EyeOff, Gift } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isAdult, maskDocument, validateDocument } from "@/lib/domain/documento"
import { DOC_TYPE_LABEL, type DocType } from "@/lib/domain/types"

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Documento y fecha de nacimiento
  const [docType, setDocType] = useState<DocType>("cedula")
  const [docNumber, setDocNumber] = useState("")
  const [docError, setDocError] = useState<string | null>(null)

  const [birthDate, setBirthDate] = useState("")
  const [birthDateError, setBirthDateError] = useState<string | null>(null)

  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Validación de documento al salir del campo
  const handleDocBlur = () => {
    if (!docNumber.trim()) {
      setDocError("Ingresa el número de documento.")
      return
    }
    const res = validateDocument(docType, docNumber)
    setDocError(res.ok ? null : res.error)
  }

  // Validación de fecha de nacimiento al cambiar o salir
  const handleBirthDateChange = (val: string) => {
    setBirthDate(val)
    if (val) {
      if (!isAdult(val)) {
        setBirthDateError("Debes ser mayor de 18 años para registrarte.")
      } else {
        setBirthDateError(null)
      }
    } else {
      setBirthDateError(null)
    }
  }

  // Comprobar validez global para habilitar el botón
  const isDocValid = docNumber.trim().length > 0 && validateDocument(docType, docNumber).ok
  const isBirthDateValid = Boolean(birthDate && isAdult(birthDate))
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const isPasswordValid = password.length >= 8
  const isNameValid = firstName.trim().length > 0 && lastName.trim().length > 0

  const canSubmit =
    isNameValid &&
    isEmailValid &&
    isPasswordValid &&
    isDocValid &&
    isBirthDateValid &&
    termsAccepted

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validación final
    const docCheck = validateDocument(docType, docNumber)
    if (!docCheck.ok) {
      setDocError(docCheck.error)
      return
    }
    if (!birthDate || !isAdult(birthDate)) {
      setBirthDateError("Debes ser mayor de 18 años para registrarte.")
      return
    }
    if (!termsAccepted) return

    setSubmitted(true)
  }

  const handleReset = () => {
    setFirstName("")
    setLastName("")
    setEmail("")
    setPassword("")
    setDocType("cedula")
    setDocNumber("")
    setDocError(null)
    setBirthDate("")
    setBirthDateError(null)
    setTermsAccepted(false)
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className="container max-w-md mx-auto px-4 py-8 md:px-6 md:py-12">
        <Card>
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">¡Registro exitoso!</CardTitle>
            <CardDescription>
              Tus datos han sido procesados en el simulador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-center text-sm font-semibold text-amber-900 dark:text-amber-200">
              Prototipo: no se creó ninguna cuenta
            </div>

            <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-semibold text-foreground">
                  {firstName} {lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Documento:</span>
                <span className="font-mono font-semibold text-foreground">
                  {DOC_TYPE_LABEL[docType]} · {maskDocument(docNumber)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Correo:</span>
                <span className="font-medium text-foreground">{email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha de nacimiento:</span>
                <span className="font-medium text-foreground">{birthDate}</span>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              En esta demo cuentas con 500 Puntos asignados a tu saldo simulado.
            </p>

            <div className="space-y-2 pt-2">
              <Button asChild className="w-full" size="lg">
                <Link href="/login">Ir a iniciar sesión</Link>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                type="button"
                onClick={handleReset}
              >
                Registrar otro usuario
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12 max-w-md mx-auto">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Gift className="h-6 w-6" />
            </span>
          </div>
          <CardTitle className="text-2xl text-center">Crea tu cuenta</CardTitle>
          <CardDescription className="text-center">Ingresa tus datos para registrarte</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl bg-muted/60 p-3 text-center text-sm text-muted-foreground border">
              Demostración: el registro aún no crea cuentas.
            </div>
            <div className="rounded-xl bg-primary/10 p-3 text-center text-sm font-medium text-primary">
              En esta demo, todos parten con 500 Puntos de bienvenida
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">Nombre</Label>
                <Input
                  id="first-name"
                  placeholder="Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Apellido</Label>
                <Input
                  id="last-name"
                  placeholder="Pérez"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Tipo de Documento y Número de Documento */}
            <div className="space-y-2">
              <Label htmlFor="doc-type">Tipo de documento</Label>
              <Select
                value={docType}
                onValueChange={(val: DocType) => {
                  setDocType(val)
                  if (docNumber.trim()) {
                    const res = validateDocument(val, docNumber)
                    setDocError(res.ok ? null : res.error)
                  }
                }}
              >
                <SelectTrigger id="doc-type">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOC_TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-number">Número de documento</Label>
              <Input
                id="doc-number"
                placeholder={docType === "cedula" ? "10 dígitos" : docType === "ruc" ? "13 dígitos" : "Pasaporte"}
                value={docNumber}
                onChange={(e) => {
                  setDocNumber(e.target.value)
                  if (docError) setDocError(null)
                }}
                onBlur={handleDocBlur}
                className={docError ? "border-destructive focus-visible:ring-destructive" : ""}
                required
              />
              {docError && (
                <p className="text-xs text-destructive">{docError}</p>
              )}
            </div>

            {/* Fecha de nacimiento */}
            <div className="space-y-2">
              <Label htmlFor="birth-date">Fecha de nacimiento</Label>
              <Input
                id="birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => handleBirthDateChange(e.target.value)}
                className={birthDateError ? "border-destructive focus-visible:ring-destructive" : ""}
                required
              />
              {birthDateError && (
                <p className="text-xs text-destructive">{birthDateError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  </span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                La contraseña debe tener al menos 8 caracteres.
              </p>
            </div>

            {/* Casilla obligatoria de declaración legal */}
            <div className="flex items-start space-x-2 pt-1">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(Boolean(checked))}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm font-normal leading-relaxed">
                Declaro ser mayor de 18 años y acepto los{" "}
                <Link href="/terminos" className="text-primary hover:underline font-medium">
                  Términos y Condiciones
                </Link>{" "}
                y la{" "}
                <Link href="/privacidad" className="text-primary hover:underline font-medium">
                  Política de Privacidad
                </Link>
              </Label>
            </div>

            <Button className="w-full" size="lg" type="submit" disabled={!canSubmit}>
              Crear cuenta
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
