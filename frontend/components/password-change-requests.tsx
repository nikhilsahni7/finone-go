"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deletePasswordChangeRequest,
  getPasswordChangeRequests,
  updatePasswordChangeRequest,
  UserPasswordChangeRequest,
} from "@/lib/admin-api";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Key,
  Mail,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface PasswordChangeRequestsProps {
  onRefresh?: () => void;
}

export default function PasswordChangeRequests({
  onRefresh,
}: PasswordChangeRequestsProps) {
  const [requests, setRequests] = useState<UserPasswordChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});

  const pageSize = 10;

  const fetchPasswordChangeRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getPasswordChangeRequests(
        currentPage,
        pageSize,
        statusFilter || undefined
      );
      // Ensure we always have an array
      setRequests(response.requests || []);
      setTotalCount(response.total_count || 0);
    } catch (err: any) {
      setError(err.message || "Failed to fetch password change requests");
      // Set empty array on error to prevent null issues
      setRequests([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasswordChangeRequests();
  }, [currentPage, statusFilter]);

  const handleStatusUpdate = async (
    id: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    try {
      setProcessingId(id);
      await updatePasswordChangeRequest(id, {
        status,
        admin_notes: adminNotes[id] || undefined,
      });

      // Refresh the list
      await fetchPasswordChangeRequests();

      // Clear admin notes for this request
      setAdminNotes((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message || `Failed to ${status.toLowerCase()} request`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm("Are you sure you want to delete this password change request?")
    ) {
      return;
    }

    try {
      setProcessingId(id);
      await deletePasswordChangeRequest(id);
      await fetchPasswordChangeRequests();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete request");
    } finally {
      setProcessingId(null);
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

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center text-gray-900">
            <Key className="w-5 h-5 text-blue-600 mr-2" />
            Password Change Requests ({totalCount})
          </CardTitle>
          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPasswordChangeRequests}
              disabled={loading}
            >
              <Search className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">
              Loading password change requests...
            </p>
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} password change requests found`
                : "No password change requests found"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(requests || []).map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 rounded-lg p-4 space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold text-gray-900">
                      {request.user_name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {getStatusIcon(request.status)}
                      <span className="ml-1">{request.status}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </span>
                    {request.status === "PENDING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(request.id)}
                        disabled={processingId === request.id}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {request.user_email}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      ID: {request.user_id}
                    </span>
                  </div>
                </div>

                {/* Reason */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">
                    Reason:
                  </Label>
                  <p className="text-sm text-gray-700">{request.reason}</p>
                </div>

                {/* Admin Notes and Actions */}
                {request.status === "PENDING" && (
                  <div className="space-y-3 pt-3 border-t border-gray-200">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`notes-${request.id}`}
                        className="text-sm font-medium text-gray-700"
                      >
                        Admin Notes (Optional)
                      </Label>
                      <Input
                        id={`notes-${request.id}`}
                        placeholder="Add notes about this request..."
                        value={adminNotes[request.id] || ""}
                        onChange={(e) =>
                          setAdminNotes((prev) => ({
                            ...prev,
                            [request.id]: e.target.value,
                          }))
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleStatusUpdate(request.id, "APPROVED")
                        }
                        disabled={processingId === request.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approve Request
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleStatusUpdate(request.id, "REJECTED")
                        }
                        disabled={processingId === request.id}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Show admin notes for processed requests */}
                {request.status !== "PENDING" && request.admin_notes && (
                  <div className="pt-3 border-t border-gray-200">
                    <Label className="text-sm font-medium text-gray-700">
                      Admin Notes:
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {request.admin_notes}
                    </p>
                  </div>
                )}

                {/* Review info for processed requests */}
                {request.status !== "PENDING" && request.reviewed_at && (
                  <div className="pt-3 border-t border-gray-200 text-sm text-gray-500">
                    Reviewed on {formatDate(request.reviewed_at)}
                  </div>
                )}

                {/* Action reminder for approved requests */}
                {request.status === "APPROVED" && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Reminder:</strong> Don't forget to update the
                      user's password in the User Management section.
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
                  requests
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-3 py-1 text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
