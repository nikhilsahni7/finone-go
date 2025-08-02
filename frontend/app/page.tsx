import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, BarChart3, Search, Shield, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Image
                src="/logo-final.png"
                alt="FinnOne"
                width={120}
                height={40}
                className="mr-4"
              />
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-8">
              <Link
                href="/"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                href="#features"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
              >
                Features
              </Link>
              <Link
                href="/user/login"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium flex items-center transition-all duration-200 hover:shadow-lg"
              >
                <Users className="w-4 h-4 mr-2" />
                User Portal
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Left Content */}
            <div className="flex-1 max-w-2xl">
              <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Customer Data Management
                <br />
                <span className="text-purple-600">Made Simple</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Secure, efficient, and user-friendly platform for managing
                customer information, searching records, and generating insights
                with enterprise-grade security.
              </p>
              <Link href="/user/login">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg font-medium rounded-lg transition-all duration-200 hover:shadow-xl">
                  Start Searching
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Right Logo */}
            <div className="flex-1 flex justify-center">
              <div className="text-center">
                <Image
                  src="/logo-final.png"
                  alt="FinnOne"
                  width={400}
                  height={120}
                  className="mb-6"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of organizations using FinnOne
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-5xl font-bold text-gray-900 mb-2">50K+</h3>
              <p className="text-gray-600 font-medium text-lg">CUSTOMERS</p>
              <p className="text-sm text-gray-500 mt-2">
                Satisfied users worldwide
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-5xl font-bold text-gray-900 mb-2">100%</h3>
              <p className="text-gray-600 font-medium text-lg">SECURE</p>
              <p className="text-sm text-gray-500 mt-2">
                Enterprise-grade security
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-5xl font-bold text-gray-900 mb-2">24/7</h3>
              <p className="text-gray-600 font-medium text-lg">ACCESS</p>
              <p className="text-sm text-gray-500 mt-2">Always available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need for efficient customer data management and
              search with advanced capabilities
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="bg-blue-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">Advanced Search</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Powerful search capabilities across multiple data points with
                  precise control and real-time results
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="bg-green-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Comprehensive user administration with role-based access
                  control and permissions
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="bg-purple-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">Secure Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Enterprise-grade security with encryption, audit trails, and
                  compliance standards
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="bg-orange-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Real-time analytics dashboard with insights, reporting, and
                  data visualization
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/logo-final.png"
              alt="FinnOne"
              width={120}
              height={40}
              className="filter brightness-0 invert"
            />
          </div>
          <p className="text-gray-400">
            &copy; 2024 FinnOne. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
