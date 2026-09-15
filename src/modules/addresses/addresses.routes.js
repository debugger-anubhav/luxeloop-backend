const { Router } = require("express");
const controller = require("./addresses.controller");
const { authenticate } = require("../../middleware/auth");
const validate = require("../../middleware/validate");
const { createAddressSchema } = require("./addresses.schema");

const router = Router();

router.get("/reverse-geocode", authenticate, controller.reverseGeocode);
router.get("/search-places", authenticate, controller.searchPlaces);
router.get("/place-details", authenticate, controller.placeDetails);
router.get("/", authenticate, controller.getMyAddresses);
router.post(
  "/",
  authenticate,
  validate(createAddressSchema),
  controller.createAddress,
);
router.patch("/:addressId", authenticate, controller.updateAddress);
router.delete("/:addressId", authenticate, controller.deleteAddress);
router.patch("/:addressId/default", authenticate, controller.setDefaultAddress);

module.exports = router;
