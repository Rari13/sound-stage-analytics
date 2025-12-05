import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import OrganizerLayout from "./layouts/OrganizerLayout";
import ClientLayout from "./layouts/ClientLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SignupClient from "./pages/SignupClient";
import SignupOrganizer from "./pages/SignupOrganizer";
import ClientHome from "./pages/ClientHome";
import ClientProfile from "./pages/ClientProfile";
import ClientDiscover from "./pages/ClientDiscover";
import OrganizerHome from "./pages/OrganizerHome";
import OrganizerEvents from "./pages/OrganizerEvents";
import OrganizerProfile from "./pages/OrganizerProfile";
import EventsBrowse from "./pages/EventsBrowse";
import ClientTickets from "./pages/ClientTickets";
import ClientFollows from "./pages/ClientFollows";
import VerifyEmail from "./pages/VerifyEmail";
import OrganizerScan from "./pages/OrganizerScan";
import EventCreate from "./pages/EventCreate";
import EventEdit from "./pages/EventEdit";
import EventDetails from "./pages/EventDetails";
import OrganizerAnalytics from "./pages/OrganizerAnalytics";
import OrganizerSubscription from "./pages/OrganizerSubscription";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import GroupPayJoin from "./pages/GroupPayJoin";
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
      
      {/* Client Routes with Layout */}
      <Route 
        path="/client/home" 
        element={
          <ProtectedRoute requireRole="client">
            <ClientLayout><ClientHome /></ClientLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/client/profile" 
        element={
          <ProtectedRoute requireRole="client">
            <ClientLayout><ClientProfile /></ClientLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/client/tickets"
        element={
          <ProtectedRoute requireRole="client">
            <ClientLayout><ClientTickets /></ClientLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/client/follows" 
        element={
          <ProtectedRoute requireRole="client">
            <ClientLayout><ClientFollows /></ClientLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/client/discover" 
        element={
          <ProtectedRoute requireRole="client">
            <ClientLayout><ClientDiscover /></ClientLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Organizer Routes with Layout */}
      <Route 
        path="/orga/home" 
        element={
          <ProtectedRoute requireRole="organizer">
            <OrganizerLayout>
              <OrganizerHome />
            </OrganizerLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orga/events" 
        element={
          <ProtectedRoute requireRole="organizer">
            <OrganizerLayout>
              <OrganizerEvents />
            </OrganizerLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orga/scan" 
        element={
          <ProtectedRoute requireRole="organizer">
            <OrganizerLayout>
              <OrganizerScan />
            </OrganizerLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orga/analytics" 
        element={
          <ProtectedRoute requireRole="organizer">
            <OrganizerLayout>
              <OrganizerAnalytics />
            </OrganizerLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orga/profile" 
        element={
          <ProtectedRoute requireRole="organizer">
            <OrganizerProfile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orga/subscription" 
        element={
          <ProtectedRoute requireRole="organizer">
            <OrganizerLayout>
              <OrganizerSubscription />
            </OrganizerLayout>
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
      <Route 
        path="/orga/events/edit/:eventId" 
        element={
          <ProtectedRoute requireRole="organizer">
            <EventEdit />
          </ProtectedRoute>
        } 
      />
      
      <Route path="/events/:slug" element={<EventDetails />} />
      <Route path="/group-pay/:shareCode" element={<GroupPayJoin />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancelled" element={<PaymentCancelled />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </TooltipProvider>
);

export default App;
