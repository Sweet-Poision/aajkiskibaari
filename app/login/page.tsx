"use client";

import { useTransition, useState } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { loginAction, registerAction } from "../actions";
import { useToast } from "../components/Toast";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const action = activeTab === "login" ? loginAction : registerAction;
        const result = await action(formData);
        if (result?.error) {
          setError(result.error);
        }
      } catch (err) {
        if (isRedirectError(err)) {
          throw err;
        }
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Machine panel sitting on the desk */}
      <div className="w-full max-w-md space-y-6 machine-casing p-8 rounded-2xl">

        {/* App Branding */}
        <div className="text-center mb-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-white font-black text-2xl shadow-inner">
            A
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-800 uppercase drop-shadow-sm">
            aaj<span className="text-primary">kiski</span>bari
          </h1>
          <p className="mt-2 text-xs text-zinc-500 uppercase tracking-widest font-bold">
            Flat Chore &amp; Presence Manager
          </p>
        </div>

        {/* Metallic Tab Switcher */}
        <div className="flex space-x-1 p-1 skeuo-inset rounded-xl">
          <button
            type="button"
            onClick={() => { setActiveTab("login"); setError(null); }}
            className={`flex-1 text-center py-2.5 text-xs font-black rounded-lg uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === "login"
                ? "skeuo-button-primary text-white"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("register"); setError(null); }}
            className={`flex-1 text-center py-2.5 text-xs font-black rounded-lg uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === "register"
                ? "skeuo-button-primary text-white"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            New Flat
          </button>
        </div>

        {error && (
          <div className="p-3 skeuo-inset border border-red-400 rounded-xl text-xs uppercase tracking-widest font-black text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="flat-id"
                className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2"
              >
                Flat ID / Code
              </label>
              <input
                id="flat-id"
                name="flat_id"
                type="text"
                autoComplete="username"
                required
                className="block w-full skeuo-inset rounded-xl px-4 py-3 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                placeholder={activeTab === "login" ? "e.g. flat-404" : "e.g. my-flat-name"}
                enterKeyHint="next"
              />
            </div>

            <div>
              <label
                htmlFor="current-password"
                className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={activeTab === "login" ? "current-password" : "new-password"}
                  required
                  className="block w-full skeuo-inset rounded-xl px-4 py-3 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold pr-16"
                  placeholder="••••••••"
                  enterKeyHint={activeTab === "login" ? "done" : "next"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-400 hover:text-zinc-700 text-[10px] font-black uppercase tracking-widest focus:outline-none transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {activeTab === "register" && (
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm_password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="block w-full skeuo-inset rounded-xl px-4 py-3 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
                  placeholder="••••••••"
                  enterKeyHint="done"
                />
              </div>
            )}
          </div>

          {activeTab === "login" && (
            <div className="flex items-center justify-end text-xs">
              <button
                type="button"
                onClick={() => toast("Please contact your flat admin to reset the password.", "info")}
                className="font-black text-primary hover:text-primary-hover uppercase tracking-widest text-[10px] transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full skeuo-button-primary px-4 py-3.5 rounded-xl text-sm disabled:opacity-50 cursor-pointer"
          >
            {isPending
              ? activeTab === "login" ? "Signing in..." : "Creating flat..."
              : activeTab === "login" ? "Sign In to Flat" : "Create Flat"
            }
          </button>
        </form>

        {/* Footer note */}
        <p className="text-center text-[9px] text-zinc-400 uppercase tracking-widest font-bold pt-2">
          aajkiskibari &mdash; made for the flat, by the flat
        </p>
      </div>
    </div>
  );
}
