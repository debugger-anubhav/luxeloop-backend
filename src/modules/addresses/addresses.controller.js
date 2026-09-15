const asyncHandler = require("../../utils/asyncHandler");
const service = require("./addresses.service");

const searchPlaces = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q)
    return res.status(400).json({ success: false, message: "q is required" });

  const key = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key)
    return res
      .status(500)
      .json({ success: false, message: "Geocoding not configured" });

  const response = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
      },
      body: JSON.stringify({
        input: q,
        includedRegionCodes: ["in"],
        languageCode: "en",
      }),
    },
  );
  const json = await response.json();

  if (!response.ok)
    return res
      .status(502)
      .json({
        success: false,
        message: json.error?.message ?? "Places search failed",
      });

  const results = (json.suggestions ?? [])
    .filter((s) => s.placePrediction)
    .map((s) => {
      const p = s.placePrediction;
      return {
        place_id: p.placeId,
        description: p.text?.text ?? "",
        main_text: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        secondary_text: p.structuredFormat?.secondaryText?.text ?? "",
      };
    });

  res.success({ results }, "Places fetched");
});

const placeDetails = asyncHandler(async (req, res) => {
  const { place_id } = req.query;
  if (!place_id)
    return res
      .status(400)
      .json({ success: false, message: "place_id is required" });

  const key = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key)
    return res
      .status(500)
      .json({ success: false, message: "Geocoding not configured" });

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${place_id}`,
    {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "location,addressComponents,formattedAddress",
      },
    },
  );
  const json = await response.json();

  if (!response.ok)
    return res
      .status(502)
      .json({
        success: false,
        message: json.error?.message ?? "Place details failed",
      });

  const components = json.addressComponents ?? [];
  const findComponent = (type) =>
    components.find((c) => c.types?.includes(type));

  const city =
    findComponent("locality")?.longText ??
    findComponent("administrative_area_level_2")?.longText ??
    null;
  const shortAddress =
    components.find(
      (c) => c.shortText && typeof c.shortText === "string" && Number.isNaN(Number(c.shortText)),
    )?.shortText ?? city;

  res.success(
    {
      lat: json.location?.latitude ?? null,
      lng: json.location?.longitude ?? null,
      address: json.formattedAddress ?? null,
      shortAddress,
      pincode: findComponent("postal_code")?.longText ?? null,
      city,
      state: findComponent("administrative_area_level_1")?.longText ?? null,
      country: findComponent("country")?.longText ?? null,
    },
    "Place details fetched",
  );
});

const reverseGeocode = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng)
    return res
      .status(400)
      .json({ success: false, message: "lat and lng are required" });

  const key = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key)
    return res
      .status(500)
      .json({ success: false, message: "Geocoding not configured" });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`,
  );
  const json = await response.json();

  if (json.status !== "OK")
    return res
      .status(502)
      .json({ success: false, message: "Geocoding failed" });

  const components = json.results[0].address_components;

  console.log("components", components);

  const findComponent = (type) =>
    components.find((c) => c.types.includes(type));

  const pincode = findComponent("postal_code")?.long_name ?? null;
  const city =
    findComponent("locality")?.long_name ??
    findComponent("administrative_area_level_2")?.long_name ??
    null;
  const state = findComponent("administrative_area_level_1")?.long_name ?? null;
  const country = findComponent("country")?.long_name ?? null;
  const shortAddress =
    components.find(
      (c) => c.short_name && typeof c.short_name === "string" && Number.isNaN(Number(c.short_name)),
    )?.short_name ?? city;

  res.success(
    {
      address: json.results[0].formatted_address,
      shortAddress,
      pincode,
      city,
      state,
      country,
    },
    "Geocoded",
  );
});

const getMyAddresses = asyncHandler(async (req, res) => {
  res.success(await service.getMyAddresses(req.user.id), "Addresses fetched");
});
const createAddress = asyncHandler(async (req, res) => {
  res.success(
    await service.createAddress(req.user.id, req.body),
    "Address created",
    201,
  );
});
const updateAddress = asyncHandler(async (req, res) => {
  res.success(
    await service.updateAddress(req.user.id, req.params.addressId, req.body),
    "Address updated",
  );
});
const deleteAddress = asyncHandler(async (req, res) => {
  await service.deleteAddress(req.user.id, req.params.addressId);
  res.success(null, "Address deleted");
});
const setDefaultAddress = asyncHandler(async (req, res) => {
  res.success(
    await service.setDefaultAddress(req.user.id, req.params.addressId),
    "Default address set",
  );
});

module.exports = {
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  reverseGeocode,
  searchPlaces,
  placeDetails,
};
