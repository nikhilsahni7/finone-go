"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { CreateUserRequest } from "../lib/admin-api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: CreateUserRequest) => Promise<void>;
  loading: boolean;
}

export default function CreateUserModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
}: CreateUserModalProps) {
  const [formData, setFormData] = useState<CreateUserRequest>({
    name: "",
    email: "",
    password: "",
    user_type: "DEMO",
    role: "USER",
    expires_at: null,
    max_searches_per_day: 100,
    max_exports_per_day: 10,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.max_searches_per_day < 1) {
      newErrors.max_searches_per_day = "Must be at least 1";
    }

    if (formData.max_exports_per_day < 1) {
      newErrors.max_exports_per_day = "Must be at least 1";
    }

    if (formData.user_type === "DEMO" && !formData.expires_at) {
      newErrors.expires_at = "Demo users must have an expiration date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      // Error is handled by parent component
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      user_type: "DEMO",
      role: "USER",
      expires_at: null,
      max_searches_per_day: 100,
      max_exports_per_day: 10,
    });
    setErrors({});
    onClose();
  };

  const handleInputChange = (field: keyof CreateUserRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Create New User</h2>
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
                value={formData.name}
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
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder="Enter password (min 6 characters)"
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          {/* User Type and Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user_type">User Type</Label>
              <select
                id="user_type"
                value={formData.user_type}
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

            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) =>
                  handleInputChange("role", e.target.value as "USER" | "ADMIN")
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          {/* Expiration Date - only for Demo users */}
          {formData.user_type === "DEMO" && (
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
              {errors.expires_at && (
                <p className="text-sm text-red-600 mt-1">{errors.expires_at}</p>
              )}
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
                value={formData.max_searches_per_day}
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
                value={formData.max_exports_per_day}
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

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
