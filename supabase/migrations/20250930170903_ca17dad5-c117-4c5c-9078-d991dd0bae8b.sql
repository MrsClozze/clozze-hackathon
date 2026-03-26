-- Create listings table
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  zipcode TEXT,
  county TEXT,
  price DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Pending', 'Closed', 'Cancelled')),
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  sq_feet INTEGER,
  days_on_market INTEGER DEFAULT 0,
  commission_percentage DECIMAL(5, 2),
  agent_commission DECIMAL(12, 2),
  seller_first_name TEXT,
  seller_last_name TEXT,
  seller_email TEXT,
  seller_phone TEXT,
  listing_start_date DATE,
  listing_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create buyers table
CREATE TABLE public.buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Closed')),
  pre_approved_amount DECIMAL(12, 2),
  wants_needs TEXT,
  commission_percentage DECIMAL(5, 2),
  agent_commission DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for listings
CREATE POLICY "Users can view their own listings"
  ON public.listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = user_id);

-- Team members can view listings of other team members
CREATE POLICY "Team members can view team listings"
  ON public.listings FOR SELECT
  USING (
    user_id IN (
      SELECT tm.user_id 
      FROM public.team_members tm
      WHERE tm.team_id IN (
        SELECT team_id 
        FROM public.team_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
      AND tm.status = 'active'
    )
  );

-- RLS Policies for buyers
CREATE POLICY "Users can view their own buyers"
  ON public.buyers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own buyers"
  ON public.buyers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own buyers"
  ON public.buyers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own buyers"
  ON public.buyers FOR DELETE
  USING (auth.uid() = user_id);

-- Team members can view buyers of other team members
CREATE POLICY "Team members can view team buyers"
  ON public.buyers FOR SELECT
  USING (
    user_id IN (
      SELECT tm.user_id 
      FROM public.team_members tm
      WHERE tm.team_id IN (
        SELECT team_id 
        FROM public.team_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
      AND tm.status = 'active'
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER set_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_buyers_updated_at
  BEFORE UPDATE ON public.buyers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_listings_user_id ON public.listings(user_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_buyers_user_id ON public.buyers(user_id);
CREATE INDEX idx_buyers_status ON public.buyers(status);