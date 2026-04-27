import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "@tanstack/react-router";

interface Provider {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number;
  reviewCount: number;
  verified: number;
  available: number;
}

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: number;
  created_at: string;
}

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
  user_name: string;
  provider_name: string;
}

export const Route = createFileRoute("/admin")({
  component: Admin,
});

function Admin() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<"providers" | "users" | "bookings">("providers");
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user || user.role !== "admin") {
      navigate({ to: "/signin" });
      return;
    }

    fetchData();
  }, [user, loading, navigate]);

  const fetchData = async () => {
    try {
      const [providersRes, usersRes, bookingsRes] = await Promise.all([
        fetch("/api/admin/providers", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch("/api/bookings", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      if (!providersRes.ok || !usersRes.ok || !bookingsRes.ok) {
        throw new Error("Failed to fetch admin data");
      }

      const providersData = await providersRes.json();
      const usersData = await usersRes.json();
      const bookingsData = await bookingsRes.json();

      setProviders(providersData);
      setUsers(usersData);
      setBookings(bookingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoadingAdmin(false);
    }
  };

  if (loading || loadingAdmin) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={logout} variant="outline">
          Logout
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex space-x-4 mb-6">
        <Button
          variant={activeTab === "providers" ? "default" : "outline"}
          onClick={() => setActiveTab("providers")}
        >
          Providers ({providers.length})
        </Button>
        <Button
          variant={activeTab === "users" ? "default" : "outline"}
          onClick={() => setActiveTab("users")}
        >
          Users ({users.length})
        </Button>
        <Button
          variant={activeTab === "bookings" ? "default" : "outline"}
          onClick={() => setActiveTab("bookings")}
        >
          Bookings ({bookings.length})
        </Button>
      </div>

      {activeTab === "providers" && (
        <Card>
          <CardHeader>
            <CardTitle>Providers</CardTitle>
            <CardDescription>
              Manage service providers in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">{provider.name}</TableCell>
                    <TableCell>{provider.category}</TableCell>
                    <TableCell>{provider.city}</TableCell>
                    <TableCell>{provider.rating}</TableCell>
                    <TableCell>{provider.reviewCount}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {provider.verified ? (
                          <Badge variant="default">Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Unverified</Badge>
                        )}
                        {provider.available ? (
                          <Badge variant="default">Available</Badge>
                        ) : (
                          <Badge variant="destructive">Unavailable</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "users" && (
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Manage user accounts in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "destructive"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "bookings" && (
        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
            <CardDescription>
              Manage service bookings across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">#{booking.id}</TableCell>
                    <TableCell>{booking.user_name}</TableCell>
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