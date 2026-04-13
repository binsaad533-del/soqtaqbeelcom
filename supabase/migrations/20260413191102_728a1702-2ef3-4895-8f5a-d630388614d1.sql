
ALTER TABLE listings ENABLE TRIGGER rate_limit_listings;
ALTER TABLE listings ENABLE TRIGGER trg_validate_listing_publish;
ALTER TABLE listings ENABLE TRIGGER trg_block_publish_high_fraud;
