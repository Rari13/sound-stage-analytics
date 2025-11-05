import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SignupClient from "./pages/SignupClient";
import SignupOrganizer from "./pages/SignupOrganizer";
import ClientHome from "./pages/ClientHome";
import OrganizerHome from "./pages/OrganizerHome";
import EventsBrowse from "./pages/EventsBrowse";
import ClientTickets from "./pages/ClientTickets";
import ClientFollows from "./pages/ClientFollows";
import VerifyEmail from "./pages/VerifyEmail";
import OrganizerScan from "./pages/OrganizerScan";
import EventCreate from "./pages/EventCreate";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
    <Sonner />
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup-client" element={<SignupClient />} />
      <Route path="/signup-organizer" element={<SignupOrganizer />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/events/browse" element={<EventsBrowse />} />
      <Route 
        path="/client/home" 
        element={
          <ProtectedRoute requireRole="client">
            <ClientHome />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/client/tickets" 
        element={
          <ProtectedRoute requireRole="client">
            <ClientTickets />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/client/follows" 
        element={
          <ProtectedRoute requireRole="client">
            <ClientFollows />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orga/home" 
        element={
          <ProtectedRoute requireRole="organizer">
            <OrganizerHome />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orga/scan" 
        element={
          <ProtectedRoute requireRole="organizer">
            <OrganizerScan />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orga/events/create" 
        element={
          <ProtectedRoute requireRole="organizer">
            <EventCreate />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </TooltipProvider>
);

export default App;
