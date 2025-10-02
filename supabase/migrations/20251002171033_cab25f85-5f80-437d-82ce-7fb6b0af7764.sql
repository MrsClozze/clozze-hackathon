-- Update agent_communication_preferences table to store scenario responses instead of style descriptions
ALTER TABLE agent_communication_preferences
  DROP COLUMN IF EXISTS general_clients_style,
  DROP COLUMN IF EXISTS listing_clients_style,
  DROP COLUMN IF EXISTS buyer_clients_style,
  DROP COLUMN IF EXISTS lenders_style,
  DROP COLUMN IF EXISTS title_companies_style,
  DROP COLUMN IF EXISTS insurance_agents_style,
  DROP COLUMN IF EXISTS coworkers_style,
  DROP COLUMN IF EXISTS general_tone_frequency;

-- Add new columns for scenario-based responses
ALTER TABLE agent_communication_preferences
  ADD COLUMN general_client_scenario text,
  ADD COLUMN buyer_good_news_scenario text,
  ADD COLUMN buyer_bad_news_scenario text,
  ADD COLUMN listing_new_listing_scenario text,
  ADD COLUMN listing_price_reduction_scenario text,
  ADD COLUMN preferred_lender_scenario text,
  ADD COLUMN title_company_scenario text,
  ADD COLUMN coworker_team_scenario text;