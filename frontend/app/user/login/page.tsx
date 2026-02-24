"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import {
    AlertCircle,
    ArrowLeft,
    Database,
    Eye,
    EyeOff,
    RefreshCw,
    Terminal
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function UserLogin() {
  const { login: authLogin, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // CAPTCHA state
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: 0 });
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  const router = useRouter();

  // Generate new CAPTCHA
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1; // 1-10
    const num2 = Math.floor(Math.random() * 10) + 1; // 1-10
    const answer = num1 + num2;
    setCaptcha({ num1, num2, answer });
    setCaptchaInput("");
    setCaptchaError("");
  };

  // Initialize CAPTCHA on component mount
  useEffect(() => {
    generateCaptcha();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/user/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleCaptchaInputChange = (value: string) => {
    setCaptchaInput(value);
    if (captchaError) setCaptchaError("");
  };

  const validateCaptcha = () => {
    const userAnswer = parseInt(captchaInput);
    if (isNaN(userAnswer) || userAnswer !== captcha.answer) {
      setCaptchaError("Authentication failed. Invalid security response.");
      generateCaptcha(); // Generate new CAPTCHA on error
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate CAPTCHA first
    if (!validateCaptcha()) {
      setIsLoading(false);
      return;
    }

    const result = await authLogin(formData.email, formData.password);

    if (result.success) {
      // Redirect to dashboard
      router.push("/user/dashboard");
    } else {
      setError(result.error || "Authentication failed. Access denied.");
      // Generate new CAPTCHA on login failure for security
      generateCaptcha();
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-200 selection:bg-indigo-500/30 relative overflow-hidden font-sans">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-indigo-900/10 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-900/10 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
      </div>

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 shadow-[0_0_15px_rgba(79,70,229,0.3)] group-hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all duration-500">
              <Database className="h-5 w-5 text-indigo-400" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">FinOne</span>
          </Link>

          {/* Back to Home */}
          <Link
            href="/"
            className="flex items-center text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-300 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-4 py-2 backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Abort & Return
          </Link>
        </div>
      </div>

      {/* Login Form */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] px-4 py-12">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">

          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold tracking-tight text-white mb-3">
              SESSION INIT
            </h1>
            <p className="text-zinc-400 font-light">
              Enter your credentials to access the secure terminal.
            </p>
          </div>

          <Card className="bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(79,70,229,0.1)] rounded-2xl overflow-hidden relative">
            {/* Top border glow */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="flex items-start space-x-3 p-4 bg-red-950/50 border border-red-500/30 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300 font-medium">{error}</p>
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-2.5">
                  <Label
                    htmlFor="email"
                    className="text-xs font-semibold text-zinc-400 uppercase tracking-widest ml-1"
                  >
                    Identifier
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="agent@sys.core"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full h-12 px-4 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all font-mono text-sm"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center ml-1">
                    <Label
                      htmlFor="password"
                      className="text-xs font-semibold text-zinc-400 uppercase tracking-widest"
                    >
                      Passkey
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className="w-full h-12 px-4 pr-12 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all font-mono text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white p-1 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* CAPTCHA Field */}
                <div className="space-y-2.5 pt-2">
                  <Label
                    htmlFor="captcha"
                    className="text-xs font-semibold text-zinc-400 uppercase tracking-widest ml-1 flex items-center justify-between"
                  >
                    <span>Security Verification</span>
                  </Label>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex items-center space-x-3 text-indigo-300">
                        <Terminal size={18} className="opacity-70" />
                        <span className="text-lg font-mono font-bold tracking-widest">
                          {captcha.num1} + {captcha.num2} = ?
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={generateCaptcha}
                        className="text-zinc-400 hover:text-white hover:bg-white/10 h-8 px-2"
                        title="Regenerate Challenge"
                      >
                        <RefreshCw size={14} className="mr-1.5" />
                        <span className="text-xs font-mono">RELOAD</span>
                      </Button>
                    </div>

                    <div className="relative">
                      <Input
                        id="captcha"
                        type="number"
                        placeholder="Expected Output"
                        value={captchaInput}
                        onChange={(e) =>
                          handleCaptchaInputChange(e.target.value)
                        }
                        className="w-full h-12 px-4 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all font-mono text-sm"
                        required
                        min="0"
                        max="20"
                        autoComplete="off"
                      />
                    </div>

                    {captchaError && (
                      <div className="flex items-center space-x-2 text-red-400 mt-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <p className="text-xs font-medium">{captchaError}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  className="w-full h-14 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-widest uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] border border-indigo-500/50"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <span className="flex h-2 w-2 rounded-full bg-white animate-ping" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <span>Initiate Uplink</span>
                  )}
                </Button>

                {/* Support Link */}
                <div className="text-center pt-6 space-y-3 border-t border-white/5">
                  <p className="text-xs text-zinc-500 font-medium">
                    Authorization required for external nodes.{" "}
                    <Link
                      href="/register"
                      className="text-indigo-400 hover:text-indigo-300 transition-colors underline decoration-indigo-500/30 underline-offset-4"
                    >
                      Request Clearance
                    </Link>
                  </p>
                  <p className="text-xs text-zinc-600 font-medium">
                    Connection issues?{" "}
                    <button
                      type="button"
                      className="text-indigo-400 hover:text-indigo-300 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        alert(
                          "SECURE COMMS PROTOCOL:\n\n📞 Node: AP-8448671674\n💬 Link: https://wa.me/918448671674"
                        );
                      }}
                    >
                      Ping SysAdmin
                    </button>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 space-y-2">
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
              FinOne Intelligence Network v2.0
            </p>
            <p className="text-[10px] text-zinc-700 font-mono uppercase tracking-widest">
              Unauthorized access is strictly prohibited
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
