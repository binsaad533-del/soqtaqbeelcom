
-- Fix photos to match business_activity for all simulation listings
-- Base URL for sim images
-- مغسلة سيارات → carwash images
UPDATE listings SET photos = jsonb_build_object(
  'interior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/carwash.jpg'),
  'exterior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/carwash.jpg'),
  'signage', '[]'::jsonb
) WHERE business_activity = 'مغسلة سيارات' AND deleted_at IS NULL;

-- صيدلية → pharmacy images
UPDATE listings SET photos = jsonb_build_object(
  'interior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/pharmacy.jpg'),
  'exterior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/pharmacy.jpg'),
  'signage', '[]'::jsonb
) WHERE business_activity = 'صيدلية' AND deleted_at IS NULL;

-- صالون حلاقة → salon images
UPDATE listings SET photos = jsonb_build_object(
  'interior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/salon.jpg'),
  'exterior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/salon.jpg'),
  'signage', '[]'::jsonb
) WHERE business_activity = 'صالون حلاقة' AND deleted_at IS NULL;

-- مستودع → warehouse images
UPDATE listings SET photos = jsonb_build_object(
  'interior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/warehouse.jpg'),
  'exterior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/warehouse.jpg'),
  'signage', '[]'::jsonb
) WHERE business_activity = 'مستودع' AND deleted_at IS NULL;

-- محل تجاري → shop images
UPDATE listings SET photos = jsonb_build_object(
  'interior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/shop.jpg'),
  'exterior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/shop.jpg'),
  'signage', '[]'::jsonb
) WHERE business_activity = 'محل تجاري' AND deleted_at IS NULL;

-- كافيه → cafe images
UPDATE listings SET photos = jsonb_build_object(
  'interior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/cafe.jpg'),
  'exterior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/cafe.jpg'),
  'signage', '[]'::jsonb
) WHERE business_activity = 'كافيه' AND deleted_at IS NULL;

-- ورشة → workshop images
UPDATE listings SET photos = jsonb_build_object(
  'interior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/workshop.jpg'),
  'exterior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/workshop.jpg'),
  'signage', '[]'::jsonb
) WHERE business_activity = 'ورشة' AND deleted_at IS NULL;

-- مخبز → bakery images
UPDATE listings SET photos = jsonb_build_object(
  'interior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/bakery.jpg'),
  'exterior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/bakery.jpg'),
  'signage', '[]'::jsonb
) WHERE business_activity = 'مخبز' AND deleted_at IS NULL;

-- سوبرماركت → supermarket images
UPDATE listings SET photos = jsonb_build_object(
  'interior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/supermarket.jpg'),
  'exterior', jsonb_build_array('https://sxvfjtmntdmrlzdetnyg.supabase.co/storage/v1/object/public/listings/sim/supermarket.jpg'),
  'signage', '[]'::jsonb
) WHERE business_activity = 'سوبرماركت' AND deleted_at IS NULL;
