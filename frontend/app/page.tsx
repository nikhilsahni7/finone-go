import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Activity,
    ArrowRight,
    Cpu,
    Database,
    FileText,
    Lock,
    Mail,
    Phone,
    Search,
    Terminal,
    User,
    Users
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-200 selection:bg-indigo-500/30 relative overflow-hidden font-sans">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-indigo-900/20 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-900/10 blur-[120px] mix-blend-screen" />
        <div className="absolute top-[40%] left-[60%] w-[40vw] h-[40vw] rounded-full bg-purple-900/10 blur-[100px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 shadow-[0_0_15px_rgba(79,70,229,0.3)] group-hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all duration-500">
                <Database className="h-5 w-5 text-indigo-400" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">FinOne</span>
            </div>
            <div className="flex items-center space-x-8">
              <nav className="hidden md:flex items-center space-x-8">
                <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors duration-300">
                  Platform
                </Link>
                <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors duration-300">
                  Capabilities
                </Link>
              </nav>
              <div className="flex items-center gap-4">
                <Link href="/user/login">
                  <Button className="bg-white text-black hover:bg-zinc-200 rounded-full px-6 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 font-medium">
                    Authenticate
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column Content */}
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-medium uppercase tracking-wider text-indigo-300">
                System Operational · v2.0
              </span>
            </div>

            <div className="space-y-6">
              <h1 className="text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                Data Intelligence
                <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 pb-2">
                  At Scale.
                </span>
              </h1>

              <p className="text-lg lg:text-xl text-zinc-400 leading-relaxed max-w-xl font-light">
                The definitive platform for parsing, managing, and securing customer intelligence. Engineered for instantaneous retrieval and zero-trust architecture.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-5">
              <Link href="/user/login">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-8 h-14 text-base shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all duration-300 border border-indigo-500/50"
                >
                  <Terminal className="mr-2 h-5 w-5" />
                  Initialize Session
                </Button>
              </Link>
              <Link href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent border-white/10 hover:bg-white/5 text-white rounded-full px-8 h-14 text-base transition-all duration-300"
                >
                  <Cpu className="mr-2 h-5 w-5 text-zinc-400" />
                  System Specs
                </Button>
              </Link>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/5">
              <div>
                <div className="text-3xl font-bold tracking-tight text-white mb-1">80M+</div>
                <div className="text-xs tracking-widest text-zinc-500 uppercase font-semibold">Nodes</div>
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight text-white mb-1">12ms</div>
                <div className="text-xs tracking-widest text-zinc-500 uppercase font-semibold">Latency</div>
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight text-white mb-1">99.9%</div>
                <div className="text-xs tracking-widest text-zinc-500 uppercase font-semibold">Uptime</div>
              </div>
            </div>
          </div>

          {/* Right Column Visual Terminal */}
          <div className="relative lg:h-[600px] flex items-center justify-center animate-in fade-in slide-in-from-right-12 duration-1000 delay-300">
            {/* Terminal Window Decoration */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-cyan-500/10 rounded-3xl blur-2xl" />

            <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-xl overflow-hidden hover:border-white/20 transition-colors duration-500">
              {/* Terminal Header */}
              <div className="flex items-center px-4 py-3 border-b border-white/5 bg-white/5">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="mx-auto text-xs font-mono text-zinc-500">root@finone-core:~</div>
              </div>

              <div className="p-6 space-y-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-indigo-400" />
                  </div>
                  <Input
                    placeholder="QUERY: SELECT * FROM identifiers WHERE..."
                    className="w-full bg-black/50 border-white/10 text-white placeholder:text-zinc-600 pl-11 h-12 rounded-xl font-mono text-xs focus-visible:ring-indigo-500/50"
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center">
                    <Button size="sm" className="bg-white/10 hover:bg-white/20 text-white rounded-lg h-8 px-3 text-xs font-mono">
                      EXEC
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-mono text-zinc-500 mb-2">RESULTS: 3 MATCHES FOUND in 24ms</div>

                  {/* Results rendered as dark tech cards */}
                  {[
                    { name: 'Rohan Kumar', id: 'UUID-92833', phone: '+91 98** **23', email: 'r***@sys.core' },
                    { name: 'Priya Sharma', id: 'UUID-10214', phone: '+91 79** **89', email: 'p***@sys.core' },
                    { name: 'Amit Verma', id: 'UUID-88390', phone: '+91 90** **12', email: 'a***@sys.core' }
                  ].map((user, i) => (
                    <div key={i} className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all duration-300">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/0 group-hover:bg-indigo-500 transition-colors duration-300 rounded-l-xl" />
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 text-white font-medium">
                          <div className="p-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                            <User className="h-3.5 w-3.5 text-indigo-400" />
                          </div>
                          <span>{user.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 bg-black/50 px-2 py-1 rounded">{user.id}</span>
                      </div>
                      <div className="flex items-center gap-5 text-xs text-zinc-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-zinc-500" /> {user.phone}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-zinc-500" /> {user.email}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="relative z-10 py-32 px-6 lg:px-8 border-t border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Core Capabilities
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl font-light">
              High-performance infrastructure engineered for complex data search, retrieval, and automated insights.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              { title: "Quantum Search", icon: Search, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "group-hover:border-indigo-500/30", desc: "Sub-millisecond latency for complex multi-parameter queries across 80M+ nodes." },
              { title: "Immutable Storage", icon: Database, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "group-hover:border-cyan-500/30", desc: "Military-grade data structures with resilient failovers and continuous validation." },
              { title: "Telemetry Analytics", icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10", border: "group-hover:border-purple-500/30", desc: "Real-time system telemetry and volumetric data visualization." },
              { title: "Zero-Trust Security", icon: Lock, color: "text-rose-400", bg: "bg-rose-500/10", border: "group-hover:border-rose-500/30", desc: "Cryptographic role-based boundaries ensuring total data sovereignty." },
              { title: "Node Management", icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "group-hover:border-emerald-500/30", desc: "Granular access controls and comprehensive audit logging capabilities." },
              { title: "Automated Export", icon: FileText, color: "text-amber-400", bg: "bg-amber-500/10", border: "group-hover:border-amber-500/30", desc: "Batch extraction to standardized formats with automated sanitization." },
            ].map((feature, idx) => (
              <div key={idx} className={`group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all duration-500 ${feature.border}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-500" />
                <div className={`inline-flex p-3 rounded-2xl ${feature.bg} mb-6 ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-500`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed font-light">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brutalist CTA */}
      <section className="relative z-10 py-32 px-6 lg:px-8 border-t border-white/5 bg-gradient-to-b from-black/20 to-indigo-950/20">
        <div className="max-w-5xl mx-auto rounded-[3rem] p-12 lg:p-20 relative overflow-hidden flex flex-col items-center text-center border border-white/10 bg-black/40 backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse delay-1000" />

          <h2 className="relative z-10 text-5xl md:text-6xl font-black tracking-tighter text-white mb-8">
            INITIATE SECURE SESSION
          </h2>
          <p className="relative z-10 text-xl text-zinc-400 mb-12 max-w-2xl font-light">
            Gain immediate access to the intelligence network. Authorized personnel only.
          </p>
          <div className="relative z-10">
            <Link href="/user/login">
              <Button
                size="lg"
                className="bg-white hover:bg-zinc-200 text-black rounded-full px-12 h-16 text-lg font-bold shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all duration-500"
              >
                Authenticate Now
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black py-12 px-6 lg:px-8 text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-zinc-600" />
            <span className="font-bold text-zinc-400 tracking-tight text-base">FinOne</span>
          </div>

          <div className="flex gap-8 text-zinc-500 font-mono text-xs max-sm:flex-col max-sm:gap-2">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> SYSTEM ONLINE</span>
            <span>ENCRYPTION: AES-256</span>
            <span>NODE: AP-SOUTH-1</span>
          </div>

          <div className="text-zinc-600 font-mono text-xs">
            &copy; {new Date().getFullYear()} FINONE CORP. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>
    </div>
  );
}
