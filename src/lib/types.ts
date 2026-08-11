export type Customer = {
  id: string;
  name: string;
  contact: string | null;
  notes: string | null;
  created_at: string;
};

export type ReferencePhoto = {
  id: string;
  customer_id: string;
  file_path: string;
  created_at: string;
};

export type OutfitItem = {
  id: string;
  customer_id: string;
  source_url: string | null;
  source_site: string | null;
  outfit_image_path: string | null;
  fetch_status: "pending" | "auto" | "manual" | "failed";
  notes: string | null;
  category: string | null;
  created_at: string;
};

export type GeneratedLook = {
  id: string;
  customer_id: string;
  outfit_item_id: string;
  image_path: string | null;
  // Set once a real face photo has been manually stitched onto the headless
  // generated image (see /api/looks/[id]/face). Prefer this over image_path
  // wherever a look is displayed to the customer (lookbook, PPT export).
  final_image_path: string | null;
  status: "pending" | "done" | "failed";
  error: string | null;
  selected_for_lookbook: 0 | 1;
  created_at: string;
};

// OutfitItem enriched with the owning customer's name, for the cross-client
// wardrobe repository (see /api/outfits and /wardrobe).
export type OutfitItemWithCustomer = OutfitItem & { customer_name: string };

export type GeneratedLookItem = {
  generated_look_id: string;
  outfit_item_id: string;
};

// GeneratedLook enriched with the full set of outfit items that were combined
// to produce it (via the generated_look_items join table).
export type GeneratedLookWithItems = GeneratedLook & { outfitItemIds: string[] };
