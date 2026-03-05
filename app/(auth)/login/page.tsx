"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  age: z.coerce
    .number({ invalid_type_error: "Age is required" })
    .int("Age must be an integer")
    .min(13, "Age must be at least 13")
    .max(120, "Age must be realistic"),
  gender: z.enum(["Male", "Female", "Other"], { required_error: "Gender is required" }),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [loginValues, setLoginValues] = React.useState<LoginValues>({ username: "", password: "" });
  const [registerValues, setRegisterValues] = React.useState<RegisterValues>({
    username: "",
    password: "",
    age: 25,
    gender: "Male",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    try {
      setLoading(true);
      if (mode === "login") {
        const parsed = loginSchema.safeParse(loginValues);
        if (!parsed.success) {
          const fieldErrors: Record<string, string> = {};
          for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) {
            if (value && value[0]) fieldErrors[key] = value[0];
          }
          setErrors(fieldErrors);
          return;
        }

        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFormError(body.error || "Unable to login. Please try again.");
          return;
        }

        router.push("/dashboard");
        router.refresh();
      } else {
        const parsed = registerSchema.safeParse(registerValues);
        if (!parsed.success) {
          const fieldErrors: Record<string, string> = {};
          for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) {
            if (value && value[0]) fieldErrors[key] = value[0];
          }
          setErrors(fieldErrors);
          return;
        }

        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFormError(body.error || "Unable to register. Please try again.");
          return;
        }

        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-center text-2xl font-semibold text-slate-900">
          {mode === "login" ? "Welcome back" : "Create an account"}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Product analytics dashboard that visualizes its own usage.
        </p>

        <div className="mt-6 flex rounded-full bg-slate-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrors({});
              setFormError(null);
            }}
            className={`flex-1 rounded-full px-3 py-2 ${
              mode === "login" ? "bg-white text-slate-900 shadow" : "text-slate-500"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrors({});
              setFormError(null);
            }}
            className={`flex-1 rounded-full px-3 py-2 ${
              mode === "register" ? "bg-white text-slate-900 shadow" : "text-slate-500"
            }`}
          >
            Register
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label="Username"
            autoComplete="username"
            value={mode === "login" ? loginValues.username : registerValues.username}
            onChange={(e) =>
              mode === "login"
                ? setLoginValues((v) => ({ ...v, username: e.target.value }))
                : setRegisterValues((v) => ({ ...v, username: e.target.value }))
            }
            error={errors.username}
          />
          <Input
            label="Password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={mode === "login" ? loginValues.password : registerValues.password}
            onChange={(e) =>
              mode === "login"
                ? setLoginValues((v) => ({ ...v, password: e.target.value }))
                : setRegisterValues((v) => ({ ...v, password: e.target.value }))
            }
            error={errors.password}
          />

          {mode === "register" && (
            <>
              <Input
                label="Age"
                type="number"
                min={13}
                max={120}
                value={registerValues.age}
                onChange={(e) =>
                  setRegisterValues((v) => ({ ...v, age: Number(e.target.value || 0) }))
                }
                error={errors.age}
              />
              <Select
                label="Gender"
                value={registerValues.gender}
                onChange={(e) =>
                  setRegisterValues((v) => ({ ...v, gender: e.target.value as any }))
                }
                error={errors.gender}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </>
          )}

          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <Button type="submit" className="mt-2 w-full" loading={loading}>
            {mode === "login" ? "Login" : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}


