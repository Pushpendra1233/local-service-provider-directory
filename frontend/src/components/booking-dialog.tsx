import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock } from "lucide-react";
import type { Provider } from "@/data/types";

interface BookingDialogProps {
  provider: Provider;
  children: React.ReactNode;
}

export function BookingDialog({ provider, children }: BookingDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    serviceType: provider.services[0] || "",
    bookingDate: "",
    bookingTime: "",
    address: "",
    phone: "",
    notes: "",
    estimatedCost: provider.priceFrom,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          providerId: provider.id,
          serviceType: formData.serviceType,
          bookingDate: formData.bookingDate,
          bookingTime: formData.bookingTime,
          notes: formData.notes,
          address: formData.address,
          phone: formData.phone,
          estimatedCost: formData.estimatedCost,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              You need to sign in to book a service. Please sign in or create an account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button onClick={() => setOpen(false)} className="flex-1">
              Sign In
            </Button>
            <Button onClick={() => setOpen(false)} variant="outline" className="flex-1">
              Sign Up
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book {provider.name}</DialogTitle>
          <DialogDescription>
            Schedule a service with this verified professional
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Alert>
            <AlertDescription>
              Booking request sent successfully! The provider will contact you soon.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="serviceType">Service Type</Label>
              <select
                id="serviceType"
                value={formData.serviceType}
                onChange={(e) => handleInputChange("serviceType", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                {provider.services.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bookingDate">Date</Label>
                <Input
                  id="bookingDate"
                  type="date"
                  value={formData.bookingDate}
                  onChange={(e) => handleInputChange("bookingDate", e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <Label htmlFor="bookingTime">Time</Label>
                <Input
                  id="bookingTime"
                  type="time"
                  value={formData.bookingTime}
                  onChange={(e) => handleInputChange("bookingTime", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Service Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter the complete address where service is needed"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Contact Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Your phone number"
                required
              />
            </div>

            <div>
              <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
              <Input
                id="estimatedCost"
                type="number"
                value={formData.estimatedCost}
                onChange={(e) => handleInputChange("estimatedCost", parseInt(e.target.value) || 0)}
                min={provider.priceFrom}
              />
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Any specific requirements or instructions"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Booking..." : "Confirm Booking"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}