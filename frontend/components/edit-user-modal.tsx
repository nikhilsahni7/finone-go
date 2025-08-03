"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { UpdateUserRequest, User } from "../lib/admin-api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSubmit: (userId: string, updateData: UpdateUserRequest) => Promise<void>;
  loading: boolean;
}

export default function EditUserModal({
  isOpen,
  user,
  onClose,
  onSubmit,
  loading,
}: EditUserModalProps) {
  const [formData, setFormData] = useState<UpdateUserRequest>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  // Initialize form data when user changes
  if (user && !initialized) {
    setFormData({
      name: user.name,
      email: user.email,
      user_type: user.user_type,
      is_active: user.is_active,
      expires_at: user.expires_at,
      max_searches_per_day: user.max_searches_per_day,
      max_exports_per_day: user.max_exports_per_day,
    });
    setInitialized(true);
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.name !== undefined && !formData.name.trim()) {
      newErrors.name = "Name cannot be empty";
    }

    if (formData.email !== undefined && formData.email !== "") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    if (formData.password !== undefined && formData.password !== "") {
      if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }

    if (
      formData.max_searches_per_day !== undefined &&
      formData.max_searches_per_day < 1
    ) {
      newErrors.max_searches_per_day = "Must be at least 1";
    }

    if (
      formData.max_exports_per_day !== undefined &&
      formData.max_exports_per_day < 1
    ) {
      newErrors.max_exports_per_day = "Must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !validateForm()) {
      return;
    }

    // Filter out undefined values and empty passwords
    const updateData: UpdateUserRequest = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && !(key === "password" && value === "")) {
        (updateData as any)[key] = value;
      }
    });

    try {
      await onSubmit(user.id, updateData);
      handleClose();
    } catch (error) {
      // Error is handled by parent component
    }
  };

  const handleClose = () => {
    setFormData({});
    setErrors({});
    setInitialized(false);
    onClose();
  };

  const handleInputChange = (field: keyof UpdateUserRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Edit User: {user.name}</h2>
          <Button variant="outline" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter full name"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="password">
              Password (leave empty to keep current)
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password || ""}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder="Enter new password (min 6 characters)"
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          {/* User Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="is_active">Status</Label>
              <select
                id="is_active"
                value={formData.is_active?.toString() || "true"}
                onChange={(e) =>
                  handleInputChange("is_active", e.target.value === "true")
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div>
              <Label htmlFor="user_type">User Type</Label>
              <select
                id="user_type"
                value={formData.user_type || user.user_type}
                onChange={(e) =>
                  handleInputChange(
                    "user_type",
                    e.target.value as "DEMO" | "PERMANENT"
                  )
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="DEMO">Demo</option>
                <option value="PERMANENT">Permanent</option>
              </select>
            </div>
          </div>

          {/* Expiration Date - only for Demo users */}
          {(formData.user_type || user.user_type) === "DEMO" && (
            <div>
              <Label htmlFor="expires_at">Expiration Date</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={
                  formData.expires_at
                    ? new Date(formData.expires_at).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  handleInputChange(
                    "expires_at",
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null
                  )
                }
              />
            </div>
          )}

          {/* Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max_searches_per_day">Max Searches Per Day</Label>
              <Input
                id="max_searches_per_day"
                type="number"
                min="1"
                value={formData.max_searches_per_day || ""}
                onChange={(e) =>
                  handleInputChange(
                    "max_searches_per_day",
                    parseInt(e.target.value) || 1
                  )
                }
              />
              {errors.max_searches_per_day && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.max_searches_per_day}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="max_exports_per_day">Max Exports Per Day</Label>
              <Input
                id="max_exports_per_day"
                type="number"
                min="1"
                value={formData.max_exports_per_day || ""}
                onChange={(e) =>
                  handleInputChange(
                    "max_exports_per_day",
                    parseInt(e.target.value) || 1
                  )
                }
              />
              {errors.max_exports_per_day && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.max_exports_per_day}
                </p>
              )}
            </div>
          </div>

          {/* User Info (Read-only) */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              User Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Role:</span>
                <span className="ml-2 font-medium">{user.role}</span>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
