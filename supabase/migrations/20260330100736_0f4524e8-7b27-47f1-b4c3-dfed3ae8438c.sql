-- Performance indexes for common query patterns

-- Listings: filter by status (marketplace page)
CREATE INDEX IF NOT EXISTS idx_listings_status_created ON listings(status, created_at DESC);

-- Listings: filter by owner (seller dashboard)
CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON listings(owner_id) WHERE deleted_at IS NULL;

-- Listings: featured listings (homepage)
CREATE INDEX IF NOT EXISTS idx_listings_featured ON listings(status, featured) WHERE featured = true;

-- Listing views: aggregate by listing
CREATE INDEX IF NOT EXISTS idx_listing_views_listing_id ON listing_views(listing_id);

-- Listing likes: aggregate by listing + user lookup
CREATE INDEX IF NOT EXISTS idx_listing_likes_listing_id ON listing_likes(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_likes_user_listing ON listing_likes(user_id, listing_id);

-- Deals: lookup by listing, buyer, seller
CREATE INDEX IF NOT EXISTS idx_deals_listing_id ON deals(listing_id);
CREATE INDEX IF NOT EXISTS idx_deals_buyer_id ON deals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deals_seller_id ON deals(seller_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);

-- Offers: lookup by listing
CREATE INDEX IF NOT EXISTS idx_listing_offers_listing_id_status ON listing_offers(listing_id, status);

-- Profiles: lookup by user_id (frequent join)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Notifications: user + read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read) WHERE is_read = false;

-- Messages: conversation lookup
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at DESC);

-- Negotiation messages: deal lookup
CREATE INDEX IF NOT EXISTS idx_negotiation_messages_deal_id ON negotiation_messages(deal_id, created_at DESC);

-- Audit logs: cleanup query
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Session logs: cleanup query
CREATE INDEX IF NOT EXISTS idx_session_logs_created_at ON session_logs(created_at);