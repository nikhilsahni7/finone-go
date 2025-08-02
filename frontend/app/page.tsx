import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Search, Shield, Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Finone Search System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Advanced search and user management platform for financial data
            analysis
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Search className="w-12 h-12 mx-auto text-blue-600 mb-2" />
              <CardTitle>Advanced Search</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Powerful search capabilities across multiple data points
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 mx-auto text-green-600 mb-2" />
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Comprehensive user administration and access control
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="w-12 h-12 mx-auto text-purple-600 mb-2" />
              <CardTitle>Secure Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Enterprise-grade security with role-based permissions
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <BarChart3 className="w-12 h-12 mx-auto text-orange-600 mb-2" />
              <CardTitle>Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Real-time analytics and reporting dashboard
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Login Options */}
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* User Login Card */}
            <Card className="bg-white shadow-lg">
              <CardHeader className="text-center">
                <Users className="w-16 h-16 mx-auto text-blue-600 mb-4" />
                <CardTitle className="text-2xl">User Portal</CardTitle>
                <CardDescription>
                  Access your personal dashboard and search data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Advanced search functionality</li>
                    <li>• Personal dashboard</li>
                    <li>• Search history</li>
                    <li>• Data export</li>
                  </ul>
                </div>
                <Link href="/user/login" className="w-full block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Login as User
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Admin Login Card */}
            <Card className="bg-white shadow-lg">
              <CardHeader className="text-center">
                <Shield className="w-16 h-16 mx-auto text-red-600 mb-4" />
                <CardTitle className="text-2xl">Admin Portal</CardTitle>
                <CardDescription>
                  Manage users, system settings, and analytics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• User management</li>
                    <li>• System administration</li>
                    <li>• Analytics dashboard</li>
                    <li>• Data import/export</li>
                  </ul>
                </div>
                <Link href="/admin/login" className="w-full block">
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    Login as Admin
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p>&copy; 2024 Finone Search System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
