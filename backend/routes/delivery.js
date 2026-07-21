import express from "express";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

const SHOP_ADDRESS = "Forest Court, Membley, Ruiru, Kiambu, Kenya";

const BASE_FARE = 80;
const PER_KM_RATE = 15;
const MIN_FARE = 120;

let shopOriginPromise = null;

async function geocodeAddress(address) {
  const query = address.toLowerCase().includes("kenya")
    ? address
    : `${address}, Kenya`;

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": `NairobiCrumbery/1.0 (${process.env.GEOCODING_CONTACT_EMAIL || "nairobicrumbery@gmail.com"})`,
    },
  });

  if (!response.ok) {
    throw new Error("Location search failed.");
  }

  const results = await response.json();

  if (!results.length) {
    return null;
  }

  return {
    lat: Number(results[0].lat),
    lng: Number(results[0].lon),
  };
}

async function getShopOrigin() {
  if (!shopOriginPromise) {
    shopOriginPromise = geocodeAddress(SHOP_ADDRESS);
  }

  const shopOrigin = await shopOriginPromise;

  if (!shopOrigin) {
    throw new Error("Could not locate Forest Court, Membley.");
  }

  return shopOrigin;
}

async function getRoadDistanceKm(origin, destination) {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;

  const response = await fetch(
    `${OSRM_URL}/${coordinates}?overview=false&alternatives=false&steps=false`
  );

  if (!response.ok) {
    throw new Error("Road-route calculation failed.");
  }

  const data = await response.json();
  const route = data.routes?.[0];

  if (!route?.distance) {
    return null;
  }

  return route.distance / 1000;
}

export function calculateDeliveryFee(distanceKm) {
  const rawFee = BASE_FARE + distanceKm * PER_KM_RATE;
  const roundedFee = Math.round(rawFee / 10) * 10;

  return {
    distanceKm: Number(distanceKm.toFixed(1)),
    fee: Math.max(roundedFee, MIN_FARE),
  };
}

export async function estimateDelivery(address) {
  try {
    const [shopOrigin, destination] = await Promise.all([
      getShopOrigin(),
      geocodeAddress(address),
    ]);

    if (!destination) {
      return null;
    }

    const roadDistanceKm = await getRoadDistanceKm(shopOrigin, destination);

    if (!roadDistanceKm) {
      return null;
    }

    const { distanceKm, fee } = calculateDeliveryFee(roadDistanceKm);

    return {
      lat: destination.lat,
      lng: destination.lng,
      distanceKm,
      fee,
    };
  } catch (error) {
    console.error("Delivery estimation failed:", error.message);
    return null;
  }
}

const router = express.Router();

router.post("/estimate", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address?.trim()) {
      return res.status(400).json({
        error: "Please enter a delivery address.",
      });
    }

    const estimate = await estimateDelivery(address.trim());

    if (!estimate) {
      return res.status(200).json({
        estimated: false,
        message:
          "We could not estimate this address. We will confirm the delivery fee when reviewing your order.",
      });
    }

    return res.status(200).json({
      estimated: true,
      distanceKm: estimate.distanceKm,
      fee: estimate.fee,
    });
  } catch (error) {
    console.error("Delivery estimate error:", error);

    return res.status(500).json({
      error: "Could not estimate delivery fee.",
    });
  }
});

export default router;