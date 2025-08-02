"use client";

import { UserCheck, UserPlus, Users, UserX } from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export default function UserManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">User Management</h3>
          <p className="text-sm text-gray-500">
            Manage user accounts and permissions
          </p>
        </div>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600 flex items-center">
              <UserCheck className="h-4 w-4 mr-2" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600 flex items-center">
              <UserX className="h-4 w-4 mr-2" />
              Inactive Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-600">
              Admin Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">1</div>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Management Features</CardTitle>
          <CardDescription>
            Comprehensive user management capabilities coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Coming Soon
            </h4>
            <p className="text-gray-600 mb-4">
              User management features are currently under development. You'll
              soon be able to:
            </p>
            <ul className="text-left text-sm text-gray-600 space-y-2 max-w-md mx-auto">
              <li>• Create and manage user accounts</li>
              <li>• Set user roles and permissions</li>
              <li>• Monitor user activity and analytics</li>
              <li>• Bulk user operations</li>
              <li>• User search and filtering</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
