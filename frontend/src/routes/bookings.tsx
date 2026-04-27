import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "@tanstack/react-router";

interface Booking {
  id: number;
  user_id: number;
  provider_id: string;
  service_type: string;
  booking_date: string;
  booking_time: string;
  status: string;
  notes: string;
  address: string;
  phone: string;
  estimated_cost: number;
  created_at: string;
  provider_name: string;
}

export const Route = createFileRoute("/bookings")({
  component: Bookings,
});

function Bookings() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      navigate({ to: "/signin" });
      return;
    }

    fetchBookings();
  }, [user, loading, navigate]);

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await res.json();
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoadingBookings(false);
    }
  };

  const updateBookingStatus = async (bookingId: number, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update booking");
      }

      // Refresh bookings
      fetchBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update booking");
    }
  };

  if (loading || loadingBookings) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <Button onClick={logout} variant="outline">
          Logout
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">You haven't made any bookings yet.</p>
            <Button onClick={() => navigate({ to: "/search" })}>
              Find a Service Provider
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Service Bookings</CardTitle>
            <CardDescription>
              Track and manage your service bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">#{booking.id}</TableCell>
                    <TableCell>{booking.provider_name}</TableCell>
                    <TableCell>{booking.service_type}</TableCell>
                    <TableCell>
                      {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          booking.status === "completed" ? "default" :
                          booking.status === "confirmed" ? "default" :
                          booking.status === "in_progress" ? "secondary" :
                          booking.status === "cancelled" ? "destructive" :
                          "outline"
                        }
                      >
                        {booking.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{booking.estimated_cost ? `₹${booking.estimated_cost}` : "TBD"}</TableCell>
                    <TableCell>
                      {booking.status === "pending" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => updateBookingStatus(booking.id, "cancelled")}
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}