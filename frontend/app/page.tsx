import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Database,
  FileText,
  Lock,
  Mail,
  Phone,
  Search,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Image
                src="/logo-final.png"
                alt="FinnOne Logo"
                width={120}
                height={35}
                className="h-10 w-auto"
              />
            </div>
            <div className="flex items-center space-x-6">
              <nav className="hidden md:flex items-center space-x-8">
                <Link
                  href="/"
                  className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="#features"
                  className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  Features
                </Link>
              </nav>
              <div className="flex items-center gap-2">
                {/* Removed Admin Login per request */}
                <Link href="/user/login">
                  <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                    <Users className="mr-2 h-4 w-4" />
                    User Portal
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-blue-200 via-purple-200 to-pink-200 blur-3xl opacity-40" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-gradient-to-tr from-blue-100 via-cyan-200 to-indigo-200 blur-3xl opacity-40" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 shadow-sm ring-1 ring-gray-200">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  New: Blazing fast customer search
                </span>
              </div>

              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Customer Data Management
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                    Made Simple
                  </span>
                </h1>

                <p className="text-lg lg:text-xl text-gray-600 leading-relaxed max-w-2xl">
                  Secure, efficient, and user-friendly platform for managing
                  customer information, searching records, and generating
                  insights.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/user/login">
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4 shadow-lg"
                  >
                    Start Searching
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 py-4"
                  >
                    Explore Features
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-6">
                <div className="rounded-xl border border-gray-200 bg-white/60 p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-gray-900">
                    65 – 80M
                  </div>
                  <div className="text-xs tracking-wide text-gray-600">
                    CUSTOMERS DATA
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/60 p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-gray-900">100%</div>
                  <div className="text-xs tracking-wide text-gray-600">
                    SECURE
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/60 p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-gray-900">24/7</div>
                  <div className="text-xs tracking-wide text-gray-600">
                    ACCESS
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Visual Preview */}
            <div className="relative">
              {/* FinOne logo in hero */}
              <div className="flex justify-center mb-5">
                <Image
                  src="/logo-final.png"
                  alt="FinOne Logo"
                  width={180}
                  height={50}
                  className="h-12 w-auto drop-shadow-sm"
                />
              </div>
              <div className="relative mx-auto w-full max-w-md">
                {/* Glow */}
                <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-blue-200 to-indigo-200 blur-xl opacity-60" />
                <Card className="relative border-0 shadow-xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-900 text-lg">
                        Live Search Preview
                      </CardTitle>
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <CardDescription className="text-gray-600">
                      Try how the search feels inside the portal
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by name, mobile, email..."
                          className="pl-9"
                        />
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {/* Result Row */}
                      <div className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-900 font-medium">
                            <User className="h-4 w-4 text-blue-600" />
                            <span>
                              Rohan{" "}
                              <span className="bg-yellow-100 text-yellow-800 px-1 rounded">
                                Kumar
                              </span>
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            ID: 92833
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" /> +91 98•• ••23
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" /> r***@mail.com
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-900 font-medium">
                            <User className="h-4 w-4 text-blue-600" />
                            <span>Priya Sharma</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            ID: 10214
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" /> +91 79•• ••89
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" /> p***@mail.com
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-900 font-medium">
                            <User className="h-4 w-4 text-blue-600" />
                            <span>Amit Verma</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            ID: 88390
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" /> +91 90•• ••12
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" /> a***@mail.com
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need for efficient customer data management and
              search operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Search Feature */}
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Search className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-gray-900">
                    Advanced Search
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-gray-600">
                  Search customers by mobile number, name, email, or address
                  with real-time results.
                </CardDescription>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Multiple search criteria
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Instant results
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Highlighted matches
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Database className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-gray-900">
                    Data Management
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-gray-600">
                  Access and manage customer data with validation and error
                  handling.
                </CardDescription>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Secure data access
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" /> Data
                    validation
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Error tracking
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <BarChart3 className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-gray-900">
                    Analytics & Reports
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-gray-600">
                  Track usage statistics and monitor system performance.
                </CardDescription>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Usage analytics
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Performance metrics
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Activity logs
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-red-100 rounded-xl">
                    <Lock className="h-6 w-6 text-red-600" />
                  </div>
                  <CardTitle className="text-gray-900">
                    Security & Access
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-gray-600">
                  Role-based access control with secure authentication.
                </CardDescription>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Role-based access
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Secure authentication
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" /> Data
                    encryption
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export */}
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-teal-100 rounded-xl">
                    <FileText className="h-6 w-6 text-teal-600" />
                  </div>
                  <CardTitle className="text-gray-900">
                    Export & Reports
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-gray-600">
                  Export search results and generate comprehensive reports.
                </CardDescription>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" /> CSV
                    export
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Custom reports
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" /> Data
                    formatting
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Management */}
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-gray-900">
                    User Management
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-gray-600">
                  Manage your account and track usage.
                </CardDescription>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Account management
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Usage tracking
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                    Personalized dashboard
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Access the user portal and start managing customer data efficiently
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/user/login">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-gray-50"
              >
                <Users className="mr-2 h-5 w-5" />
                User Portal
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <Image
                  src="/logo-finone (1).png"
                  alt="FinnOne Logo"
                  width={140}
                  height={50}
                  className="h-10 w-auto"
                />
              </div>
              <p className="text-gray-300 leading-relaxed">
                Secure and efficient customer data management platform.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-6">Quick Links</h4>
              <div className="space-y-3">
                <Link
                  href="/user/login"
                  className="block text-gray-300 hover:text-white transition-colors"
                >
                  User Portal
                </Link>
                <Link
                  href="#features"
                  className="block text-gray-300 hover:text-white transition-colors"
                >
                  Features
                </Link>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-6">Features</h4>
              <div className="space-y-3 text-gray-300">
                <div>Customer Search</div>
                <div>Data Access</div>
                <div>Export Reports</div>
                <div>User Management</div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 FinOne. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
