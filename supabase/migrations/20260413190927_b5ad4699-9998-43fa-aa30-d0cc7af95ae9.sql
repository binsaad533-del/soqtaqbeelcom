
ALTER TABLE listings DISABLE TRIGGER rate_limit_listings;
ALTER TABLE listings DISABLE TRIGGER trg_validate_listing_publish;
ALTER TABLE listings DISABLE TRIGGER trg_block_publish_high_fraud;
