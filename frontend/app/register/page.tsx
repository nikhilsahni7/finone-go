"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRegistrationRequest, RegistrationRequest } from "@/lib/api";
import { AlertCircle, CheckCircle, Loader2, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegistrationRequest>({
    name: "",
    email: "",
    phone_number: "",
    requested_searches: 100,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInputChange = (
    field: keyof RegistrationRequest,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!formData.phone_number.trim()) {
      setError("Phone number is required");
      return false;
    }
    if (
      formData.requested_searches <= 0 ||
      formData.requested_searches > 10000
    ) {
      setError("Requested searches must be between 1 and 10000");
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Basic phone number validation
    const phoneRegex = /^[\d\s\-\+\(\)]{10,15}$/;
    if (!phoneRegex.test(formData.phone_number.replace(/\s/g, ""))) {
      setError("Please enter a valid phone number (10-15 digits)");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await createRegistrationRequest({
        ...formData,
        phone_number: formData.phone_number.replace(/\s/g, ""),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit registration request");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Image
                src="/logo-final.png"
                alt="FinnOne"
                width={120}
                height={35}
              />
            </div>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-xl text-gray-900">
              Registration Request Submitted!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Thank you for your interest in FinnOne Search System. Your
              registration request has been submitted successfully.
            </p>
            <p className="text-gray-600">
              Our admin team will review your request and contact you within
              24-48 hours.
            </p>
            <div className="pt-4">
              <Link href="/user/login">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Go to Login Page
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image
              src="/logo-final.png"
              alt="FinnOne"
              width={120}
              height={35}
            />
          </div>
          <CardTitle className="text-xl text-gray-900 flex items-center justify-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Join FinnOne
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Request access to our customer search system
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-gray-700"
              >
                Full Name *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-sm font-medium text-gray-700"
              >
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone_number}
                onChange={(e) =>
                  handleInputChange("phone_number", e.target.value)
                }
                className="focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="searches"
                className="text-sm font-medium text-gray-700"
              >
                Daily Search Limit *
              </Label>
              <Input
                id="searches"
                type="number"
                min="1"
                max="10000"
                placeholder="Number of searches per day"
                value={formData.requested_searches}
                onChange={(e) =>
                  handleInputChange(
                    "requested_searches",
                    parseInt(e.target.value) || 0
                  )
                }
                className="focus:ring-2 focus:ring-purple-500"
                required
              />
              <p className="text-xs text-gray-500">
                Specify how many searches you need per day (1-10000)
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-medium transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting Request...
                </div>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Submit Registration Request
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/user/login"
                className="text-purple-600 hover:text-purple-500 font-medium"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
