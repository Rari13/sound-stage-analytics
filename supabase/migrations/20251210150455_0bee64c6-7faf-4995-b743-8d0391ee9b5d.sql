-- Fix: Remove the overly permissive RLS policy that exposes participant data to anyone
DROP POLICY IF EXISTS "Anyone can view participants by group" ON group_order_participants;

-- Fix: Remove the overly permissive RLS policy on group_orders table as well
DROP POLICY IF EXISTS "Anyone can view group orders by share code" ON group_orders;