"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/lib/admin-auth-context";
import { AlertCircle, ArrowLeft, Key, Lock, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login, isAuthenticated } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/admin/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(email, password);

    if (result.success) {
      router.push("/admin/dashboard");
    } else {
      setError(result.error || "ROOT ACCESS DENIED");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-200 selection:bg-red-500/30 relative overflow-hidden font-sans">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-red-900/10 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-zinc-900/30 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
      </div>

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 shadow-[0_0_15px_rgba(239,68,68,0.2)] group-hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] transition-all duration-500">
              <Shield className="h-5 w-5 text-red-500" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-red-400 transition-colors">ROOT_NODE</span>
          </Link>

          <Link
            href="/"
            className="flex items-center text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-300 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-4 py-2 backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            ABORT
          </Link>
        </div>
      </div>

      {/* Login Form */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] px-4 py-12">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2 uppercase font-mono">
              System Override
            </h1>
            <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">
              Root Level Authorization Required
            </p>
          </div>

          <Card className="bg-[#0a0a0a] border border-white/10 shadow-2xl rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="flex items-start space-x-3 p-4 bg-red-950/50 border border-red-500/30 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400 font-mono tracking-wide">{error}</p>
                  </div>
                )}

                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">
                    Root Identifier
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sysadmin@core.net"
                    className="w-full h-12 px-4 bg-black/50 border-white/10 text-white placeholder:text-zinc-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl transition-all font-mono text-sm"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="password" className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">
                    Security Passphrase
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full h-12 px-4 bg-black/50 border-white/10 text-white placeholder:text-zinc-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl transition-all font-mono text-sm"
                    />
                    <Key className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 mt-4 bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-widest uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] border border-red-500/50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <span className="flex h-2 w-2 rounded-full bg-white animate-ping" />
                      <span>Verifying Clearance...</span>
                    </div>
                  ) : (
                    <span>Override Security</span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-8 space-y-2 relative z-10">
            <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">
              Unrecognized connection attempts will be logged
            </p>
            <button
              onClick={() => alert("SYSADMIN PING INIT:\n\nTarget Node: 8448671674")}
              className="text-[10px] text-red-500/50 hover:text-red-400 font-mono uppercase tracking-widest transition-colors pt-4 block w-full"
            >
              Request Manual Override
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
