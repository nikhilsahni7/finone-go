"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  createPasswordChangeRequest,
  getUserPasswordChangeRequests,
  PasswordChangeRequest,
  UserPasswordChangeRequest,
} from "@/lib/api";
import { AlertCircle, CheckCircle, Clock, Key, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PasswordChangeModal({
  isOpen,
  onClose,
  onSuccess,
}: PasswordChangeModalProps) {
  const [formData, setFormData] = useState<PasswordChangeRequest>({
    reason: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [userRequests, setUserRequests] = useState<UserPasswordChangeRequest[]>(
    []
  );
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Fetch user's existing password change requests
  const fetchUserRequests = async () => {
    try {
      setLoadingRequests(true);
      const requests = await getUserPasswordChangeRequests();
      // Ensure we always have an array
      setUserRequests(Array.isArray(requests) ? requests : []);
    } catch (err: any) {
      console.error("Failed to fetch password change requests:", err);
      // Set empty array on error to prevent runtime issues
      setUserRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUserRequests();
      setSuccess(false);
      setError("");
      setFormData({ reason: "" });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.reason.trim()) {
      setError("Please provide a reason for the password change request");
      return;
    }

    if (formData.reason.trim().length < 10) {
      setError(
        "Please provide a more detailed reason (at least 10 characters)"
      );
      return;
    }

    setIsLoading(true);

    try {
      await createPasswordChangeRequest({
        reason: formData.reason.trim(),
      });
      setSuccess(true);
      setFormData({ reason: "" });
      await fetchUserRequests(); // Refresh the list
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to submit password change request");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "APPROVED":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "REJECTED":
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasPendingRequest =
    Array.isArray(userRequests) &&
    userRequests.some((req) => req.status === "PENDING");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center text-gray-900">
            <Key className="w-5 h-5 text-blue-600 mr-2" />
            Password Change Request
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Request Submitted Successfully!
              </h3>
              <p className="text-gray-600 mb-4">
                Your password change request has been submitted. An admin will
                review it and contact you.
              </p>
              <Button
                onClick={onClose}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* New Request Form */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Submit New Request
                  </h3>
                  {hasPendingRequest && (
                    <div className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-200">
                      You already have a pending request
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="reason"
                      className="text-sm font-medium text-gray-700"
                    >
                      Reason for Password Change *
                    </Label>
                    <textarea
                      id="reason"
                      placeholder="Please explain why you need to change your password (e.g., security concern, forgotten password, etc.)"
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          reason: e.target.value,
                        }))
                      }
                      className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
                      required
                      disabled={hasPendingRequest}
                    />
                    <p className="text-xs text-gray-500">
                      Minimum 10 characters. Be specific about your reason.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2"
                    disabled={isLoading || hasPendingRequest}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </div>
                    ) : hasPendingRequest ? (
                      "Request Already Pending"
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Previous Requests */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Previous Requests
                </h3>

                {loadingRequests ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">
                      Loading requests...
                    </p>
                  </div>
                ) : !Array.isArray(userRequests) ||
                  userRequests.length === 0 ? (
                  <div className="text-center py-4">
                    <Key className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      No previous requests found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {userRequests.map((request) => (
                      <div
                        key={request.id}
                        className="border border-gray-200 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{request.status}</span>
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(request.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {request.reason}
                        </p>
                        {request.admin_notes && (
                          <div className="bg-gray-50 p-2 rounded text-xs">
                            <strong>Admin Notes:</strong> {request.admin_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
